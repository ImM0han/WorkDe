import { Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../../utils/prisma';
import { AdminAuthRequest, logAdminAction } from '../../middleware/adminAuth';
import { AdminRole } from '@prisma/client';

export const listAdmins = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const role = req.query.role as AdminRole | undefined;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const search = req.query.search as string | undefined;

    const where: any = {};
    if (role && (role === 'SUPERADMIN' || role === 'ADMIN')) {
      where.role = role;
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (search) {
      where.username = { contains: search, mode: 'insensitive' };
    }

    const [admins, total] = await Promise.all([
      prisma.adminUser.findMany({
        where,
        select: {
          id: true,
          username: true,
          role: true,
          isActive: true,
          createdById: true,
          createdBy: {
            select: { id: true, username: true }
          },
          failedAttempts: true,
          lockedUntil: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.adminUser.count({ where })
    ]);

    res.json({
      admins,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Admin Management Controller] listAdmins error:', error);
    res.status(500).json({ error: 'Failed to list admins' });
  }
};

export const createAdmin = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { username, role, customPassword } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      res.status(400).json({ error: 'Username must be at least 3 characters long' });
      return;
    }

    const cleanUsername = username.trim();
    const existing = await prisma.adminUser.findUnique({
      where: { username: cleanUsername }
    });

    if (existing) {
      res.status(400).json({ error: `Admin username "${cleanUsername}" already exists` });
      return;
    }

    const targetRole: AdminRole = role === 'SUPERADMIN' ? 'SUPERADMIN' : 'ADMIN';

    // Generate random strong password if not provided
    const tempPassword = customPassword && typeof customPassword === 'string' && customPassword.length >= 8
      ? customPassword
      : crypto.randomBytes(6).toString('hex') + 'A1!';

    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const newAdmin = await prisma.adminUser.create({
      data: {
        username: cleanUsername,
        passwordHash,
        role: targetRole,
        createdById: req.admin?.id,
        isActive: true
      },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    await logAdminAction(req, 'CREATE_ADMIN', 'AdminUser', newAdmin.id, {
      username: newAdmin.username,
      role: newAdmin.role
    });

    res.status(201).json({
      message: 'Admin created successfully',
      admin: newAdmin,
      temporaryPassword: tempPassword
    });
  } catch (error) {
    console.error('[Admin Management Controller] createAdmin error:', error);
    res.status(500).json({ error: 'Failed to create admin' });
  }
};

export const updateAdmin = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive, role, resetPassword } = req.body;

    const admin = await prisma.adminUser.findUnique({
      where: { id }
    });

    if (!admin) {
      res.status(404).json({ error: 'Admin not found' });
      return;
    }

    // Protection check for demotion / deactivation
    if (admin.id === req.admin?.id) {
      if (isActive === false) {
        res.status(400).json({ error: 'You cannot deactivate your own superadmin account' });
        return;
      }
      if (role && role !== 'SUPERADMIN') {
        res.status(400).json({ error: 'You cannot demote your own superadmin account' });
        return;
      }
    }

    if ((isActive === false || (role && role !== 'SUPERADMIN')) && admin.role === 'SUPERADMIN') {
      const activeSuperadminCount = await prisma.adminUser.count({
        where: { role: 'SUPERADMIN', isActive: true }
      });

      if (activeSuperadminCount <= 1) {
        res.status(400).json({ error: 'Cannot deactivate or demote the last remaining active superadmin' });
        return;
      }
    }

    const updateData: any = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (role === 'SUPERADMIN' || role === 'ADMIN') updateData.role = role;

    let newTempPassword: string | null = null;
    if (resetPassword === true) {
      newTempPassword = crypto.randomBytes(6).toString('hex') + 'B2!';
      updateData.passwordHash = await bcrypt.hash(newTempPassword, 12);
      updateData.failedAttempts = 0;
      updateData.lockedUntil = null;
    }

    const updatedAdmin = await prisma.adminUser.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    await logAdminAction(req, 'UPDATE_ADMIN', 'AdminUser', updatedAdmin.id, {
      changes: updateData,
      passwordReset: !!newTempPassword
    });

    res.json({
      message: 'Admin updated successfully',
      admin: updatedAdmin,
      ...(newTempPassword ? { temporaryPassword: newTempPassword } : {})
    });
  } catch (error) {
    console.error('[Admin Management Controller] updateAdmin error:', error);
    res.status(500).json({ error: 'Failed to update admin' });
  }
};

export const deleteAdmin = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (id === req.admin?.id) {
      res.status(400).json({ error: 'You cannot delete your own superadmin account' });
      return;
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id }
    });

    if (!admin) {
      res.status(404).json({ error: 'Admin not found' });
      return;
    }

    if (admin.role === 'SUPERADMIN' && admin.isActive) {
      const activeSuperadminCount = await prisma.adminUser.count({
        where: { role: 'SUPERADMIN', isActive: true }
      });

      if (activeSuperadminCount <= 1) {
        res.status(400).json({ error: 'Cannot delete the last remaining active superadmin' });
        return;
      }
    }

    // Soft delete by setting isActive: false
    const deletedAdmin = await prisma.adminUser.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, username: true, isActive: true }
    });

    await logAdminAction(req, 'DELETE_ADMIN', 'AdminUser', deletedAdmin.id, {
      username: deletedAdmin.username
    });

    res.json({ message: 'Admin deactivated successfully', admin: deletedAdmin });
  } catch (error) {
    console.error('[Admin Management Controller] deleteAdmin error:', error);
    res.status(500).json({ error: 'Failed to delete admin' });
  }
};
