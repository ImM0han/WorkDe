import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis';

const lockouts = new Map<string, number>();
const attempts = new Map<string, number>();

export const checkLoginLockout = async (identifier: string) => {
  const lockedUntil = lockouts.get(identifier);
  if (lockedUntil && lockedUntil > Date.now()) {
    const ttl = Math.ceil((lockedUntil - Date.now()) / 1000);
    throw { status: 429, message: 'Too many attempts', retryAfter: ttl };
  } else if (lockedUntil) {
    lockouts.delete(identifier);
  }
};

export const recordFailedAttempt = async (identifier: string) => {
  const current = (attempts.get(identifier) || 0) + 1;
  attempts.set(identifier, current);
  
  if (current >= 5) {
    lockouts.set(identifier, Date.now() + 15 * 60 * 1000); // 15 mins lockout
    attempts.delete(identifier);
  }
};

export const clearAttempts = async (identifier: string) => {
  attempts.delete(identifier);
  lockouts.delete(identifier);
};

export const rateLimitOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phone, email } = req.body;
    const identifier = phone || email;
    if (!identifier) {
      res.status(400).json({ error: 'Phone number or email is required' });
      return;
    }

    const key = `rate:otp:${identifier}`;
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

