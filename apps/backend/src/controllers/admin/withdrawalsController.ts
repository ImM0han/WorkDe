import { Response } from 'express';
import { prisma } from '../../utils/prisma';
import { AdminAuthRequest, logAdminAction } from '../../middleware/adminAuth';
import { WithdrawalStatus } from '@prisma/client';

export const listWithdrawals = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const status = req.query.status as WithdrawalStatus | undefined;
    const partnerId = req.query.partnerId as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const where: any = {};
    if (status && ['PENDING', 'PROCESSING', 'PAID', 'COMPLETED', 'FAILED', 'REJECTED', 'CANCELLED'].includes(status)) {
      where.status = status;
    }
    if (partnerId) {
      where.partnerId = partnerId;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        include: {
          partner: {
            select: {
              id: true,
              walletBalance: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  email: true
                }
              },
              bankAccounts: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.withdrawal.count({ where })
    ]);

    // Look up processedById admin usernames
    const processedByIds = Array.from(
      new Set(withdrawals.map((w) => w.processedById).filter(Boolean) as string[])
    );

    const adminUsers = processedByIds.length > 0
      ? await prisma.adminUser.findMany({
          where: { id: { in: processedByIds } },
          select: { id: true, username: true }
        })
      : [];

    const adminMap = new Map(adminUsers.map((a) => [a.id, a.username]));

    const enrichedWithdrawals = withdrawals.map((w) => {
      const defaultBank = w.partner.bankAccounts.find((b) => b.isDefault) || w.partner.bankAccounts[0] || null;
      return {
        ...w,
        processedByUsername: w.processedById ? adminMap.get(w.processedById) || 'Unknown Admin' : null,
        defaultBankAccount: defaultBank
      };
    });

    res.json({
      withdrawals: enrichedWithdrawals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Admin Withdrawals Controller] listWithdrawals error:', error);
    res.status(500).json({ error: 'Failed to list withdrawal requests' });
  }
};

export const getWithdrawal = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id },
      include: {
        partner: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true
              }
            },
            bankAccounts: true
          }
        }
      }
    });

    if (!withdrawal) {
      res.status(404).json({ error: 'Withdrawal request not found' });
      return;
    }

    // Fetch recent withdrawal history for this partner to detect anomalies
    const recentHistory = await prisma.withdrawal.findMany({
      where: {
        partnerId: withdrawal.partnerId,
        id: { not: withdrawal.id }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    let processedByUsername: string | null = null;
    if (withdrawal.processedById) {
      const admin = await prisma.adminUser.findUnique({
        where: { id: withdrawal.processedById },
        select: { username: true }
      });
      processedByUsername = admin?.username || null;
    }

    res.json({
      withdrawal,
      processedByUsername,
      recentHistory
    });
  } catch (error) {
    console.error('[Admin Withdrawals Controller] getWithdrawal error:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawal details' });
  }
};

export const markProcessing = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const withdrawal = await prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) {
      res.status(404).json({ error: 'Withdrawal request not found' });
      return;
    }

    if (withdrawal.status !== 'PENDING') {
      res.status(400).json({
        error: `Cannot mark processing. Withdrawal status is currently "${withdrawal.status}" (must be PENDING).`
      });
      return;
    }

    const updated = await prisma.withdrawal.update({
      where: { id },
      data: {
        status: 'PROCESSING',
        processedById: req.admin?.id
      }
    });

    await logAdminAction(req, 'MARK_PROCESSING_WITHDRAWAL', 'Withdrawal', updated.id, {
      amount: updated.amount,
      partnerId: updated.partnerId
    });

    res.json({ message: 'Withdrawal marked as PROCESSING', withdrawal: updated });
  } catch (error) {
    console.error('[Admin Withdrawals Controller] markProcessing error:', error);
    res.status(500).json({ error: 'Failed to update withdrawal status' });
  }
};

