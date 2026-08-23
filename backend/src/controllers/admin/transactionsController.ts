import { Response } from 'express';
import { prisma } from '../../utils/prisma';
import { AdminAuthRequest, logAdminAction } from '../../middleware/adminAuth';
import { PaymentStatus, JobStatus, DisputeStatus } from '@prisma/client';

export const listPayments = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const status = req.query.status as PaymentStatus | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const where: any = {};
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          job: {
            select: {
              id: true,
              category: true,
              description: true,
              client: { select: { id: true, name: true, phone: true } },
              partner: { select: { id: true, user: { select: { name: true, phone: true } } } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.payment.count({ where })
    ]);

    res.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Admin Transactions Controller] listPayments error:', error);
    res.status(500).json({ error: 'Failed to list payments' });
  }
};

export const listJobs = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const status = req.query.status as JobStatus | undefined;
    const category = req.query.category as string | undefined;

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = { contains: category, mode: 'insensitive' };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, phone: true } },
          partner: { select: { id: true, user: { select: { name: true, phone: true } } } },
          payment: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.job.count({ where })
    ]);

    res.json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Admin Transactions Controller] listJobs error:', error);
    res.status(500).json({ error: 'Failed to list jobs' });
  }
};

export const listDisputes = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const status = req.query.status as DisputeStatus | undefined;

    const where: any = {};
    if (status) where.status = status;

    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          raisedBy: { select: { id: true, name: true, phone: true, role: true } },
          job: { select: { id: true, category: true, description: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.dispute.count({ where })
    ]);

    res.json({
      disputes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Admin Transactions Controller] listDisputes error:', error);
    res.status(500).json({ error: 'Failed to list disputes' });
  }
};

export const resolveDispute = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { resolution, status } = req.body;

    if (!resolution || typeof resolution !== 'string') {
      res.status(400).json({ error: 'Resolution details are required' });
      return;
    }

    const dispute = await prisma.dispute.findUnique({ where: { id } });
    if (!dispute) {
      res.status(404).json({ error: 'Dispute ticket not found' });
      return;
    }

    const targetStatus: DisputeStatus = status === 'CLOSED' ? 'CLOSED' : 'RESOLVED';

    const updatedDispute = await prisma.dispute.update({
      where: { id },
      data: {
        resolution,
        status: targetStatus,
        resolvedAt: new Date()
      }
    });

    await logAdminAction(req, 'RESOLVE_DISPUTE', 'Dispute', updatedDispute.id, {
      ticketNumber: updatedDispute.ticketNumber,
      resolution,
      status: targetStatus
    });

    res.json({ message: 'Dispute resolved successfully', dispute: updatedDispute });
  } catch (error) {
    console.error('[Admin Transactions Controller] resolveDispute error:', error);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
};

export const getUserTransactionHistory = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        partner: true
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const partnerId = user.partner?.id;

    const [clientJobs, partnerJobs, disputes, notifications] = await Promise.all([
      prisma.job.findMany({
        where: { clientId: userId },
        include: { payment: true },
        orderBy: { createdAt: 'desc' }
      }),
      partnerId ? prisma.job.findMany({
        where: { partnerId },
        include: { payment: true },
        orderBy: { createdAt: 'desc' }
      }) : [],
      prisma.dispute.findMany({
        where: { raisedById: userId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    ]);

    let withdrawals: any[] = [];
    let certificates: any[] = [];
    let bankAccounts: any[] = [];

    if (partnerId) {
      [withdrawals, certificates, bankAccounts] = await Promise.all([
        prisma.withdrawal.findMany({
          where: { partnerId },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.certificate.findMany({
          where: { partnerId },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.bankAccount.findMany({
          where: { partnerId }
        })
      ]);
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      },
      partner: user.partner ? {
        id: user.partner.id,
        walletBalance: user.partner.walletBalance,
        rating: user.partner.rating,
        totalJobs: user.partner.totalJobs
      } : null,
      summary: {
        totalClientJobs: clientJobs.length,
        totalPartnerJobs: partnerJobs.length,
        totalWithdrawals: withdrawals.length,
        totalDisputes: disputes.length
      },
      clientJobs,
      partnerJobs,
      withdrawals,
      disputes,
      certificates,
      bankAccounts,
      notifications
    });
  } catch (error) {
    console.error('[Admin Transactions Controller] getUserTransactionHistory error:', error);
    res.status(500).json({ error: 'Failed to fetch user transaction history' });
  }
};
