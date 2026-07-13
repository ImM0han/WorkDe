import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { bucket } from '../services/firebase';
import { v4 as uuidv4 } from 'uuid';
import { haversineDistance } from '../utils/haversine';

const RADIUS_LIMIT = process.env.MAX_DISTANCE_KM 
  ? parseInt(process.env.MAX_DISTANCE_KM, 10) 
  : (process.env.NODE_ENV === 'production' ? 30 : 20000);


export const getNearbyJobs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partnerId = req.user?.partnerId;
    if (!partnerId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { lat, lng } = req.query as Record<string, string>;
    let latitude = lat ? parseFloat(lat) : null;
    let longitude = lng ? parseFloat(lng) : null;

    const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) { res.status(404).json({ error: 'Partner not found' }); return; }

    if (latitude !== null && longitude !== null && !isNaN(latitude) && !isNaN(longitude)) {
      await prisma.partner.update({
        where: { id: partnerId },
        data: { lastLat: latitude, lastLng: longitude }
      });
    } else {
      latitude = partner.lastLat;
      longitude = partner.lastLng;
    }

    if (latitude === null || longitude === null) {
      res.json([]); return;
    }

    const jobs = await prisma.job.findMany({
      where: { 
        status: 'POSTED',
        ...(partner.gender !== 'FEMALE' ? { femaleOnly: false } : {})
      },
      include: { client: { select: { name: true, avatarUrl: true } } }
    });

    const nearbyJobs = jobs.map(job => {
      const distance = haversineDistance(latitude!, longitude!, job.lat, job.lng);
      return { ...job, distance: parseFloat(distance.toFixed(1)) };
    }).filter(job => job.distance <= RADIUS_LIMIT && !job.partnerIds.includes(partnerId!))
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
      if (job.partnerIds.includes(partnerId)) return 'ALREADY_JOINED';
      
      const newAcceptedCount = job.acceptedCount + 1;
      const isFilled = newAcceptedCount >= job.workerCount;

      const dataToUpdate: any = {
        acceptedCount: newAcceptedCount,
        partnerIds: { push: partnerId }
      };

      if (isFilled) {
        dataToUpdate.status = 'ACCEPTED';
        dataToUpdate.partnerId = partnerId;
      } else {
        dataToUpdate.status = 'POSTED';
      }

      return tx.job.update({
        where: { id: jobId },
        data: dataToUpdate,
        include: { client: true },
      });
    });

    if (!updatedJob) {
      res.status(409).json({ error: 'Job is no longer available' });
      return;
    }
    if (updatedJob === 'ALREADY_JOINED') {
      res.status(409).json({ error: 'You have already joined this job' });
      return;
    }

    const partner = await prisma.partner.findUnique({ 
      where: { id: partnerId },
      include: { user: true }
    });

    const { getIO } = await import('../socket');
    const io = getIO();
    const isFilled = (updatedJob as any).status === 'ACCEPTED';

    if (io && partner) {
      io.to(`user:${(updatedJob as any).clientId}`).emit('job:worker:joined', {
        jobId,
        acceptedCount: (updatedJob as any).acceptedCount,
        totalNeeded: (updatedJob as any).workerCount,
        isFilled,
        partner: {
          id: partner.id,
          name: partner.user.name,
          avatar: partner.user.avatarUrl,
          phone: partner.user.phone,
          rating: partner.rating,
        },
      });

      if (isFilled) {
        io.to(`user:${(updatedJob as any).clientId}`).emit('job:accepted', {
          jobId,
          workerCount: (updatedJob as any).workerCount,
          message: 'All workers confirmed!',
          partner: {
            id: partner.id,
            name: partner.user.name,
            avatar: partner.user.avatarUrl,
            phone: partner.user.phone,
            rating: partner.rating,
          },
        });
      }
    }

    // Try to import sendPushNotification, ignore if it doesn't exist
    try {
      const { sendPushNotification } = await import('../services/pushService');
      if (partner) {
        if (isFilled) {
          await sendPushNotification((updatedJob as any).clientId, 'JOB_FILLED', { category: (updatedJob as any).category });
        } else {
          await sendPushNotification((updatedJob as any).clientId, 'WORKER_JOINED', { count: (updatedJob as any).acceptedCount, total: (updatedJob as any).workerCount });
        }
      }
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
        try {
          const fileName = `completion/${id}/${uuidv4()}-${file.originalname}`;
          const fileUpload = bucket.file(fileName);
          await fileUpload.save(file.buffer, { metadata: { contentType: file.mimetype } });
          await fileUpload.makePublic();
          photoUrls.push(`https://storage.googleapis.com/${bucket.name}/${fileName}`);
        } catch (fbError) {
          console.error("Firebase upload failed, using mock URL:", fbError);
          photoUrls.push(`https://via.placeholder.com/150?text=UploadedPhoto`);
        }
      }
    }

    const job = await prisma.job.update({
      where: { id },
      data: { 
        status: 'COMPLETED',
        completionNotes: notes,
        completionPhotos: photoUrls
      },
      include: { 
        partner: { include: { user: true } },
        payment: true
      }
    });

    // Credit partner's wallet if they haven't been paid yet (e.g. mock/offline payment route)
    if (job.partnerId && job.payment?.status !== 'COMPLETED') {
      const grossAmount = job.rate || 0;
      const platformFee = grossAmount * 0.05;
      const netAmount = grossAmount - platformFee;

      await prisma.partner.update({
        where: { id: job.partnerId },
        data: { walletBalance: { increment: netAmount } }
      });

      await prisma.payment.upsert({
        where: { jobId: job.id },
        update: { status: 'COMPLETED' },
        create: {
          jobId: job.id,
          amount: grossAmount,
          platformFee,
          netAmount,
          status: 'COMPLETED'
        }
      });
    }

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

    const { category, description, address, scheduledDate, workers, rateType, rate, lat, lng, femaleOnly, seasonLabel, materialsIncluded, materialCost } = req.body;

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
        femaleOnly: femaleOnly === true,
        seasonLabel,
        materialsIncluded: materialsIncluded === true,
        materialCost: parseFloat(materialCost) || null,
        status: 'POSTED'
      },
      include: { client: { select: { name: true, avatarUrl: true, phone: true } } },
    });

    const { findPartnersNearJobWithDistance } = await import('../services/geoService');
    const nearbyPartnerIds = await findPartnersNearJobWithDistance(newJob.lat, newJob.lng, RADIUS_LIMIT);

    if (nearbyPartnerIds.length > 0) {
      const partnerIds = nearbyPartnerIds.map(p => p.partnerId);
      const whereClause: any = {
        id: { in: partnerIds },
        skills: { has: category },
        isOnline: true,
      };
      if (femaleOnly) whereClause.gender = 'FEMALE';

      const matchedPartners = await prisma.partner.findMany({
        where: whereClause,
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
    const { extraHours, additionalCost } = req.body;
    const role = req.user?.role || 'CLIENT';

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const costToAdd = additionalCost !== undefined 
      ? parseFloat(additionalCost) 
      : (extraHours ? parseInt(extraHours, 10) * job.rate : job.rate);

    const updatedJob = await prisma.job.update({
      where: { id },
      data: { 
        extensionRequest: {
          requestedBy: role,
          amount: extraHours ? extraHours.toString() : '1',
          additionalCost: costToAdd,
          status: 'PENDING'
        }
      }
    });

    const { getIO } = await import('../socket');
    const io = getIO();
    if (io) {
      if (role === 'CLIENT' && updatedJob.partnerId) {
        io.to(`partner:${updatedJob.partnerId}`).emit('extension:request', { jobId: updatedJob.id, extraHours });
      } else if (role === 'PARTNER') {
        io.to(`user:${updatedJob.clientId}`).emit('extension:request', { jobId: updatedJob.id, extraHours });
      }
    }

    res.json(updatedJob);
  } catch (error) {
    console.error('extendJob error:', error);
    res.status(500).json({ error: 'Failed to extend job' });
  }
};

export const acceptExtension = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }

    const extReq = job.extensionRequest as any;
    if (!extReq || extReq.status !== 'PENDING') {
      res.status(400).json({ error: 'No pending extension request found' });
      return;
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: {
        status: 'EXTENDED',
        rate: job.rate + (extReq.additionalCost || 0),
        extensionRequest: {
          ...extReq,
          status: 'ACCEPTED'
        }
      }
    });

    const { getIO } = await import('../socket');
    const io = getIO();
    if (io) {
      io.to(`user:${updatedJob.clientId}`).emit('extension:accepted', { jobId: updatedJob.id });
      if (updatedJob.partnerId) {
        io.to(`partner:${updatedJob.partnerId}`).emit('extension:accepted', { jobId: updatedJob.id });
      }
    }

    res.json(updatedJob);
  } catch (error) {
    console.error('acceptExtension error:', error);
    res.status(500).json({ error: 'Failed to accept extension' });
  }
};

