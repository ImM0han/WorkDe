import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { bucket } from '../services/firebase';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { haversineDistance } from '../utils/haversine';

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

// Simple mock for Aadhaar KYC (Sandbox)
const otpStore = new Map<string, string>(); // In prod, use Redis

export const initiateAadhaar = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partnerId = req.user?.partnerId;
    const { aadhaar } = req.body;

    if (!partnerId || aadhaar?.length !== 12) {
      res.status(400).json({ error: 'Invalid Aadhaar' });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const sessionId = uuidv4();
    otpStore.set(`aadhaar:${sessionId}`, otp);

    res.json({ sessionId, message: 'OTP sent', otp }); // Expose OTP for dev
  } catch (error) {
    res.status(500).json({ error: 'Failed to initiate KYC' });
  }
};

export const verifyAadhaar = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partnerId = req.user?.partnerId;
    const { sessionId, otp } = req.body;

    if (!partnerId) {
      res.status(400).json({ error: 'Partner not found' });
      return;
    }

    const storedOtp = otpStore.get(`aadhaar:${sessionId}`);
    
    // Constant time compare
    if (!storedOtp || !crypto.timingSafeEqual(Buffer.from(storedOtp), Buffer.from(otp))) {
      res.status(400).json({ error: 'Invalid OTP' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.user?.id },
      data: { aadhaarStatus: 'VERIFIED' }
    });

    otpStore.delete(`aadhaar:${sessionId}`);

    res.json({ success: true, aadhaarStatus: 'VERIFIED' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify KYC' });
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
        user: { select: { name: true, phone: true } },
        certificates: true,
        bankAccounts: true
      }
    });

    if (!partner) {
      res.status(404).json({ error: 'Partner not found' });
      return;
    }
    res.json(partner);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

export const getNearbyPartners = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { lat, lng, category, radius = '10' } = req.query as Record<string, string>;
    if (!lat || !lng) {
      res.status(400).json({ error: 'lat and lng required' });
      return;
    }

    const { findPartnersNearJobWithDistance } = await import('../services/geoService');
    const nearbyRaw = await findPartnersNearJobWithDistance(parseFloat(lat), parseFloat(lng), parseFloat(radius));

    if (nearbyRaw.length === 0) {
      res.json([]);
      return;
    }

    const partnerIds = nearbyRaw.map(p => p.partnerId);
    const distanceMap = new Map(nearbyRaw.map(p => [p.partnerId, p.distanceKm]));

    const partners = await prisma.partner.findMany({
      where: {
        id: { in: partnerIds },
        isOnline: true,
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

