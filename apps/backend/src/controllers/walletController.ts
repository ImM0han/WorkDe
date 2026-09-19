import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import axios from 'axios';

const resolvePartnerId = async (req: AuthRequest): Promise<string | null> => {
  if (req.user?.partnerId) return req.user.partnerId;
  if (req.user?.id) {
    const partner = await prisma.partner.findUnique({ where: { userId: req.user.id } });
    if (partner) return partner.id;
  }
  return null;
};

export const getBalance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partnerId = await resolvePartnerId(req);
    if (!partnerId) {
      res.status(400).json({ error: 'Partner not found' });
      return;
    }

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      include: { bankAccounts: true }
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const partnerJobs = await prisma.job.findMany({
      where: {
        OR: [
          { partnerId },
          { partnerIds: { has: partnerId } }
        ]
      },
      select: { id: true }
    });
    const partnerJobIds = partnerJobs.map(j => j.id);

    const todayPayments = partnerJobIds.length > 0 ? await prisma.payment.aggregate({
      where: {
        jobId: { in: partnerJobIds },
        status: 'COMPLETED',
        createdAt: { gte: startOfToday }
      },
      _sum: { netAmount: true }
    }) : { _sum: { netAmount: 0 } };

    const weekPayments = partnerJobIds.length > 0 ? await prisma.payment.aggregate({
      where: {
        jobId: { in: partnerJobIds },
        status: 'COMPLETED',
        createdAt: { gte: startOfWeek }
      },
      _sum: { netAmount: true }
    }) : { _sum: { netAmount: 0 } };

    const payments = partnerJobIds.length > 0 ? await prisma.payment.findMany({
      where: { jobId: { in: partnerJobIds }, status: 'COMPLETED' },
      include: { job: { select: { category: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10
    }) : [];

    const withdrawals = await prisma.withdrawal.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const credits = payments.map(p => ({
      id: p.id,
      amount: p.netAmount ?? p.amount ?? 0,
      netAmount: p.netAmount ?? p.amount ?? 0,
      type: 'CREDIT',
      title: `Payment for ${p.job?.category || 'Service'}`,
      createdAt: p.createdAt
    }));

    const debits = withdrawals.map(w => ({
      id: w.id,
      amount: w.amount ?? 0,
      netAmount: w.amount ?? 0,
      type: 'DEBIT',
      title: `Withdrawal to ${w.bankAccount || 'Bank'}`,
      bankAccount: w.bankAccount,
      status: w.status,
      utrNumber: w.utrNumber,
      rejectionReason: w.rejectionReason,
      createdAt: w.createdAt
    }));

    const transactions = [...credits, ...debits]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    res.json({
      balance: partner?.walletBalance || 0,
      todayEarnings: todayPayments._sum.netAmount || 0,
      weekEarnings: weekPayments._sum.netAmount || 0,
      transactions
    });
  } catch (error) {
    console.error('getBalance error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet balance' });
  }
};

export const withdrawFunds = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partnerId = await resolvePartnerId(req);
    const { amount, bankId } = req.body;

    if (!partnerId) {
      res.status(400).json({ error: 'Partner not found' });
      return;
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ error: 'Invalid withdrawal amount' });
      return;
    }

    const partner = await prisma.partner.findUnique({ 
      where: { id: partnerId },
      include: { user: true }
    });
    
    if (!partner) {
      res.status(404).json({ error: 'Partner profile not found' });
      return;
    }

    if (partner.walletBalance < amount) {
      res.status(400).json({ error: 'Insufficient funds in wallet' });
      return;
    }

    // Get linked bank/UPI account
    let bank = null;
    if (bankId) {
      bank = await prisma.bankAccount.findUnique({ where: { id: bankId } });
    } else {
      bank = await prisma.bankAccount.findFirst({
        where: { partnerId, isDefault: true }
      });
      if (!bank) {
        bank = await prisma.bankAccount.findFirst({
          where: { partnerId }
        });
      }
    }

    if (!bank) {
      res.status(400).json({ error: 'No linked bank account or UPI details found. Please add one first.' });
      return;
    }

    // Format account representation for withdrawal record
    const contactName = (partner.user.name && partner.user.name.trim().length > 0)
      ? partner.user.name.trim()
      : (partner.user.phone ? `Partner ${partner.user.phone.slice(-4)}` : 'Partner User');

    let bankAccountStr = '';
    if (bank.ifsc === 'UPI') {
      bankAccountStr = `UPI: ${bank.accountNumber}`;
    } else {
      bankAccountStr = `${bank.holderName || contactName} (A/C: ${bank.accountNumber}, IFSC: ${bank.ifsc})`;
    }

    // Atomic transaction: Deduct partner balance immediately and create PENDING withdrawal request
    const [updatedPartner, newWithdrawal] = await prisma.$transaction([
      prisma.partner.update({
        where: { id: partnerId },
        data: { walletBalance: { decrement: amount } }
      }),
      prisma.withdrawal.create({
        data: {
          partnerId,
          amount,
          bankAccount: bankAccountStr,
          status: 'PENDING'
        }
      })
    ]);

    // Notify partner socket rooms
    try {
      const { getIO } = await import('../socket');
      const io = getIO();
      if (io) {
        io.to(`user:${partner.userId}`).emit('withdrawal:created', { withdrawal: newWithdrawal });
        io.to(`partner:${partnerId}`).emit('withdrawal:created', { withdrawal: newWithdrawal });
      }
    } catch (e) {}

    res.json({
      message: 'Withdrawal request submitted successfully',
      withdrawal: {
        id: newWithdrawal.id,
        amount: newWithdrawal.amount,
        bankAccount: newWithdrawal.bankAccount,
        status: newWithdrawal.status,
        createdAt: newWithdrawal.createdAt
      },
      remainingBalance: updatedPartner.walletBalance
    });
  } catch (error: any) {
    console.error('[Withdrawal Request error]:', error.message || error);
    res.status(500).json({ error: 'Failed to submit withdrawal request' });
  }
};

