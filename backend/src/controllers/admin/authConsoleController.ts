import { Response } from 'express';
import { prisma } from '../../utils/prisma';
import { AdminAuthRequest, logAdminAction } from '../../middleware/adminAuth';
import bcrypt from 'bcrypt';
import { banPhoneNumber, unbanPhoneNumber } from '../../utils/bannedPhoneCheck';

export const listAuthUsers = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const statusFilter = (req.query.status as string || 'ALL').toUpperCase();
    const search = req.query.search as string | undefined;

    // Fetch tab counters for PENDING, PROCESSING, VERIFIED, DELETED
    const [pendingCount, processingCount, verifiedCount, deletedCount] = await Promise.all([
      prisma.user.count({ where: { isDeleted: false, isVerified: false, isAuthProcessing: false } as any }),
      prisma.user.count({ where: { isDeleted: false, isVerified: false, isAuthProcessing: true } as any }),
      prisma.user.count({ where: { isDeleted: false, isVerified: true } as any }),
      prisma.user.count({ where: { isDeleted: true } as any })
    ]);

    const andConditions: any[] = [];

    if (statusFilter === 'PENDING') {
      andConditions.push({ isDeleted: false, isVerified: false, isAuthProcessing: false });
    } else if (statusFilter === 'PROCESSING') {
      andConditions.push({ isDeleted: false, isVerified: false, isAuthProcessing: true });
    } else if (statusFilter === 'VERIFIED') {
      andConditions.push({ isDeleted: false, isVerified: true });
    } else if (statusFilter === 'DELETED') {
      andConditions.push({ isDeleted: true });
    }

    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { originalPhone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    const where: any = andConditions.length > 0 ? { AND: andConditions } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          phone: true,
          originalPhone: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true,
          isVerified: true,
          isAuthProcessing: true,
          isDeleted: true,
          loginMethod: true,
          passwordHash: true,
          failedAttempts: true,
          lockedUntil: true,
          createdAt: true,
          partner: {
            select: {
              id: true,
              walletBalance: true,
              rating: true,
              totalJobs: true
            }
          }
        } as any,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    const formattedUsers = users.map((u: any) => {
      let derivedStatus = 'VERIFIED';
      if (u.isDeleted) {
        derivedStatus = 'DELETED';
      } else if (u.isVerified) {
        derivedStatus = 'VERIFIED';
      } else if (u.isAuthProcessing) {
        derivedStatus = 'PROCESSING';
      } else {
        derivedStatus = 'PENDING';
      }

      const displayPhone = u.originalPhone || (u.phone ? u.phone.replace(/^\[BANNED_\d+\]_/, '') : 'No Phone');
      const displayName = (u.name || '').replace(/^\[Deleted User\]\s*/i, '').trim();

      return {
        ...u,
        name: displayName || u.name,
        phone: displayPhone,
        hasPassword: !!u.passwordHash,
        authStatus: derivedStatus
      };
    });

    res.json({
      users: formattedUsers,
      counts: {
        pending: pendingCount,
        processing: processingCount,
        verified: verifiedCount,
        deleted: deletedCount,
        total: pendingCount + processingCount + verifiedCount + deletedCount
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Auth Console] listAuthUsers error:', error);
    res.status(500).json({ error: 'Failed to fetch user authentication queue' });
  }
};

export const markUserAuthProcessing = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isAuthProcessing: true
      }
    });

    await logAdminAction(req, 'MARK_AUTH_PROCESSING', 'User', id, { userName: user.name });
    res.json({ message: 'User moved to processing queue', user: updatedUser });
  } catch (error) {
    console.error('[Auth Console] markUserAuthProcessing error:', error);
    res.status(500).json({ error: 'Failed to move user auth to processing' });
  }
};

export const verifyUserAuth = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { password, loginMethod } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updateData: any = {
      isVerified: true,
      isAuthProcessing: false,
      loginMethod: loginMethod || 'BOTH',
      failedAttempts: 0,
      lockedUntil: null
    };

    let tempPassword: string | null = null;

    // If custom password provided by admin, update password hash
    if (password && typeof password === 'string' && password.trim().length >= 6) {
      tempPassword = password.trim();
      updateData.passwordHash = await bcrypt.hash(tempPassword, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData
    });

    await logAdminAction(req, 'VERIFY_USER_AUTH', 'User', id, {
      userName: user.name,
      userPhone: user.phone
    });

    res.json({
      message: 'User authentication verified successfully',
      user: updatedUser,
      temporaryPassword: tempPassword
    });
  } catch (error) {
    console.error('[Auth Console] verifyUserAuth error:', error);
    res.status(500).json({ error: 'Failed to verify user authentication' });
  }
};

