import { Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../utils/prisma';
import { AdminAuthRequest, logAdminAction } from '../../middleware/adminAuth';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'fallback_admin_jwt_secret_min_32_chars_diff';

export const login = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { username, phone, password } = req.body;
    const identifier = username || phone;

    if (!identifier || !password || typeof identifier !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Username or phone and password are required' });
      return;
    }

    const cleanIdentifier = identifier.trim();

    const admin = await prisma.adminUser.findFirst({
      where: {
        OR: [
          { username: cleanIdentifier },
          { username: cleanIdentifier.replace('+91', '') },
          { username: `+91${cleanIdentifier.replace(/\D/g, '')}` }
        ]
      }
    });

    if (!admin || !admin.isActive) {
      // Dummy compare to mitigate timing attacks without revealing username existence
      await bcrypt.compare(password, '$2b$12$eImiTXuWVxfM37uY4JANjO5E/8vG2aJ8aY6uG8j2W9fFz.a8lE6Sm');
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check account lockout
    if (admin.lockedUntil && admin.lockedUntil.getTime() > Date.now()) {
      const remainingMinutes = Math.ceil((admin.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      res.status(429).json({
        error: `Account is temporarily locked due to too many failed login attempts. Please try again in ${remainingMinutes} minute(s).`
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);

    if (!isPasswordValid) {
      const updatedFailedAttempts = admin.failedAttempts + 1;
      const shouldLock = updatedFailedAttempts >= 5;
      const lockedUntil = shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await prisma.adminUser.update({
        where: { id: admin.id },
        data: {
          failedAttempts: updatedFailedAttempts,
          lockedUntil: shouldLock ? lockedUntil : admin.lockedUntil
        }
      });

      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Login successful - reset lockout & update last login
    const now = new Date();
    const updatedAdmin = await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: now
      }
    });

    const token = jwt.sign(
      {
        id: updatedAdmin.id,
        role: updatedAdmin.role,
        username: updatedAdmin.username
      },
      ADMIN_JWT_SECRET,
      { expiresIn: '8h' }
    );

    req.admin = {
      id: updatedAdmin.id,
      role: updatedAdmin.role,
      username: updatedAdmin.username
    };

    await logAdminAction(req, 'LOGIN', 'AdminUser', updatedAdmin.id, { username: updatedAdmin.username });

    res.json({
      token,
      admin: {
        id: updatedAdmin.id,
        username: updatedAdmin.username,
        role: updatedAdmin.role,
        lastLoginAt: updatedAdmin.lastLoginAt
      }
    });
  } catch (error) {
    console.error('[Admin Auth Controller] Login error:', error);
    res.status(500).json({ error: 'Failed to process admin login' });
  }
};

export const me = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin?.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: req.admin.id },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!admin) {
      res.status(444).json({ error: 'Admin profile not found' });
      return;
    }

    res.json(admin);
  } catch (error) {
    console.error('[Admin Auth Controller] me error:', error);
    res.status(500).json({ error: 'Failed to fetch admin profile' });
  }
};

export const changeOwnPassword = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin?.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters long' });
      return;
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: req.admin.id }
    });

    if (!admin) {
      res.status(404).json({ error: 'Admin profile not found' });
      return;
    }

    const isOldValid = await bcrypt.compare(oldPassword, admin.passwordHash);
    if (!isOldValid) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash: newHash }
    });

    await logAdminAction(req, 'CHANGE_OWN_PASSWORD', 'AdminUser', admin.id);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('[Admin Auth Controller] changeOwnPassword error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};
