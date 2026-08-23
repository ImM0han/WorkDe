import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { AdminRole } from '@prisma/client';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'fallback_admin_jwt_secret_min_32_chars_diff';

export interface AdminAuthRequest extends Request {
  admin?: {
    id: string;
    role: AdminRole;
    username: string;
  };
}

export const authenticateAdmin = async (req: AdminAuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Admin access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as { id: string; role: AdminRole; username: string };
    
    if (!decoded || !decoded.id || !decoded.role) {
      res.status(403).json({ error: 'Invalid admin token structure' });
      return;
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: decoded.id }
    });

    if (!admin || !admin.isActive) {
      res.status(403).json({ error: 'Admin account is inactive or no longer exists' });
      return;
    }

    req.admin = {
      id: admin.id,
      role: admin.role,
      username: admin.username
    };

    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired admin token' });
    return;
  }
};

export const requireSuperadmin = (req: AdminAuthRequest, res: Response, next: NextFunction) => {
  if (!req.admin || req.admin.role !== 'SUPERADMIN') {
    res.status(403).json({ error: 'Superadmin privileges required' });
    return;
  }
  next();
};

export const logAdminAction = async (
  req: AdminAuthRequest,
  action: string,
  targetType: string,
  targetId?: string,
  metadata?: any
) => {
  try {
    if (!req.admin?.id) return;
    
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || req.ip;

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.admin.id,
        action,
        targetType,
        targetId: targetId || null,
        metadata: metadata ? metadata : undefined,
        ipAddress: clientIp
      }
    });
  } catch (error) {
    console.error('[Admin Audit Log Error]: Failed to write audit log:', error);
  }
};
