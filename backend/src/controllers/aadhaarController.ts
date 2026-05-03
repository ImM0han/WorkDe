import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import crypto from 'crypto';

// In-memory OTP cache for the Sandbox
// Key: `aadhaar:${userId}`, Value: { otp, attempts, expiresAt }
const otpCache = new Map<string, { otp: string; attempts: number; expiresAt: number }>();

export const initiateAadhaarKyc = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { aadhaarNumber } = req.body;
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    // Validate: exactly 12 digits, no leading 0 or 1
    if (!/^[2-9]\d{11}$/.test(aadhaarNumber)) {
      res.status(400).json({ error: 'Invalid Aadhaar number' });
      return;
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in mock Redis (Map) with 5 min TTL
    otpCache.set(`aadhaar:${userId}`, {
      otp,
      attempts: 0,
      expiresAt: Date.now() + 300 * 1000 // 300s
    });

    const sessionId = crypto.randomUUID();

    // DEV: return OTP in response body
    res.json({
      sessionId,
      message: 'OTP sent successfully',
      ...(process.env.NODE_ENV !== 'production' && { otp })
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initiate KYC' });
  }
};

export const verifyAadhaarOtp = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { otp, aadhaarNumber } = req.body;
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const cacheKey = `aadhaar:${userId}`;
    const cached = otpCache.get(cacheKey);

    if (!cached || Date.now() > cached.expiresAt) {
      otpCache.delete(cacheKey);
      res.status(400).json({ error: 'OTP expired or not requested' });
      return;
    }

    if (cached.attempts >= 3) {
      // 15-min lockout logic would go here in a full Redis implementation
      res.status(429).json({ error: 'Maximum attempts exceeded. Try again later.' });
      return;
    }

    // Constant-time compare
    const expectedBuffer = Buffer.from(cached.otp);
    const providedBuffer = Buffer.from(String(otp).padStart(6, '0'));
    
    let isMatch = false;
    if (expectedBuffer.length === providedBuffer.length) {
      isMatch = crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    }

    if (!isMatch) {
      cached.attempts += 1;
      otpCache.set(cacheKey, cached);
      res.status(400).json({ error: 'Invalid OTP' });
      return;
    }

    // Success
    await prisma.user.update({
      where: { id: userId },
      data: { aadhaarStatus: 'VERIFIED' }
    });

    otpCache.delete(cacheKey);

    // Mock Push Notification emit
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', {
        type: 'AADHAAR_VERIFIED',
        title: 'Aadhaar Verified ✅',
        body: 'Your profile is now verified!'
      });
    }

    const maskedAadhaar = `XXXX XXXX ${String(aadhaarNumber).slice(-4)}`;
    res.json({ success: true, maskedAadhaar });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify KYC' });
  }
};