export const declineExtension = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }

    const extReq = job.extensionRequest as any;
    if (!extReq) {
      res.status(400).json({ error: 'No extension request found' });
      return;
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: {
        extensionRequest: {
          ...extReq,
          status: 'REJECTED'
        }
      }
    });

    const { getIO } = await import('../socket');
    const io = getIO();
    if (io) {
      io.to(`user:${updatedJob.clientId}`).emit('extension:declined', { jobId: updatedJob.id });
      if (updatedJob.partnerId) {
        io.to(`partner:${updatedJob.partnerId}`).emit('extension:declined', { jobId: updatedJob.id });
      }
    }

    res.json(updatedJob);
  } catch (error) {
    console.error('declineExtension error:', error);
    res.status(500).json({ error: 'Failed to decline extension' });
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

export const getPartnerJobs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partnerId = req.user?.partnerId;
    if (!partnerId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const jobs = await prisma.job.findMany({
      where: {
        OR: [
          { partnerId },
          { partnerIds: { has: partnerId } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { name: true, avatarUrl: true, phone: true } },
        payment: true,
        feedback: true
      }
    });

    res.json(jobs);
  } catch (error) {
    console.error('getPartnerJobs error:', error);
    res.status(500).json({ error: 'Failed to fetch partner jobs' });
  }
};

export const updateJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const clientId = req.user?.id;
    const { description, workers, rate, scheduledDate } = req.body;

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job || job.clientId !== clientId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    if (!['POSTED', 'ACCEPTED'].includes(job.status)) {
      res.status(400).json({ error: 'Job cannot be edited once active/in progress' });
      return;
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: {
        description: description !== undefined ? description : job.description,
        workerCount: workers !== undefined ? parseInt(workers, 10) : job.workerCount,
        rate: rate !== undefined ? parseFloat(rate) : job.rate,
        scheduledDate: scheduledDate !== undefined ? new Date(scheduledDate) : job.scheduledDate,
      }
    });

    res.json(updatedJob);
  } catch (error) {
    console.error('updateJob error:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
};

export const startJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const partnerId = req.user?.partnerId;
    if (!partnerId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const job = await prisma.job.findUnique({
      where: { id }
    });

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    if (job.status !== 'ACCEPTED') {
      res.status(400).json({ error: 'Job cannot be started. Status must be ACCEPTED' });
      return;
    }

    if (job.partnerId !== partnerId && !job.partnerIds.includes(partnerId)) {
      res.status(403).json({ error: 'Not authorized to start this job' });
      return;
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: { status: 'START_REQUESTED' },
      include: { client: true, partner: { include: { user: true } } }
    });

    const { getIO } = await import('../socket');
    const io = getIO();
    if (io) {
      io.to(`user:${updatedJob.clientId}`).emit('job:start-requested', {
        jobId: updatedJob.id,
        partnerName: updatedJob.partner?.user?.name || 'Worker',
        message: `${updatedJob.partner?.user?.name || 'Worker'} is requesting to start the job`
      });
    }

    try {
      const { sendPushNotification } = await import('../services/pushService');
      await sendPushNotification(updatedJob.clientId, 'JOB_START_REQUESTED', { jobId: updatedJob.id });
    } catch (e) {}

    res.json(updatedJob);
  } catch (error) {
    console.error('startJob error:', error);
    res.status(500).json({ error: 'Failed to start job' });
  }
};

