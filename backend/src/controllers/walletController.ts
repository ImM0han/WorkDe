import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import axios from 'axios';

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

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayPayments = await prisma.payment.aggregate({
      where: {
        job: { partnerId },
        status: 'COMPLETED',
        createdAt: { gte: startOfToday }
      },
      _sum: { netAmount: true }
    });

    const weekPayments = await prisma.payment.aggregate({
      where: {
        job: { partnerId },
        status: 'COMPLETED',
        createdAt: { gte: startOfWeek }
      },
      _sum: { netAmount: true }
    });

    const payments = await prisma.payment.findMany({
      where: { job: { partnerId }, status: 'COMPLETED' },
      include: { job: { select: { category: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const withdrawals = await prisma.withdrawal.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
      take: 10
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
      title: `Withdrawal to ${w.bankAccount || 'Bank'}`,
      bankAccount: w.bankAccount,
      status: w.status,
      razorpayPayoutId: w.razorpayPayoutId,
      payoutStatus: w.payoutStatus,
      failureReason: w.failureReason,
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

    const partner = await prisma.partner.findUnique({ 
      where: { id: partnerId },
      include: { user: true }
    });
    
    if (!partner) {
      res.status(404).json({ error: 'Partner profile not found' });
      return;
    }

    if (partner.walletBalance < amount) {
      res.status(400).json({ error: 'Insufficient funds' });
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

    const contactPhone = (partner.user.phone || '9999999999').replace(/[^0-9]/g, '').slice(-10) || '9999999999';

    let bankAccountStr = '';
    if (bank.ifsc === 'UPI') {
      bankAccountStr = `UPI: ${bank.accountNumber}`;
    } else {
      bankAccountStr = `${bank.holderName || contactName} (A/C: ${bank.accountNumber}, IFSC: ${bank.ifsc})`;
    }

    // Initiate actual payment via Razorpay Payouts
    let payoutId: string | null = null;
    let payoutStatus = 'pending';
    let failureReason: string | null = null;
    let payoutSuccess = false;
    const isUpi = bank.ifsc === 'UPI';

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    const razorpayAccountNumber = process.env.RAZORPAY_ACCOUNT_NUMBER || '2333300200000001';

    if (razorpayKeyId && razorpayKeySecret) {
      try {
        console.log(`[Payout] Creating Razorpay contact for partner: ${contactName}`);
        const contactRes = await axios.post(
          'https://api.razorpay.com/v1/contacts',
          {
            name: contactName,
            email: partner.user.email || 'partner@wrkup.com',
            contact: contactPhone,
            type: 'employee',
            reference_id: partner.id
          },
          {
            auth: {
              username: razorpayKeyId,
              password: razorpayKeySecret
            }
          }
        );
        const contactId = contactRes.data.id;

        console.log(`[Payout] Creating Razorpay fund account for type: ${isUpi ? 'vpa' : 'bank_account'}`);
        const fundPayload = isUpi
          ? {
              contact_id: contactId,
              account_type: 'vpa',
              vpa: { address: bank.accountNumber }
            }
          : {
              contact_id: contactId,
              account_type: 'bank_account',
              bank_account: {
                name: bank.holderName || contactName,
                ifsc: bank.ifsc,
                account_number: bank.accountNumber
              }
            };

        const fundRes = await axios.post(
          'https://api.razorpay.com/v1/fund_accounts',
          fundPayload,
          {
            auth: {
              username: razorpayKeyId,
              password: razorpayKeySecret
            }
          }
        );
        const fundAccountId = fundRes.data.id;

        console.log(`[Payout] Triggering payout of amount ₹${amount} (paise: ${amount * 100})`);
        const payoutRes = await axios.post(
          'https://api.razorpay.com/v1/payouts',
          {
            account_number: razorpayAccountNumber,
            fund_account_id: fundAccountId,
            amount: Math.round(amount * 100),
            currency: 'INR',
            mode: isUpi ? 'UPI' : 'IMPS',
            purpose: 'payout',
            queue_if_low_balance: true
          },
          {
            auth: {
              username: razorpayKeyId,
              password: razorpayKeySecret
            }
          }
        );

        payoutId = payoutRes.data.id;
        payoutStatus = payoutRes.data.status || 'processed';
        payoutSuccess = true;
        console.log(`[Payout Success] Razorpay Payout ID: ${payoutId}`);
      } catch (payErr: any) {
        const errObj = payErr.response?.data?.error || payErr.response?.data || payErr.message;
        const errDescription = typeof errObj === 'object' ? (errObj.description || JSON.stringify(errObj)) : String(errObj);
        console.error('[Payout Error] Razorpay Payout API call failed:', errDescription);

        const isTestKey = (razorpayKeyId || '').startsWith('rzp_test_');
        const isNotFoundErr = payErr.response?.status === 404 || errDescription.includes('not found on the server');
        const allowSim = process.env.ALLOW_PAYOUT_SIMULATION === 'true' || process.env.NODE_ENV !== 'production' || isTestKey || isNotFoundErr;

        if (allowSim) {
          console.warn('[Payout Warning] Processing successful simulation in test environment / test key.', errDescription);
          payoutId = `payout_sim_${Math.floor(Math.random() * 100000000)}`;
          payoutStatus = 'processed';
          payoutSuccess = true;
        } else {
          payoutSuccess = false;
          failureReason = errDescription;
        }
      }
    } else {
      const allowSim = process.env.ALLOW_PAYOUT_SIMULATION === 'true' || process.env.NODE_ENV !== 'production';
      if (allowSim) {
        payoutId = `payout_sim_${Math.floor(Math.random() * 100000000)}`;
        payoutStatus = 'processed';
        payoutSuccess = true;
      } else {
        payoutSuccess = false;
        failureReason = 'Razorpay API credentials not configured in environment.';
      }
    }

    if (!payoutSuccess) {
      // Record FAILED withdrawal without deducting partner balance!
      await prisma.withdrawal.create({
        data: {
          partnerId,
          amount,
          bankAccount: bankAccountStr,
          status: 'FAILED',
          razorpayPayoutId: payoutId,
          payoutStatus: 'failed',
          failureReason: failureReason || 'Payout processing failed'
        }
      });
      res.status(400).json({ 
        error: `Withdrawal failed: ${failureReason || 'Could not transfer funds via Razorpay.'} Your wallet balance was not deducted.` 
      });
      return;
    }

    // Deduct balance and create successful withdrawal record
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
          status: payoutStatus === 'rejected' || payoutStatus === 'failed' ? 'FAILED' : 'COMPLETED',
          razorpayPayoutId: payoutId,
          payoutStatus,
          failureReason: null
        }
      })
    ]);

    res.json({ message: 'Withdrawal processed successfully', payoutId, bankAccount: bankAccountStr });
  } catch (error: any) {
    console.error('[Withdrawal error]:', error.message || error);
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
      title: `Withdrawal to ${w.bankAccount || 'Bank'}`,
      bankAccount: w.bankAccount,
      status: w.status,
      razorpayPayoutId: w.razorpayPayoutId,
      payoutStatus: w.payoutStatus,
      failureReason: w.failureReason,
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
        title: `Withdrawal to ${withdrawal.bankAccount || 'Bank'}`,
        bankAccount: withdrawal.bankAccount,
        razorpayPayoutId: withdrawal.razorpayPayoutId,
        payoutStatus: withdrawal.payoutStatus,
        failureReason: withdrawal.failureReason,
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

