import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';

export const getBalance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partnerId = req.user?.partnerId;
    if (!partnerId) {
      res.status(400).json({ error: 'Partner not found' });
      return;
    }

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      include: { bankAccounts: true }
    });

    // Mock transactions
    const transactions = [
      { id: 'txn_123', amount: 800, type: 'CREDIT', title: 'Payment for Job #1234', date: 'Oct 24, 2023' },
      { id: 'txn_124', amount: -200, type: 'DEBIT', title: 'Withdrawal to Bank', date: 'Oct 22, 2023' },
    ];

    res.json({
      balance: partner?.walletBalance || 0,
      todayEarnings: 800,
      weekEarnings: 2450,
      transactions
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wallet balance' });
  }
};

export const withdrawFunds = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partnerId = req.user?.partnerId;
    const { amount } = req.body;

    if (!partnerId) {
      res.status(400).json({ error: 'Partner not found' });
      return;
    }

    const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner || partner.walletBalance < amount) {
      res.status(400).json({ error: 'Insufficient funds' });
      return;
    }

    // In a real app, call Razorpay payout API here
    
    // Deduct balance
    await prisma.partner.update({
      where: { id: partnerId },
      data: { walletBalance: { decrement: amount } }
    });

    res.json({ message: 'Withdrawal initiated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
};

export const addBankAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partnerId = req.user?.partnerId;
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
    const partnerId = req.user?.partnerId;
    if (!partnerId) {
      res.status(400).json({ error: 'Partner not found' });
      return;
    }

    const payments = await prisma.payment.findMany({
      where: {
        job: {
          partnerId: partnerId
        },
        status: 'COMPLETED'
      },
      include: {
        job: {
          select: {
            category: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const transactions = payments.map(p => ({
      id: p.id,
      amount: p.netAmount,
      type: 'CREDIT',
      title: `Payment for ${p.job.category}`,
      createdAt: p.createdAt
    }));

    res.json(transactions);
  } catch (error) {
    console.error('getTransactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

