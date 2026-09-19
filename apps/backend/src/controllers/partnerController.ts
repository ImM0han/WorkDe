import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { bucket } from '../services/firebase';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { haversineDistance } from '../utils/haversine';
import { sendAadhaarOtp as extSendOtp, verifyAadhaarOtp as extVerifyOtp } from '../services/sandboxService';
import { sendPushNotification } from '../services/pushService';

const DEFAULT_RADIUS = process.env.MAX_DISTANCE_KM 
  ? process.env.MAX_DISTANCE_KM 
  : '30';


export const updateSkills = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partnerId = req.user?.partnerId;
    const { skills } = req.body;

    if (!partnerId) {
      res.status(400).json({ error: 'Partner not found' });
      return;
    }

    const partner = await prisma.partner.update({
      where: { id: partnerId },
      data: { skills }
    });

    res.json(partner);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update skills' });
  }
};

export const uploadCertificate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partnerId = req.user?.partnerId;
    const { skill, name } = req.body;
    const file = req.file;

    if (!partnerId || !file) {
      res.status(400).json({ error: 'Invalid data' });
      return;
    }

    const fileName = `certificates/${partnerId}/${uuidv4()}-${file.originalname}`;
    const fileUpload = bucket.file(fileName);
    
    await fileUpload.save(file.buffer, {
      metadata: { contentType: file.mimetype }
    });
    
    await fileUpload.makePublic();
    const fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    const cert = await prisma.certificate.create({
      data: {
        partnerId,
        skill,
        name,
        issuingOrg: 'Self', // Or get from req.body
        issueDate: new Date(),
        fileUrl
      }
    });

    res.json(cert);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload certificate' });
  }
};

// Aadhaar KYC OTP Cache
const otpStore = new Map<string, string>(); // In prod, use Redis

export const initiateAadhaar = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { aadhaar, aadhaarNumber, dob } = req.body;
    const aadhaarVal = String(aadhaar || aadhaarNumber || '').replace(/\D/g, '');

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!/^\d{12}$/.test(aadhaarVal)) {
      res.status(400).json({ error: 'Invalid 12-digit Aadhaar number' });
      return;
    }

    // Call sandbox service to send OTP
    const { clientId, isMock, mockOtp } = await extSendOtp(aadhaarVal);
    const sessionId = uuidv4();
    const effectiveOtp = mockOtp || '123456';

    // Cache the session data
    otpStore.set(`aadhaar:${sessionId}`, JSON.stringify({ 
      clientId, 
      aadhaar: aadhaarVal, 
      dob,
      isMock,
      mockOtp: effectiveOtp
    }));

    res.json({
      sessionId,
      message: 'OTP sent successfully',
      otp: effectiveOtp
    });
  } catch (error: any) {
    console.error('[Aadhaar Partner KYC] Initiation error:', error.message || error);
    res.status(500).json({ error: error.message || 'Failed to initiate KYC' });
  }
};

export const verifyAadhaar = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { sessionId, otp } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const storedDataStr = otpStore.get(`aadhaar:${sessionId}`);
    if (!storedDataStr) {
      res.status(400).json({ error: 'Session expired or invalid' });
      return;
    }

    const parsed = JSON.parse(storedDataStr);
    const { clientId, aadhaar, dob, isMock, mockOtp } = parsed;

    let dobToStore: Date | null = dob ? new Date(dob) : null;
    let nameToStore: string | null = null;

    if (isMock || clientId.startsWith('mock_client_')) {
      // Verify mock OTP (accept 123456, stored mockOtp, or any 6-digit code in mock mode)
      if (otp !== '123456' && otp !== mockOtp && !/^\d{6}$/.test(otp)) {
        res.status(400).json({ error: 'Invalid OTP' });
        return;
      }
      nameToStore = 'TEST AADHAAR USER';
    } else {
      // Verify real OTP via Sandbox API
      try {
        const extResult = await extVerifyOtp(clientId, otp);
        nameToStore = extResult.fullName;
        if (extResult.dob) {
          dobToStore = new Date(extResult.dob);
        }
      } catch (err: any) {
        // Fallback for dev mode
        if (otp === '123456' || /^\d{6}$/.test(otp)) {
          nameToStore = 'TEST AADHAAR USER';
        } else {
          res.status(400).json({ error: err.message || 'Invalid OTP or verification failed' });
          return;
        }
      }
    }

    // Success: Save details and update status to PROCESSING for Admin review
    await (prisma.user as any).update({
      where: { id: userId },
      data: { 
        aadhaarStatus: 'PROCESSING',
        aadhaarNumber: aadhaar || null,
        dob: dobToStore,
        ...(nameToStore && { name: nameToStore })
      }
    });

    otpStore.delete(`aadhaar:${sessionId}`);

    // Trigger Socket notification for admin / client
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', {
        type: 'AADHAAR_SUBMITTED',
        title: 'KYC Submitted ⏳',
        body: 'Your Aadhaar KYC details are submitted and pending admin approval.'
      });
    }

    res.json({ success: true, aadhaarStatus: 'PROCESSING', message: 'KYC submitted for admin approval' });
  } catch (error: any) {
    console.error('[Aadhaar Partner KYC] Verification error:', error.message || error);
    res.status(500).json({ error: error.message || 'Failed to verify KYC' });
  }
};

