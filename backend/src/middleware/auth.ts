import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_min_32_chars';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    partnerId?: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    if (decoded && decoded.id) {
      try {
        const { prisma } = await import('../utils/prisma');
        const userRecord = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { isDeleted: true, partner: { select: { id: true } } }
        });
        if (!userRecord || userRecord.isDeleted) {
          return res.status(403).json({ error: 'Account has been deleted or deactivated' });
        }
        if (decoded.role === 'PARTNER' && !decoded.partnerId && userRecord.partner) {
          decoded.partnerId = userRecord.partner.id;
        }
      } catch (e) {
        console.error('Error looking up user in auth middleware:', e);
      }
    }
    req.user = decoded;
    next();
  });
};