export const editVerifiedUserPassword = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updatedPass = newPassword && typeof newPassword === 'string' && newPassword.trim().length >= 6
      ? newPassword.trim()
      : `NewPass${Math.floor(1000 + Math.random() * 9000)}!`;

    const passwordHash = await bcrypt.hash(updatedPass, 12);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        failedAttempts: 0,
        lockedUntil: null
      }
    });

    await logAdminAction(req, 'EDIT_VERIFIED_USER_PASSWORD', 'User', id, {
      userName: user.name,
      userPhone: user.phone
    });

    res.json({
      message: 'Verified user password updated successfully',
      user: updatedUser,
      temporaryPassword: updatedPass
    });
  } catch (error) {
    console.error('[Auth Console] editVerifiedUserPassword error:', error);
    res.status(500).json({ error: 'Failed to edit verified user password' });
  }
};

export const rejectUserAuth = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isVerified: false,
        isAuthProcessing: false,
        failedAttempts: 5,
        lockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });

    await logAdminAction(req, 'REJECT_USER_AUTH', 'User', id, {
      userName: user.name,
      reason: reason || 'Authentication rejected by Admin'
    });

    res.json({ message: 'User authentication rejected', user: updatedUser });
  } catch (error) {
    console.error('[Auth Console] rejectUserAuth error:', error);
    res.status(500).json({ error: 'Failed to reject user authentication' });
  }
};

export const deleteAndBanUser = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user: any = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const targetPhone = user.originalPhone || (user.phone ? user.phone.replace(/^\[BANNED_\d+\]_/, '') : null);

    let bannedUntil: Date | null = null;
    if (targetPhone) {
      bannedUntil = await banPhoneNumber(
        targetPhone,
        reason || 'User deleted and banned from Auth Console (30 days)'
      );
    }

    const cleanName = (user.name || '').replace(/^\[Deleted User\]\s*/i, '').trim();

    // Soft-delete user and update flags
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
        isVerified: false,
        isAuthProcessing: false,
        aadhaarStatus: 'REJECTED',
        originalPhone: targetPhone,
        name: `[Deleted User] ${cleanName}`,
        phone: targetPhone ? `[BANNED_${Date.now()}]_${targetPhone}` : null,
        passwordHash: null,
        failedAttempts: 99,
        lockedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      } as any
    });

    // If user has a partner profile, set isOnline to false
    try {
      await prisma.partner.updateMany({
        where: { userId: id },
        data: { isOnline: false }
      });
    } catch (e) {}

    // Emit real-time socket signal to force client session logout
    try {
      const { getIO } = await import('../../socket');
      const io = getIO();
      if (io) {
        io.to(`user:${user.id}`).emit('user:deleted', { message: 'Your account has been deleted by Admin.' });
      }
    } catch (e) {}

    await logAdminAction(req, 'DELETE_AND_BAN_USER', 'User', id, {
      originalName: cleanName,
      originalPhone: targetPhone,
      bannedUntil,
      reason: reason || 'Account deleted from Auth Console'
    });

    res.json({
      message: `User "${cleanName}" deleted and phone number ${targetPhone || ''} banned for 30 days.`,
      bannedUntil,
      user: updatedUser
    });
  } catch (error) {
    console.error('[Auth Console] deleteAndBanUser error:', error);
    res.status(500).json({ error: 'Failed to delete and ban user' });
  }
};

export const revokeDeleteUser = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user: any = await prisma.user.findUnique({ 
      where: { id },
      include: { partner: true }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const cleanPhone = user.originalPhone || (user.phone ? user.phone.replace(/^\[BANNED_\d+\]_/, '') : null);

    if (cleanPhone) {
      await unbanPhoneNumber(cleanPhone);
    }

    const cleanName = (user.name || '').replace(/^\[Deleted User\]\s*/i, '').trim();

    // To ensure the phone number acts as a FRESH NEW USER upon re-registration/login,
    // clean up associated partner profile and relations, then completely delete the old User record.
    if (user.partner) {
      const partnerId = user.partner.id;
      await prisma.bankAccount.deleteMany({ where: { partnerId } }).catch(() => {});
      await prisma.certificate.deleteMany({ where: { partnerId } }).catch(() => {});
      await prisma.withdrawal.deleteMany({ where: { partnerId } }).catch(() => {});
      await prisma.partner.delete({ where: { id: partnerId } }).catch(() => {});
    }

    await prisma.savedAddress.deleteMany({ where: { userId: id } }).catch(() => {});
    await prisma.notification.deleteMany({ where: { userId: id } }).catch(() => {});
    await prisma.user.delete({ where: { id } });

    await logAdminAction(req, 'REVOKE_DELETE_USER', 'User', id, {
      restoredName: cleanName,
      restoredPhone: cleanPhone,
      actionNote: 'Old account record removed completely to allow fresh new user creation'
    });

    res.json({
      message: `Deletion revoked for "${cleanName}". Old account data has been completely cleared. Phone number ${cleanPhone || ''} can now register as a fresh new user.`,
      phone: cleanPhone,
      isFreshUser: true
    });
  } catch (error) {
    console.error('[Auth Console] revokeDeleteUser error:', error);
    res.status(500).json({ error: 'Failed to revoke user deletion' });
  }
};