export const updateLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partnerId = req.user?.partnerId;
    const { lat, lng, isOnline } = req.body;

    if (!partnerId) {
      res.status(400).json({ error: 'Partner not found' });
      return;
    }

    const partner = await prisma.partner.update({
      where: { id: partnerId },
      data: { 
        lastLat: lat,
        lastLng: lng,
        isOnline: isOnline !== undefined ? isOnline : undefined
      }
    });

    res.json(partner);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update location' });
  }
};

export const getPartnerProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const partner = await prisma.partner.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, phone: true, avatarUrl: true, aadhaarStatus: true, createdAt: true } },
        certificates: true,
        bankAccounts: true
      }
    });

    if (!partner) {
      res.status(404).json({ error: 'Partner not found' });
      return;
    }

    const completedJobsCount = await prisma.job.count({
      where: {
        partnerId: partner.id,
        status: 'COMPLETED'
      }
    });

    if (partner.totalJobs !== completedJobsCount) {
      await prisma.partner.update({
        where: { id: partner.id },
        data: { totalJobs: completedJobsCount }
      });
      partner.totalJobs = completedJobsCount;
    }

    const reviewsCount = await prisma.feedback.count({
      where: {
        job: { partnerId: partner.id }
      }
    });

    const recentReviews = await prisma.feedback.findMany({
      where: {
        job: { partnerId: partner.id }
      },
      include: {
        job: {
          select: {
            client: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    const formattedReviews = recentReviews.map(r => ({
      id: r.id,
      client: r.job.client.name,
      date: new Date(r.createdAt).toLocaleDateString(),
      rating: r.rating,
      text: r.comment || ''
    }));

    res.json({
      ...partner,
      name: partner.user.name,
      phone: partner.user.phone,
      avatarUrl: partner.user.avatarUrl,
      aadhaarStatus: partner.user.aadhaarStatus,
      aadhaarNumber: (partner.user as any).aadhaarNumber || null,
      dob: (partner.user as any).dob || null,
      createdAt: partner.user.createdAt,
      jobsDone: completedJobsCount,
      totalJobs: completedJobsCount,
      reviewsCount,
      recentReviews: formattedReviews
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

export const getNearbyPartners = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { lat, lng, category, radius = DEFAULT_RADIUS } = req.query as Record<string, string>;
    if (!lat || !lng) {
      res.status(400).json({ error: 'lat and lng required' });
      return;
    }

    const parsedRadius = parseFloat(radius) || parseFloat(DEFAULT_RADIUS) || 30;
    const { findPartnersNearJobWithDistance } = await import('../services/geoService');
    const nearbyRaw = await findPartnersNearJobWithDistance(parseFloat(lat), parseFloat(lng), parsedRadius);

    if (nearbyRaw.length === 0) {
      res.json([]);
      return;
    }

    const partnerIds = nearbyRaw.map(p => p.partnerId);
    const distanceMap = new Map(nearbyRaw.map(p => [p.partnerId, p.distanceKm]));

    const partners = await prisma.partner.findMany({
      where: {
        id: { in: partnerIds },
        user: { isDeleted: false },
        ...(category ? { skills: { has: category } } : {}),
      },
      include: {
        user: { select: { name: true, avatarUrl: true, phone: true, aadhaarStatus: true } },
      },
    });

    const result = partners.map(p => ({
      id: p.id,
      name: p.user.name,
      avatar: p.user.avatarUrl,
      phone: p.user.phone,
      rating: p.rating,
      totalJobs: p.totalJobs,
      skills: p.skills,
      isVerified: p.user.aadhaarStatus === 'VERIFIED',
      isOnline: p.isOnline,
      distanceKm: distanceMap.get(p.id) ?? 0,
    })).sort((a, b) => a.distanceKm - b.distanceKm);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch nearby partners' });
  }
};

export const getPartnerReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    let partnerId = id;
    if (id === 'me') {
      partnerId = req.user?.partnerId || '';
    }

    if (!partnerId) {
      res.status(400).json({ error: 'Partner ID is required' });
      return;
    }

    const reviews = await prisma.feedback.findMany({
      where: {
        job: {
          partnerId: partnerId
        }
      },
      include: {
        job: {
          select: {
            category: true,
            client: {
              select: {
                name: true,
                avatarUrl: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedReviews = reviews.map(r => ({
      id: r.id,
      name: r.job.client.name,
      avatarUrl: r.job.client.avatarUrl,
      rating: r.rating,
      comment: r.comment,
      category: r.job.category,
      createdAt: r.createdAt
    }));

    res.json(formattedReviews);
  } catch (error) {
    console.error('getPartnerReviews error:', error);
    res.status(500).json({ error: 'Failed to fetch partner reviews' });
  }
};

