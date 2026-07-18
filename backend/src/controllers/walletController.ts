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
    const { amount, bankId } = req.body;

    if (!partnerId) {
      res.status(400).json({ error: 'Partner not found' });
      return;
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ error: 'Invalid withdrawal amount' });
      return;
    }

    const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner || partner.walletBalance < amount) {
      res.status(400).json({ error: 'Insufficient funds' });
      return;
    }

    // Get bank account representation
    let bankAccountStr = 'Bank Account';
    if (bankId) {
      const bank = await prisma.bankAccount.findUnique({ where: { id: bankId } });
      if (bank) {
        bankAccountStr = `**** ${bank.accountNumber.slice(-4)}`;
      }
    } else {
      // Find default bank account for partner
      const defaultBank = await prisma.bankAccount.findFirst({
        where: { partnerId, isDefault: true }
      });
      if (defaultBank) {
        bankAccountStr = `**** ${defaultBank.accountNumber.slice(-4)}`;
      }
    }

    // Deduct balance and create withdrawal record
    await prisma.$transaction([
      prisma.partner.update({
        where: { id: partnerId },
        data: { walletBalance: { decrement: amount } }
      }),
      prisma.withdrawal.create({
        data: {
          partnerId,
          amount,
          bankAccount: bankAccountStr,
          status: 'COMPLETED'
        }
      })
    ]);

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

    const withdrawals = await prisma.withdrawal.findMany({
      where: {
        partnerId: partnerId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const credits = payments.map(p => ({
      id: p.id,
      amount: p.netAmount,
      type: 'CREDIT',
      title: `Payment for ${p.job.category}`,
      createdAt: p.createdAt
    }));

    const debits = withdrawals.map(w => ({
      id: w.id,
      amount: w.amount,
      type: 'DEBIT',
      title: `Withdrawal to Bank`,
      createdAt: w.createdAt
    }));

    const transactions = [...credits, ...debits].sort(
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
    const partnerId = req.user?.partnerId;
    const { id } = req.params;

    if (!partnerId) {
      res.status(400).json({ error: 'Partner not found' });
      return;
    }

    // Check payments
    const payment = await prisma.payment.findFirst({
      where: {
        id,
        job: {
          partnerId
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
        title: `Payment for ${payment.job.category}`,
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
        title: `Withdrawal to Bank`,
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