export const addBankAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partnerId = await resolvePartnerId(req);
    const { accountNumber, ifsc, holderName } = req.body;

    if (!partnerId) {
      res.status(400).json({ error: 'Partner not found' });
      return;
    }

    const bankAccount = await prisma.bankAccount.create({
      data: {
        partnerId,
        accountNumber,
        ifsc,
        holderName,
        isDefault: true
      }
    });

    res.json(bankAccount);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add bank account' });
  }
};

export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partnerId = await resolvePartnerId(req);
    if (!partnerId) {
      res.status(400).json({ error: 'Partner not found' });
      return;
    }

    // 1. Fetch all jobs belonging to this partner
    const partnerJobs = await prisma.job.findMany({
      where: {
        OR: [
          { partnerId: partnerId },
          { partnerIds: { has: partnerId } }
        ]
      },
      select: {
        id: true,
        category: true,
        rate: true,
        billableAmount: true,
        status: true,
        completedAt: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const partnerJobIds = partnerJobs.map(j => j.id);

    // 2. Fetch payments linked to partner's job IDs
    const payments = partnerJobIds.length > 0 ? await prisma.payment.findMany({
      where: {
        jobId: { in: partnerJobIds }
      },
      include: {
        job: {
          select: {
            id: true,
            category: true,
            rate: true,
            billableAmount: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    }) : [];

    // 3. Fetch withdrawals for partner
    const withdrawals = await prisma.withdrawal.findMany({
      where: { partnerId: partnerId },
      orderBy: { createdAt: 'desc' }
    });

    const paymentJobIds = new Set(payments.map(p => p.jobId));

    const paymentCredits = payments.map(p => {
      const amt = p.netAmount ?? p.amount ?? 0;
      return {
        id: p.id,
        jobId: p.jobId,
        amount: amt,
        netAmount: amt,
        type: 'CREDIT',
        title: `Payment for ${p.job?.category || 'Service'}`,
        createdAt: p.createdAt,
        status: p.status === 'COMPLETED' ? 'COMPLETED' : (p.job?.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING')
      };
    });

    // Add completed or pending-payment jobs that don't have a Payment model record yet
    const missingJobCredits = partnerJobs
      .filter(j => ['COMPLETED', 'COMPLETED_PENDING_PAYMENT'].includes(j.status) && !paymentJobIds.has(j.id))
      .map(j => {
        const amt = j.billableAmount || j.rate || 0;
        return {
          id: `job_${j.id}`,
          jobId: j.id,
          amount: amt,
          netAmount: amt,
          type: 'CREDIT',
          title: `Payment for ${j.category || 'Service'}`,
          createdAt: j.completedAt || j.createdAt,
          status: j.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING'
        };
      });

    const debits = withdrawals.map(w => ({
      id: w.id,
      amount: w.amount ?? 0,
      netAmount: w.amount ?? 0,
      type: 'DEBIT',
      title: `Withdrawal to ${w.bankAccount || 'Bank'}`,
      bankAccount: w.bankAccount,
      status: w.status,
      utrNumber: w.utrNumber,
      rejectionReason: w.rejectionReason,
      createdAt: w.createdAt
    }));

    const transactions = [...paymentCredits, ...missingJobCredits, ...debits].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json(transactions);
  } catch (error) {
    console.error('getTransactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

export const getTransactionById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partnerId = await resolvePartnerId(req);
    const { id } = req.params;

    if (!partnerId) {
      res.status(400).json({ error: 'Partner not found' });
      return;
    }

    // Check synthetic job ID (job_xxx)
    if (id.startsWith('job_')) {
      const realJobId = id.replace(/^job_/, '');
      const job = await prisma.job.findFirst({
        where: {
          id: realJobId,
          OR: [
            { partnerId: partnerId },
            { partnerIds: { has: partnerId } }
          ]
        }
      });
      if (job) {
        res.json({
          id: `job_${job.id}`,
          amount: job.billableAmount || job.rate || 0,
          type: 'CREDIT',
          title: `Payment for ${job.category || 'Service'}`,
          createdAt: job.completedAt || job.createdAt,
          status: job.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING'
        });
        return;
      }
    }

    // Check payments
    const payment = await prisma.payment.findFirst({
      where: {
        id,
        job: {
          OR: [
            { partnerId: partnerId },
            { partnerIds: { has: partnerId } }
          ]
        }
      },
      include: {
        job: {
          select: {
            category: true
          }
        }
      }
    });

    if (payment) {
      res.json({
        id: payment.id,
        amount: payment.netAmount,
        type: 'CREDIT',
        title: `Payment for ${payment.job?.category || 'Service'}`,
        createdAt: payment.createdAt,
        status: payment.status
      });
      return;
    }

    // Check withdrawals
    const withdrawal = await prisma.withdrawal.findFirst({
      where: {
        id,
        partnerId
      }
    });

    if (withdrawal) {
      res.json({
        id: withdrawal.id,
        amount: withdrawal.amount,
        type: 'DEBIT',
        title: `Withdrawal to ${withdrawal.bankAccount || 'Bank'}`,
        bankAccount: withdrawal.bankAccount,
        utrNumber: withdrawal.utrNumber,
        rejectionReason: withdrawal.rejectionReason,
        createdAt: withdrawal.createdAt,
        status: withdrawal.status
      });
      return;
    }

    res.status(404).json({ error: 'Transaction not found' });
  } catch (error) {
    console.error('getTransactionById error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction details' });
  }
};

