import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { bucket } from '../services/firebase';
import { v4 as uuidv4 } from 'uuid';
import { haversineDistance } from '../utils/haversine';

export const getNearbyJobs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partnerId = req.user?.partnerId;
    if (!partnerId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner || !partner.lastLat || !partner.lastLng) {
      res.json([]); return;
    }

    const jobs = await prisma.job.findMany({
      where: { status: 'POSTED' },
      include: { client: { select: { name: true, avatarUrl: true } } }
    });

    const nearbyJobs = jobs.map(job => {
      const distance = haversineDistance(partner.lastLat!, partner.lastLng!, job.lat, job.lng);
      return { ...job, distance: parseFloat(distance.toFixed(1)) };
    }).filter(job => job.distance <= 10)
      .sort((a, b) => a.distance - b.distance);

    res.json(nearbyJobs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};

export const acceptJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: jobId } = req.params;
    const partnerId = req.user?.partnerId;
    if (!partnerId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const updatedJob = await prisma.$transaction(async (tx) => {
      const job = await tx.job.findFirst({ where: { id: jobId, status: 'POSTED' } });
      if (!job) return null;
      return tx.job.update({
        where: { id: jobId },
        data: { status: 'ACCEPTED', partnerId },
        include: { client: true },
      });
    });

    if (!updatedJob) {
      res.status(409).json({ error: 'Job already accepted by another partner' });
      return;
    }

    const partner = await prisma.partner.findUnique({ 
      where: { id: partnerId },
      include: { user: true }
    });

    const { getIO } = await import('../socket');
    const io = getIO();
    if (io && partner) {
      io.to(`user:${updatedJob.clientId}`).emit('job:accepted', {
        jobId,
        partner: {
          id: partner.id,
          name: partner.user.name,
          avatar: partner.user.avatarUrl,
          phone: partner.user.phone,
          rating: partner.rating,
        },
      });
    }

    // Try to import sendPushNotification, ignore if it doesn't exist
    try {
      const { sendPushNotification } = await import('../services/pushService');
      await sendPushNotification(updatedJob.clientId, 'JOB_ACCEPTED', { partnerName: partner.user.name });
    } catch (e) {}

    res.json(updatedJob);
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept job' });
  }
};

export const rejectJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason, comment } = req.body;
    res.json({ message: 'Job rejected', jobId: id, reason });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject job' });
  }
};

export const completeJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const files = req.files as Express.Multer.File[];
    
    const photoUrls: string[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const fileName = `completion/${id}/${uuidv4()}-${file.originalname}`;
        const fileUpload = bucket.file(fileName);
        await fileUpload.save(file.buffer, { metadata: { contentType: file.mimetype } });
        await fileUpload.makePublic();
        photoUrls.push(`https://storage.googleapis.com/${bucket.name}/${fileName}`);
      }
    }

    const job = await prisma.job.update({
      where: { id },
      data: { 
        status: 'COMPLETED',
        completionNotes: notes,
        completionPhotos: photoUrls
      },
      include: { partner: { include: { user: true } } }
    });

    const { getIO } = await import('../socket');
    const io = getIO();
    if (io && job.partner) {
      io.to(`user:${job.clientId}`).emit('job:completed', {
        jobId: job.id,
        partnerName: job.partner.user.name,
        totalAmount: job.rate,
        message: 'Work completed! Process payment to release funds.'
      });
    }

    try {
      const { sendPushNotification } = await import('../services/pushService');
      await sendPushNotification(job.clientId, 'JOB_COMPLETED', { jobId: job.id });
    } catch (e) {}

    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete job' });
  }
};

export const createJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const clientId = req.user?.id;
    if (!clientId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { category, description, address, scheduledDate, workers, rateType, rate, lat, lng } = req.body;

    const newJob = await prisma.job.create({
      data: {
        clientId,
        category,
        description,
        address: address || 'Mock Address',
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        rateType: rateType || 'DAILY',
        rate: rate || (rateType === 'DAILY' ? 1200 : 200),
        scheduledDate: new Date(scheduledDate),
        workerCount: parseInt(workers) || 1,
        status: 'POSTED'
      },
      include: { client: { select: { name: true, avatarUrl: true, phone: true } } },
    });

    const { findPartnersNearJobWithDistance } = await import('../services/geoService');
    const nearbyPartnerIds = await findPartnersNearJobWithDistance(newJob.lat, newJob.lng, 10);

    if (nearbyPartnerIds.length > 0) {
      const partnerIds = nearbyPartnerIds.map(p => p.partnerId);
      const matchedPartners = await prisma.partner.findMany({
        where: {
          id: { in: partnerIds },
          skills: { has: category },
          isOnline: true,
        },
        include: { user: true },
      });

      const distanceMap = new Map(nearbyPartnerIds.map(p => [p.partnerId, p.distanceKm]));

      const { getIO } = await import('../socket');
      const io = getIO();
      if (io) {
        for (const partner of matchedPartners) {
          io.to(`user:${partner.userId}`).emit('job:new', {
            job: newJob,
            distance: distanceMap.get(partner.id) ?? 0,
            client: { name: newJob.client.name, avatar: newJob.client.avatarUrl },
          });
        }
      }
    }

    res.status(201).json(newJob);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create job' });
  }
};

export const getClientJobs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const clientId = req.user?.id;
    const { status } = req.query;

    const where: any = { clientId };
    if (status) where.status = status;

    const jobs = await prisma.job.findMany({ 
      where, 
      orderBy: { createdAt: 'desc' },
      include: {
        partner: {
          include: { user: { select: { name: true, avatarUrl: true, phone: true } } }
        },
        payment: true,
        feedback: true
      }
    });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};

export const cancelJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const job = await prisma.job.findUnique({ where: { id } });

    if (!job || job.clientId !== req.user?.id) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    if (job.status !== 'POSTED') {
      res.status(400).json({ error: 'Already accepted' });
      return;
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    res.json(updatedJob);
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel job' });
  }
};

export const extendJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { extraHours } = req.body;

    const job = await prisma.job.update({
      where: { id },
      data: { status: 'EXTENDED' }
    });

    const io = req.app.get('io');
    if (io && job.partnerId) {
      io.to(`partner:${job.partnerId}`).emit('extension:request', { jobId: job.id, extraHours });
    }

    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to extend job' });
  }
};

export const getJobById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        client: { select: { name: true, avatarUrl: true, phone: true } },
        partner: { include: { user: { select: { name: true, avatarUrl: true, phone: true } } } },
        payment: true,
        feedback: true
      }
    });
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch job' });
  }
};
