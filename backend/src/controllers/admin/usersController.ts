import { Response } from 'express';
import { prisma } from '../../utils/prisma';
import { AdminAuthRequest, logAdminAction } from '../../middleware/adminAuth';
import { Role, KYCStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { banPhoneNumber } from '../../utils/bannedPhoneCheck';

export const listUsers = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const role = req.query.role as Role | undefined;
    const isVerified = req.query.isVerified !== undefined ? req.query.isVerified === 'true' : undefined;
    const aadhaarStatus = req.query.aadhaarStatus as KYCStatus | undefined;
    const kycStatus = req.query.kycStatus as string | undefined;
    const search = req.query.search as string | undefined;
    const includeDeleted = req.query.includeDeleted === 'true';

    const where: any = {};
    if (!includeDeleted) {
      where.isDeleted = false;
    }

    if (role && (role === 'CLIENT' || role === 'PARTNER')) {
      where.role = role;
    }
    if (isVerified !== undefined) {
      where.isVerified = isVerified;
    }
    if (aadhaarStatus) {
      where.aadhaarStatus = aadhaarStatus;
    }
    if (kycStatus) {
      const upperKyc = kycStatus.toUpperCase();
      if (upperKyc === 'VERIFIED') {
        where.aadhaarStatus = 'VERIFIED';
      } else if (upperKyc === 'PROCESSING') {
        where.OR = [{ aadhaarStatus: 'PROCESSING' }, { isAuthProcessing: true }];
      } else if (upperKyc === 'PENDING') {
        where.aadhaarStatus = 'PENDING';
        where.isAuthProcessing = { not: true };
      } else if (upperKyc === 'REJECTED') {
        where.aadhaarStatus = 'REJECTED';
      }
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          phone: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true,
          isVerified: true,
          isAuthProcessing: true,
          aadhaarStatus: true,
          aadhaarNumber: true,
          aadhaarOtp: true,
          dob: true,
          createdAt: true,
          partner: {
            select: {
              id: true,
              walletBalance: true,
              rating: true,
              totalJobs: true,
              isOnline: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Admin Users Controller] listUsers error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
};

export const getUser = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        partner: {
          include: {
            bankAccounts: true,
            certificates: true,
            withdrawals: {
              orderBy: { createdAt: 'desc' },
              take: 10
            }
          }
        },
        savedAddresses: true,
        disputes: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('[Admin Users Controller] getUser error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

export const updateUser = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const isSuperadmin = req.admin?.role === 'SUPERADMIN';

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { name, email, phone, isVerified, aadhaarStatus, gender, avatarUrl } = req.body;

    const updateData: any = {};

    if (isSuperadmin) {
      // Superadmin can update any field
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (gender !== undefined) updateData.gender = gender;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
      if (isVerified !== undefined) updateData.isVerified = Boolean(isVerified);
      if (aadhaarStatus !== undefined) updateData.aadhaarStatus = aadhaarStatus;
    } else {
      // Standard Admin: KYC / verification status fields ONLY
      if (isVerified !== undefined) updateData.isVerified = Boolean(isVerified);
      if (aadhaarStatus !== undefined) updateData.aadhaarStatus = aadhaarStatus;

      // Reject attempts by standard Admin to edit non-KYC fields
      if (name !== undefined || email !== undefined || phone !== undefined || gender !== undefined || avatarUrl !== undefined) {
        res.status(403).json({
          error: 'Admins can only update KYC/verification status. Superadmin privileges required to modify user personal profile fields.'
        });
        return;
      }
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: 'No valid fields provided for update' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData
    });

    // Notify user via Socket.IO in real-time
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${updatedUser.id}`).emit('user:updated', updatedUser);
      
      if (updatedUser.aadhaarStatus === 'VERIFIED' || updatedUser.isVerified) {
        io.to(`user:${updatedUser.id}`).emit('notification:new', {
          type: 'AADHAAR_VERIFIED',
          title: 'Aadhaar KYC Verified! ✅',
          body: 'Your Aadhaar KYC details have been verified by Admin.'
        });
      }
    }

    await logAdminAction(req, 'UPDATE_USER', 'User', updatedUser.id, {
      before: { isVerified: user.isVerified, aadhaarStatus: user.aadhaarStatus },
      after: updateData
    });

    res.json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    console.error('[Admin Users Controller] updateUser error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    if (req.admin?.role !== 'SUPERADMIN') {
      res.status(403).json({ error: 'Superadmin privileges required to delete users' });
      return;
    }

    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const targetPhone = (user as any).originalPhone || (user.phone ? user.phone.replace(/^\[BANNED_\d+\]_/, '') : null);

    if (targetPhone) {
      await banPhoneNumber(targetPhone, 'User deactivated/deleted by Admin (30-day ban)');
    }

    const cleanName = (user.name || '').replace(/^\[Deleted User\]\s*/i, '').trim();

    // Soft-delete by setting isDeleted to true
    const deletedUser = await prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
        isVerified: false,
        isAuthProcessing: false,
        aadhaarStatus: 'REJECTED',
        originalPhone: targetPhone,
        name: `[Deleted User] ${cleanName}`,
        phone: targetPhone ? `[BANNED_${Date.now()}]_${targetPhone}` : null
      } as any
    });

    try {
      await prisma.partner.updateMany({
        where: { userId: id },
        data: { isOnline: false }
      });
    } catch (e) {}

    try {
      const { getIO } = await import('../../socket');
      const io = getIO();
      if (io) {
        io.to(`user:${user.id}`).emit('user:deleted', { message: 'Your account has been deleted by Admin.' });
      }
    } catch (e) {}

    await logAdminAction(req, 'DELETE_USER', 'User', user.id, { originalName: user.name });

    res.json({ message: 'User deactivated/soft-deleted successfully', user: deletedUser });
  } catch (error) {
    console.error('[Admin Users Controller] deleteUser error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

export const createUser = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    if (req.admin?.role !== 'SUPERADMIN') {
      res.status(403).json({ error: 'Superadmin privileges required to create users' });
      return;
    }

    const { name, phone, email, role, gender } = req.body;

    if (!name || !phone) {
      res.status(400).json({ error: 'Name and phone number are required' });
      return;
    }

    const cleanPhone = phone.trim();
    const existingUser = await prisma.user.findFirst({
      where: { phone: cleanPhone }
    });

    if (existingUser) {
      res.status(400).json({ error: `User with phone ${cleanPhone} already exists` });
      return;
    }

    const userRole: Role = role === 'PARTNER' ? 'PARTNER' : 'CLIENT';

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        phone: cleanPhone,
        email: email ? email.trim() : null,
        gender: gender || null,
        role: userRole,
        isVerified: true,
        aadhaarStatus: 'VERIFIED',
        ...(userRole === 'PARTNER' ? {
          partner: {
            create: {
              walletBalance: 0,
              rating: 5.0,
              totalJobs: 0
            }
          }
        } : {})
      },
      include: { partner: true }
    });

    await logAdminAction(req, 'CREATE_USER', 'User', newUser.id, {
      name: newUser.name,
      phone: newUser.phone,
      role: newUser.role
    });

    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (error) {
    console.error('[Admin Users Controller] createUser error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const resetUserPassword = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const tempPassword = password && typeof password === 'string' && password.trim().length >= 6
      ? password.trim()
      : `UserPass${Math.floor(1000 + Math.random() * 9000)}!`;

    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        failedAttempts: 0,
        lockedUntil: null,
        loginMethod: 'BOTH'
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        loginMethod: true,
        isVerified: true
      }
    });

    await logAdminAction(req, 'RESET_USER_PASSWORD', 'User', updatedUser.id, {
      userName: updatedUser.name,
      userPhone: updatedUser.phone
    });

    res.json({
      message: 'User password reset successfully',
      user: updatedUser,
      temporaryPassword: tempPassword
    });
  } catch (error) {
    console.error('[Admin Users Controller] resetUserPassword error:', error);
    res.status(500).json({ error: 'Failed to reset user password' });
  }
};

export const updateUserAuthSettings = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { loginMethod, isVerified, aadhaarStatus } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updateData: any = {};
    if (loginMethod && ['OTP', 'PASSWORD', 'BOTH'].includes(loginMethod)) {
      updateData.loginMethod = loginMethod;
    }
    if (typeof isVerified === 'boolean') {
      updateData.isVerified = isVerified;
    }
    if (aadhaarStatus && ['PENDING', 'VERIFIED', 'REJECTED'].includes(aadhaarStatus)) {
      updateData.aadhaarStatus = aadhaarStatus;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        loginMethod: true,
        isVerified: true,
        aadhaarStatus: true
      }
    });

    await logAdminAction(req, 'UPDATE_USER_AUTH_SETTINGS', 'User', updatedUser.id, {
      changes: updateData
    });

    res.json({ message: 'User auth settings updated successfully', user: updatedUser });
  } catch (error) {
    console.error('[Admin Users Controller] updateUserAuthSettings error:', error);
    res.status(500).json({ error: 'Failed to update user auth settings' });
  }
};