export const acceptStartJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const clientId = req.user?.id;
    if (!clientId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const job = await prisma.job.findUnique({
      where: { id }
    });

    if (!job || job.clientId !== clientId) {
      res.status(403).json({ error: 'Not authorized or job not found' });
      return;
    }

    if (job.status !== 'START_REQUESTED') {
      res.status(400).json({ error: 'Job start request not pending' });
      return;
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: { 
        status: 'IN_PROGRESS',
        startedAt: new Date()
      }
    });

    const partners = await prisma.partner.findMany({
      where: {
        OR: [
          { id: updatedJob.partnerId || undefined },
          { id: { in: updatedJob.partnerIds } }
        ]
      },
      select: { userId: true }
    });

    const { getIO } = await import('../socket');
    const io = getIO();
    if (io) {
      partners.forEach(p => {
        io.to(`user:${p.userId}`).emit('job:started', {
          jobId: updatedJob.id,
          message: 'Client has accepted the start request. Work is now in progress.'
        });
      });
    }

    try {
      const { sendPushNotification } = await import('../services/pushService');
      for (const p of partners) {
        await sendPushNotification(p.userId, 'JOB_STARTED', { jobId: updatedJob.id });
      }
    } catch (e) {}

    res.json(updatedJob);
  } catch (error) {
    console.error('acceptStartJob error:', error);
    res.status(500).json({ error: 'Failed to accept job start' });
  }
};

