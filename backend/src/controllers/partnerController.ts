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
    const partnerId = req.user?.partnerId;
    const { aadhaar, dob } = req.body;

    if (!partnerId || !/^[2-9]\d{11}$/.test(aadhaar)) {
      res.status(400).json({ error: 'Invalid 12-digit Aadhaar number' });
      return;
    }

    // Call sandbox service to send OTP
    const { clientId, isMock, mockOtp } = await extSendOtp(aadhaar);
    const sessionId = uuidv4();

    // Cache the session data
    otpStore.set(`aadhaar:${sessionId}`, JSON.stringify({ 
      clientId, 
      aadhaar, 
      dob,
      isMock,
      mockOtp
    }));

    res.json({
      sessionId,
      message: 'OTP sent successfully',
      // If it is mock mode, return mockOtp for development ease
      ...(isMock && { otp: mockOtp })
    });
  } catch (error: any) {
    console.error('[Aadhaar Partner KYC] Initiation error:', error.message || error);
    res.status(500).json({ error: error.message || 'Failed to initiate KYC' });
  }
};

export const verifyAadhaar = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partnerId = req.user?.partnerId;
    const userId = req.user?.id;
    const { sessionId, otp } = req.body;

    if (!partnerId || !userId) {
      res.status(400).json({ error: 'Partner or User not found' });
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

    if (isMock) {
      // Verify mock OTP
      if (mockOtp !== otp) {
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
        res.status(400).json({ error: err.message || 'Invalid OTP or verification failed' });
        return;
      }
    }

    // Success: Update database
    await (prisma.user as any).update({
      where: { id: userId },
      data: { 
        aadhaarStatus: 'VERIFIED',
        aadhaarNumber: aadhaar || null,
        dob: dobToStore,
        // Update user's name to match Aadhaar name if available
        ...(nameToStore && { name: nameToStore })
      }
    });

    otpStore.delete(`aadhaar:${sessionId}`);

    // Trigger Real-Time Notification (Socket.IO)
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', {
        type: 'AADHAAR_VERIFIED',
        title: 'Aadhaar Verified ✅',
        body: 'Your profile is now verified!'
      });
    }

    // Trigger Real-Time Push Notification (Expo/FCM)
    try {
      await sendPushNotification(userId, 'AADHAAR_VERIFIED', {});
    } catch (e: any) {
      console.error('[Aadhaar Partner KYC] Push notification failed:', e.message || e);
    }

    res.json({ success: true, aadhaarStatus: 'VERIFIED' });
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

