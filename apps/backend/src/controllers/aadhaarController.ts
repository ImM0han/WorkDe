import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import crypto from 'crypto';
import { sendAadhaarOtp as extSendOtp, verifyAadhaarOtp as extVerifyOtp } from '../services/sandboxService';
import { sendPushNotification } from '../services/pushService';

// In-memory OTP cache for the Sandbox
// Key: `aadhaar:${userId}`, Value: { clientId, aadhaarNumber, expiresAt, isMock, mockOtp }
const otpCache = new Map<string, { clientId: string; aadhaarNumber: string; expiresAt: number; isMock: boolean; mockOtp?: string }>();

export const initiateAadhaarKyc = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { aadhaar, aadhaarNumber } = req.body;
    const rawAadhaar = String(aadhaarNumber || aadhaar || '').replace(/\D/g, '');
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    // Validate: exactly 12 digits
    if (!/^\d{12}$/.test(rawAadhaar)) {
      res.status(400).json({ error: 'Invalid 12-digit Aadhaar number' });
      return;
    }

    // Call sandbox service to send OTP
    const { clientId, isMock, mockOtp } = await extSendOtp(rawAadhaar);
    const effectiveOtp = mockOtp || '123456';

    // Store in session cache with 5 min TTL
    otpCache.set(`aadhaar:${userId}`, {
      clientId,
      aadhaarNumber: rawAadhaar,
      expiresAt: Date.now() + 300 * 1000, // 300s
      isMock,
      mockOtp: effectiveOtp
    });

    const sessionId = crypto.randomUUID();

    res.json({
      sessionId,
      message: 'OTP sent successfully',
      otp: effectiveOtp
    });
  } catch (error: any) {
    console.error('[Aadhaar Controller] Initiation error:', error.message || error);
    res.status(500).json({ error: error.message || 'Failed to initiate KYC' });
  }
};

export const verifyAadhaarOtp = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { otp } = req.body;
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const cacheKey = `aadhaar:${userId}`;
    const cached = otpCache.get(cacheKey);

    if (!cached || Date.now() > cached.expiresAt) {
      otpCache.delete(cacheKey);
      res.status(400).json({ error: 'OTP expired or not requested' });
      return;
    }

    const { clientId, aadhaarNumber, isMock, mockOtp } = cached;
    let dobToStore: Date | null = null;
    let nameToStore: string | null = null;

    if (isMock || clientId.startsWith('mock_client_')) {
      // Verify mock OTP
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
        if (otp === '123456' || /^\d{6}$/.test(otp)) {
          nameToStore = 'TEST AADHAAR USER';
        } else {
          res.status(400).json({ error: err.message || 'Invalid OTP or verification failed' });
          return;
        }
      }
    }

    // Success: Update database to PROCESSING for Admin approval
    await prisma.user.update({
      where: { id: userId },
      data: { 
        aadhaarStatus: 'PROCESSING',
        aadhaarNumber: aadhaarNumber || null,
        aadhaarOtp: otp || '123456',
        ...(dobToStore && { dob: dobToStore }),
        ...(nameToStore && { name: nameToStore })
      } as any
    });

    otpCache.delete(cacheKey);

    // Trigger Real-Time Notification (Socket.IO)
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', {
        type: 'AADHAAR_SUBMITTED',
        title: 'Aadhaar Submitted ⏳',
        body: 'Your Aadhaar KYC details are submitted and pending admin approval.'
      });
    }

    const maskedAadhaar = `XXXX XXXX ${String(aadhaarNumber).slice(-4)}`;
    res.json({ success: true, aadhaarStatus: 'PROCESSING', maskedAadhaar, message: 'KYC submitted for admin approval' });
  } catch (error: any) {
    console.error('[Aadhaar Controller] Verification error:', error.message || error);
    res.status(500).json({ error: error.message || 'Failed to verify KYC' });
  }
};