export const declineStartJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const clientId = req.user?.id;
    if (!clientId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const job = await prisma.job.findUnique({
      where: { id }
    });

    if (!job || job.clientId !== clientId) {
      res.status(403).json({ error: 'Not authorized or job not found' });
      return;
    }

    if (job.status !== 'START_REQUESTED') {
      res.status(400).json({ error: 'Job start request not pending' });
      return;
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: { status: 'ACCEPTED' }
    });

    const partners = await prisma.partner.findMany({
      where: {
        OR: [
          { id: updatedJob.partnerId || undefined },
          { id: { in: updatedJob.partnerIds } }
        ]
      },
      select: { userId: true }
    });

    const { getIO } = await import('../socket');
    const io = getIO();
    if (io) {
      partners.forEach(p => {
        io.to(`user:${p.userId}`).emit('job:start-declined', {
          jobId: updatedJob.id,
          message: 'Client has declined the start request.'
        });
      });
    }

    res.json(updatedJob);
  } catch (error) {
    console.error('declineStartJob error:', error);
    res.status(500).json({ error: 'Failed to decline job start' });
  }
};

export const finalizeWork = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const clientId = req.user?.id;
    if (!clientId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const job = await prisma.job.findUnique({
      where: { id }
    });

    if (!job || job.clientId !== clientId) {
      res.status(403).json({ error: 'Not authorized or job not found' });
      return;
    }

    if (!['IN_PROGRESS', 'EXTENDED'].includes(job.status)) {
      res.status(400).json({ error: 'Job status must be IN_PROGRESS or EXTENDED to finalize' });
      return;
    }

    const completedAt = new Date();
    const startedAt = job.startedAt || job.createdAt;
    const durationMs = completedAt.getTime() - startedAt.getTime();

    let finalRate = job.rate;
    if (job.rateType === 'HOURLY') {
      const durationHours = durationMs / (1000 * 60 * 60);
      finalRate = job.rate * Math.max(1, parseFloat(durationHours.toFixed(2)));
    } else if (job.rateType === 'DAILY') {
      const durationHours = durationMs / (1000 * 60 * 60);
      const durationDays = durationHours / 8;
      finalRate = job.rate * Math.max(1, parseFloat(durationDays.toFixed(2)));
    }

    // Round final rate to 2 decimal places
    finalRate = parseFloat(finalRate.toFixed(2));

    const updatedJob = await prisma.job.update({
      where: { id },
      data: {
        status: 'COMPLETED_PENDING_PAYMENT',
        completedAt,
        rate: finalRate
      }
    });

    const partners = await prisma.partner.findMany({
      where: {
        OR: [
          { id: updatedJob.partnerId || undefined },
          { id: { in: updatedJob.partnerIds } }
        ]
      },
      select: { userId: true }
    });

    const { getIO } = await import('../socket');
    const io = getIO();
    if (io) {
      partners.forEach(p => {
        io.to(`user:${p.userId}`).emit('job:finalized', {
          jobId: updatedJob.id,
          finalRate,
          message: 'Client has finalized work. Checkout is pending.'
        });
      });
    }

    res.json(updatedJob);
  } catch (error) {
    console.error('finalizeWork error:', error);
    res.status(500).json({ error: 'Failed to finalize work' });
  }
};


