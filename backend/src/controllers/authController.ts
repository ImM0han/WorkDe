import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { checkLoginLockout, recordFailedAttempt, clearAttempts } from '../middleware/rateLimiter';
import admin from '../lib/firebase';
import { supabase } from '../lib/supabase';
import { checkPhoneBanned } from '../utils/bannedPhoneCheck';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_min_32_chars';
const OTP_TOKEN_SECRET = process.env.OTP_TOKEN_SECRET || 'your_separate_otp_jwt_secret_32chars_min';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');


export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { phone, email, role } = req.body;
    if (!phone && !email) return res.status(400).json({ error: 'Phone number or email is required' });

    let user = null;
    if (phone) {
      const banCheck = await checkPhoneBanned(phone);
      if (banCheck.isBanned) {
        return res.status(403).json({ error: banCheck.message });
      }
      user = await prisma.user.findFirst({ where: { phone } });
    } else if (email) {
      user = await prisma.user.findFirst({ where: { email } });
    }

    if (user && role && user.role !== role.toUpperCase()) {
      const existingRoleLabel = user.role === 'PARTNER' ? 'Partner' : 'Client';
      return res.status(400).json({ 
        error: `This account is registered as a ${existingRoleLabel}. Please select ${existingRoleLabel} role to continue.` 
      });
    }

    const isExistingUser = !!user;

    return res.status(200).json({ isExistingUser, message: 'OTP verification flow ready' });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { idToken, role } = req.body;
    if (!idToken) return res.status(400).json({ error: 'ID token is required' });

    let phone: string | undefined;
    let email: string | undefined;

    if (process.env.NODE_ENV !== 'production' && idToken.startsWith('mock-supabase-access-token:')) {
      const parts = idToken.split(':');
      const val = parts[1];
      if (val.includes('@')) {
        email = val;
      } else {
        phone = val;
      }
      console.log(`[MOCK BYPASS] Successfully bypassed Supabase verification for: ${val}`);
    } else if (process.env.NODE_ENV !== 'production' && idToken.startsWith('mock-firebase-id-token:')) {
      const parts = idToken.split(':');
      phone = parts[1];
      console.log(`[MOCK BYPASS] Successfully bypassed Firebase verifyIdToken for phone: ${phone}`);
    } else {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(idToken);
        if (error || !user) {
          throw error || new Error('No user found associated with this token');
        }
        phone = user.phone;
        email = user.email;
      } catch (e: any) {
        console.error('Supabase token verification error:', e.message || e);
        return res.status(400).json({ error: 'Invalid or expired verification token' });
      }
    }

    if (!phone && !email) {
      return res.status(400).json({ error: 'Identifier could not be extracted from verification token' });
    }

    let user = null;
    if (phone) {
      const banCheck = await checkPhoneBanned(phone);
      if (banCheck.isBanned) {
        return res.status(403).json({ error: banCheck.message });
      }
      user = await prisma.user.findFirst({ where: { phone }, include: { partner: true } });
    } else if (email) {
      user = await prisma.user.findFirst({ where: { email }, include: { partner: true } });
    }
    
    if (user && role && user.role !== role.toUpperCase()) {
      const existingRoleLabel = user.role === 'PARTNER' ? 'Partner' : 'Client';
      return res.status(400).json({ 
        error: `This account is registered as a ${existingRoleLabel}. Please select ${existingRoleLabel} role to continue.` 
      });
    }

    const otpToken = jwt.sign({ phone, email, role: role ? role.toUpperCase() : user?.role }, OTP_TOKEN_SECRET, { expiresIn: '15m' });

    if (!user) {
      return res.status(200).json({ isNewUser: true, otpToken, verified: true });
    }

    const token = jwt.sign({ id: user.id, role: user.role, partnerId: user.partner?.id, phone: user.phone, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
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
    const { phone, email, role } = decoded;

    if (!password || password.length < 8) return res.status(400).json({ error: 'Invalid password' });

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    let user = null;
    if (phone) {
      user = await prisma.user.findFirst({ where: { phone }, include: { partner: true } });
    } else if (email) {
      user = await prisma.user.findFirst({ where: { email }, include: { partner: true } });
    }

    if (user && user.securityQuestions) {
      const sqs = user.securityQuestions as any[];
      if (sqs && sqs.length > 0) {
        if (!decoded.questionsVerified) {
          return res.status(403).json({ error: 'Security questions verification is required before resetting password' });
        }
      }
    }
    
    let isNewUser = false;
    
    if (user) {
      if (role && user.role !== role.toUpperCase()) {
        const existingRoleLabel = user.role === 'PARTNER' ? 'Partner' : 'Client';
        return res.status(400).json({ 
          error: `This account is registered as a ${existingRoleLabel}. Please select ${existingRoleLabel} role to continue.` 
        });
      }

      user = await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
        include: { partner: true }
      });
    } else {
      isNewUser = true;
      user = await prisma.user.create({
        data: { phone, email, passwordHash, role: role || 'CLIENT', name: '' },
        include: { partner: true }
      });
      if (role === 'PARTNER') {
        const partner = await prisma.partner.create({ data: { userId: user.id } });
        user.partner = partner;
      }
    }

    const token = jwt.sign({ id: user.id, role: user.role, partnerId: user.partner?.id, phone: user.phone, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json({ user, token, isNewUser });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal error' });
  }
};