export const markPaid = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { utrNumber } = req.body;

    if (!utrNumber || typeof utrNumber !== 'string' || utrNumber.trim().length === 0) {
      res.status(400).json({ error: 'UTR / Transaction Reference Number is required to mark as PAID' });
      return;
    }

    const cleanUtr = utrNumber.trim();

    const withdrawal = await prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) {
      res.status(404).json({ error: 'Withdrawal request not found' });
      return;
    }

    // Idempotency check: can only mark paid if currently PENDING or PROCESSING
    if (withdrawal.status !== 'PENDING' && withdrawal.status !== 'PROCESSING') {
      res.status(400).json({
        error: `Cannot mark paid. Withdrawal request is already "${withdrawal.status}".`
      });
      return;
    }

    const updated = await prisma.withdrawal.update({
      where: { id },
      data: {
        status: 'PAID',
        utrNumber: cleanUtr,
        processedById: req.admin?.id,
        processedAt: new Date()
      }
    });

    await logAdminAction(req, 'PAY_WITHDRAWAL', 'Withdrawal', updated.id, {
      utrNumber: cleanUtr,
      amount: updated.amount,
      partnerId: updated.partnerId
    });

    try {
      const { getIO } = await import('../../socket');
      const io = getIO();
      if (io) {
        const partner = await prisma.partner.findUnique({ where: { id: updated.partnerId } });
        if (partner) {
          io.to(`user:${partner.userId}`).emit('withdrawal:updated', { withdrawal: updated });
        }
        io.to(`partner:${updated.partnerId}`).emit('withdrawal:updated', { withdrawal: updated });
      }
    } catch (e) {}

    res.json({ message: 'Withdrawal marked as PAID successfully', withdrawal: updated });
  } catch (error) {
    console.error('[Admin Withdrawals Controller] markPaid error:', error);
    res.status(500).json({ error: 'Failed to process withdrawal payment' });
  }
};

export const rejectWithdrawal = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim().length === 0) {
      res.status(400).json({ error: 'Rejection reason is required' });
      return;
    }

    const cleanReason = rejectionReason.trim();

    const withdrawal = await prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) {
      res.status(404).json({ error: 'Withdrawal request not found' });
      return;
    }

    // Idempotency check: cannot reject if already PAID or REJECTED
    if (withdrawal.status === 'PAID' || withdrawal.status === 'REJECTED') {
      res.status(400).json({
        error: `Cannot reject. Withdrawal request is already "${withdrawal.status}".`
      });
      return;
    }

    // Atomic transaction: update withdrawal status AND refund amount back to Partner.walletBalance
    const [updatedWithdrawal, updatedPartner] = await prisma.$transaction([
      prisma.withdrawal.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason: cleanReason,
          processedById: req.admin?.id,
          processedAt: new Date()
        }
      }),
      prisma.partner.update({
        where: { id: withdrawal.partnerId },
        data: {
          walletBalance: { increment: withdrawal.amount }
        }
      })
    ]);

    await logAdminAction(req, 'REJECT_WITHDRAWAL', 'Withdrawal', updatedWithdrawal.id, {
      rejectionReason: cleanReason,
      amount: updatedWithdrawal.amount,
      partnerId: updatedWithdrawal.partnerId,
      refundedBalance: updatedPartner.walletBalance
    });

    try {
      const { getIO } = await import('../../socket');
      const io = getIO();
      if (io) {
        const partner = await prisma.partner.findUnique({ where: { id: updatedWithdrawal.partnerId } });
        if (partner) {
          io.to(`user:${partner.userId}`).emit('withdrawal:updated', { withdrawal: updatedWithdrawal });
        }
        io.to(`partner:${updatedWithdrawal.partnerId}`).emit('withdrawal:updated', { withdrawal: updatedWithdrawal });
      }
    } catch (e) {}

    res.json({
      message: 'Withdrawal request rejected and funds refunded to partner wallet',
      withdrawal: updatedWithdrawal,
      newPartnerBalance: updatedPartner.walletBalance
    });
  } catch (error) {
    console.error('[Admin Withdrawals Controller] rejectWithdrawal error:', error);
    res.status(500).json({ error: 'Failed to reject withdrawal request' });
  }
};
