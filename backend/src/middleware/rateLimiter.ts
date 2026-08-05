import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis';

const lockouts = new Map<string, number>();
const attempts = new Map<string, number>();

export const checkLoginLockout = async (phone: string) => {
  const lockedUntil = lockouts.get(phone);
  if (lockedUntil && lockedUntil > Date.now()) {
    const ttl = Math.ceil((lockedUntil - Date.now()) / 1000);
    throw { status: 429, message: 'Too many attempts', retryAfter: ttl };
  } else if (lockedUntil) {
    lockouts.delete(phone);
  }
};

export const recordFailedAttempt = async (phone: string) => {
  const current = (attempts.get(phone) || 0) + 1;
  attempts.set(phone, current);
  
  if (current >= 5) {
    lockouts.set(phone, Date.now() + 15 * 60 * 1000); // 15 mins lockout
    attempts.delete(phone);
  }
};

export const clearAttempts = async (phone: string) => {
  attempts.delete(phone);
  lockouts.delete(phone);
};

export const rateLimitOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ error: 'Phone number is required' });
      return;
    }

    const key = `rate:otp:${phone}`;
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, 600); // 10 minutes (600s)
    }

    if (current > 3) {
      const ttl = await redis.ttl(key);
      res.status(429).json({
        error: 'Too many OTP requests. Please try again later.',
        retryAfter: ttl
      });
      return;
    }

    next();
  } catch (error) {
    console.error('[Rate Limiter] OTP rate limit error:', error);
    next();
  }
};

export const rateLimitPayment = async (req: any, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id || req.ip;
    const key = `rate:payment:${userId}`;
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, 60); // 1 minute (60s)
    }

    if (current > 10) {
      const ttl = await redis.ttl(key);
      res.status(429).json({
        error: 'Too many payment requests. Please try again later.',
        retryAfter: ttl
      });
      return;
    }

    next();
  } catch (error) {
    console.error('[Rate Limiter] Payment rate limit error:', error);
    next();
  }
};