export const loginPassword = async (req: Request, res: Response) => {
  try {
    const { phone, email, password, role } = req.body;
    const identifier = phone || email;
    if (!identifier) return res.status(400).json({ error: 'Phone number or email is required' });
    
    try {
      await checkLoginLockout(identifier);
    } catch (e: any) {
      return res.status(429).json(e);
    }

    // Check if credentials belong to an Admin / Superadmin account
    const cleanId = (identifier || '').trim();
    const adminUser = await prisma.adminUser.findFirst({
      where: {
        OR: [
          { username: cleanId },
          { username: cleanId.replace('+91', '') },
          { username: `+91${cleanId.replace(/\D/g, '')}` }
        ],
        isActive: true
      }
    });

    if (adminUser) {
      const isMatch = await bcrypt.compare(password, adminUser.passwordHash);
      if (isMatch) {
        await clearAttempts(identifier);
        const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'fallback_admin_jwt_secret_min_32_chars_diff';
        const adminToken = jwt.sign(
          { id: adminUser.id, role: adminUser.role, username: adminUser.username },
          ADMIN_JWT_SECRET,
          { expiresIn: '8h' }
        );
        return res.status(200).json({
          isAdmin: true,
          token: adminToken,
          user: {
            id: adminUser.id,
            name: adminUser.username,
            username: adminUser.username,
            role: adminUser.role,
            isVerified: true
          }
        });
      }
    }

    let user = null;
    if (phone) {
      const banCheck = await checkPhoneBanned(phone);
      if (banCheck.isBanned) {
        return res.status(403).json({ error: banCheck.message });
      }
      user = await prisma.user.findFirst({ where: { phone }, include: { partner: true } });
    } else if (email) {
      user = await prisma.user.findFirst({ where: { email }, include: { partner: true } });
    }

    if (!user || !user.passwordHash) {
      await recordFailedAttempt(identifier);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (role && user.role !== role.toUpperCase()) {
      const existingRoleLabel = user.role === 'PARTNER' ? 'Partner' : 'Client';
      return res.status(400).json({ 
        error: `This account is registered as a ${existingRoleLabel}. Please select ${existingRoleLabel} role to continue.` 
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await recordFailedAttempt(identifier);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await clearAttempts(identifier);

    const token = jwt.sign({ id: user.id, role: user.role, partnerId: user.partner?.id, phone: user.phone, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json({ user, token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal error' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { phone, email, role } = req.body;
    if (!phone && !email) return res.status(400).json({ error: 'Phone number or email is required' });

    let user = null;
    if (phone) {
      user = await prisma.user.findFirst({ where: { phone } });
    } else if (email) {
      user = await prisma.user.findFirst({ where: { email } });
    }

    if (!user) {
      return res.status(404).json({ error: 'Account does not exist. Please register first.' });
    }

    if (role && user.role !== role.toUpperCase()) {
      const existingRoleLabel = user.role === 'PARTNER' ? 'Partner' : 'Client';
      return res.status(400).json({ 
        error: `This account is registered as a ${existingRoleLabel}. Please select ${existingRoleLabel} role to continue.` 
      });
    }

    return res.status(200).json({ message: 'User verification successful' });
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

    const { name, email, phone: bodyPhone, avatarUrl, gender, securityQuestions } = req.body;
    const phone = decoded.phone || bodyPhone;
    const decodedEmail = decoded.email;

    if (phone) {
      const banCheck = await checkPhoneBanned(phone);
      if (banCheck.isBanned) {
        return res.status(403).json({ error: banCheck.message });
      }
    }

    if (!phone && !decodedEmail && !decoded.id) {
      return res.status(400).json({ error: 'Identifier not found in token' });
    }

    let securityQuestionsData = undefined;
    if (securityQuestions) {
      if (!Array.isArray(securityQuestions) || securityQuestions.length !== 3) {
        return res.status(400).json({ error: 'Exactly 3 security questions are required' });
      }
      securityQuestionsData = [];
      for (const sq of securityQuestions) {
        if (!sq.question || !sq.answer) {
          return res.status(400).json({ error: 'Each security question must have a question and an answer' });
        }
        const normalizedAnswer = sq.answer.trim().toLowerCase();
        const answerHash = await bcrypt.hash(normalizedAnswer, BCRYPT_ROUNDS);
        securityQuestionsData.push({
          question: sq.question,
          answerHash
        });
      }
    }

    let user = null;
    if (decoded.id) {
      user = await prisma.user.findUnique({ where: { id: decoded.id }, include: { partner: true } });
    } else if (phone) {
      user = await prisma.user.findFirst({ where: { phone }, include: { partner: true } });
    } else if (decodedEmail) {
      user = await prisma.user.findFirst({ where: { email: decodedEmail }, include: { partner: true } });
    }

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { 
          name, 
          email: email || decodedEmail || user.email, 
          phone: phone || user.phone, 
          avatarUrl, 
          isVerified: true, 
          gender,
          ...(securityQuestionsData && { securityQuestions: securityQuestionsData })
        },
        include: { partner: true }
      });
    } else {
      user = await prisma.user.create({
        data: { 
          phone, 
          email: email || decodedEmail, 
          name, 
          avatarUrl, 
          role: decoded.role || 'CLIENT', 
          isVerified: true, 
          gender,
          ...(securityQuestionsData && { securityQuestions: securityQuestionsData })
        },
        include: { partner: true }
      });
      if (user.role === 'PARTNER') {
        const partner = await prisma.partner.create({ data: { userId: user.id, gender } });
        user.partner = partner;
      }
    }

    const token = jwt.sign({ id: user.id, role: user.role, partnerId: user.partner?.id, phone: user.phone, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
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
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { partner: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (user.partner) {
      const completedJobsCount = await prisma.job.count({
        where: {
          partnerId: user.partner.id,
          status: 'COMPLETED'
        }
      });
      if (user.partner.totalJobs !== completedJobsCount) {
        await prisma.partner.update({
          where: { id: user.partner.id },
          data: { totalJobs: completedJobsCount }
        });
        user.partner.totalJobs = completedJobsCount;
      }
    }
    
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};
export const updateProfile = async (req: any, res: Response) => {
  try {
    const { name, email, avatarUrl, gender, pushToken } = req.body;
    const userId = req.user.id;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(gender !== undefined && { gender }),
        ...(pushToken !== undefined && { pushToken })
      },
      include: { partner: true }
    });

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserSecurityQuestions = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const otpToken = authHeader && authHeader.split(' ')[1];
    if (!otpToken) return res.status(401).json({ error: 'Missing temp token' });

    let decoded: any;
    try {
      decoded = jwt.verify(otpToken, OTP_TOKEN_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid or expired temp token' });
    }

    const { phone, email } = decoded;
    let user = null;
    if (phone) {
      user = await prisma.user.findFirst({ where: { phone } });
    } else if (email) {
      user = await prisma.user.findFirst({ where: { email } });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const sqs = user.securityQuestions as any[];
    if (!sqs || sqs.length === 0) {
      return res.status(200).json({ hasQuestions: false, questions: [] });
    }

    const questions = sqs.map((q: any) => q.question);
    return res.status(200).json({ hasQuestions: true, questions });
  } catch (error) {
    console.error('getUserSecurityQuestions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifySecurityQuestions = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const otpToken = authHeader && authHeader.split(' ')[1];
    if (!otpToken) return res.status(401).json({ error: 'Missing temp token' });

    let decoded: any;
    try {
      decoded = jwt.verify(otpToken, OTP_TOKEN_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid or expired temp token' });
    }

    const { phone, email, role } = decoded;
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Please select a question and write your answer' });
    }

    let user = null;
    if (phone) {
      user = await prisma.user.findFirst({ where: { phone } });
    } else if (email) {
      user = await prisma.user.findFirst({ where: { email } });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const sqs = user.securityQuestions as any[];
    if (!sqs || sqs.length === 0) {
      return res.status(400).json({ error: 'No security questions configured for this user' });
    }

    const dbSq = sqs.find((q: any) => q.question === question);
    if (!dbSq) {
      return res.status(400).json({ error: 'Invalid security question selected' });
    }

    const normalizedAnswer = (answer || '').trim().toLowerCase();
    const isMatch = await bcrypt.compare(normalizedAnswer, dbSq.answerHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect answer. Please try again.' });
    }

    const newOtpToken = jwt.sign(
      { phone, email, role, questionsVerified: true },
      OTP_TOKEN_SECRET,
      { expiresIn: '15m' }
    );

    return res.status(200).json({ verified: true, otpToken: newOtpToken });
  } catch (error) {
    console.error('verifySecurityQuestions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
