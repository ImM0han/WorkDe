import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { checkLoginLockout, recordFailedAttempt, clearAttempts } from '../middleware/rateLimiter';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_min_32_chars';
const OTP_TOKEN_SECRET = process.env.OTP_TOKEN_SECRET || 'your_separate_otp_jwt_secret_32chars_min';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

const mockOtpStore = new Map<string, string>();
const forgotPwdStore = new Map<string, string>();

export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    const user = await prisma.user.findUnique({ where: { phone } });
    const isExistingUser = !!user;

    const sessionInfo = Math.random().toString(36).substring(2, 15);
    const mockOtp = '123456'; 
    mockOtpStore.set(sessionInfo, mockOtp);
    
    setTimeout(() => {
      console.log(`[MOCK SMS] OTP for ${phone} is ${mockOtp}. Session: ${sessionInfo}`);
    }, 500);

    return res.status(200).json({ sessionInfo, isExistingUser, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { sessionInfo, otp, role, phone: bodyPhone } = req.body;
    if (!sessionInfo || !otp) return res.status(400).json({ error: 'Missing parameters' });

    const storedOtp = mockOtpStore.get(sessionInfo) || forgotPwdStore.get(sessionInfo);
    if (!storedOtp || storedOtp !== otp) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    mockOtpStore.delete(sessionInfo);
    forgotPwdStore.delete(sessionInfo);

    const phone = bodyPhone || '+910000000000'; // For mock since we didn't store it

    let user = await prisma.user.findUnique({ where: { phone } });
    
    const otpToken = jwt.sign({ phone, role: role || user?.role }, OTP_TOKEN_SECRET, { expiresIn: '15m' });

    if (!user) {
      return res.status(200).json({ isNewUser: true, otpToken, verified: true });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json({ isNewUser: false, user, token, otpToken, verified: true });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const setPassword = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const otpToken = authHeader && authHeader.split(' ')[1];
    if (!otpToken) return res.status(401).json({ error: 'Missing OTP token' });

    let decoded: any;
    try {
      decoded = jwt.verify(otpToken, OTP_TOKEN_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid or expired temp token' });
    }

    const { password } = req.body;
    const { phone, role } = decoded;

    if (!password || password.length < 8) return res.status(400).json({ error: 'Invalid password' });

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    let user = await prisma.user.findUnique({ where: { phone }, include: { partner: true } });
    let isNewUser = false;
    
    if (user) {
      user = await prisma.user.update({
        where: { phone },
        data: { passwordHash },
        include: { partner: true }
      });
    } else {
      isNewUser = true;
      user = await prisma.user.create({
        data: { phone, passwordHash, role: role || 'CLIENT', name: '' },
        include: { partner: true }
      });
      if (role === 'PARTNER') {
        const partner = await prisma.partner.create({ data: { userId: user.id } });
        user.partner = partner;
      }
    }

    const token = jwt.sign({ id: user.id, role: user.role, partnerId: user.partner?.id }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json({ user, token, isNewUser });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal error' });
  }
};

export const loginPassword = async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;
    
    try {
      await checkLoginLockout(phone);
    } catch (e: any) {
      return res.status(429).json(e);
    }

    const user = await prisma.user.findUnique({ where: { phone }, include: { partner: true } });
    if (!user || !user.passwordHash) {
      await recordFailedAttempt(phone);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await recordFailedAttempt(phone);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await clearAttempts(phone);

    const token = jwt.sign({ id: user.id, role: user.role, partnerId: user.partner?.id }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json({ user, token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal error' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    const sessionInfo = Math.random().toString(36).substring(2, 15);
    const mockOtp = '123456'; 
    forgotPwdStore.set(sessionInfo, mockOtp);
    
    setTimeout(() => {
      console.log(`[MOCK FORGOT SMS] OTP for ${phone} is ${mockOtp}. Session: ${sessionInfo}`);
    }, 500);

    return res.status(200).json({ sessionInfo, message: 'OTP sent' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    // The spec uses setPassword for this, but also mentions resetPassword.
    // They share identical logic. We'll reuse setPassword's flow here, or just wrap it.
    return setPassword(req, res);
  } catch (error) {
    return res.status(500).json({ error: 'Internal error' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const tempToken = authHeader && authHeader.split(' ')[1];
    if (!tempToken) return res.status(401).json({ error: 'Missing token' });

    let decoded: any;
    try {
      try {
        decoded = jwt.verify(tempToken, OTP_TOKEN_SECRET);
      } catch (e) {
        decoded = jwt.verify(tempToken, JWT_SECRET); // fallback for if we sent the full token
      }
    } catch (e) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { name, email, avatarUrl } = req.body;
    const phone = decoded.phone || (await prisma.user.findUnique({ where: { id: decoded.id } }))?.phone;

    if (!phone) return res.status(400).json({ error: 'Phone not found in token' });

    let user = await prisma.user.findUnique({ where: { phone }, include: { partner: true } });
    if (user) {
      user = await prisma.user.update({
        where: { phone },
        data: { name, email, avatarUrl, isVerified: true },
        include: { partner: true }
      });
    } else {
      user = await prisma.user.create({
        data: { phone, name, email, avatarUrl, role: decoded.role || 'CLIENT', isVerified: true },
        include: { partner: true }
      });
      if (user.role === 'PARTNER') {
        const partner = await prisma.partner.create({ data: { userId: user.id } });
        user.partner = partner;
      }
    }

    const token = jwt.sign({ id: user.id, role: user.role, partnerId: user.partner?.id }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(201).json({ user, token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal error' });
  }
};

export const changePassword = async (req: any, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user || !user.passwordHash) return res.status(400).json({ error: 'Password not set' });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid current password' });

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    return res.status(200).json({ message: 'Password updated' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal error' });
  }
};

export const me = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};
