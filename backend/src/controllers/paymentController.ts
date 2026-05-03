import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import crypto from 'crypto';
import Razorpay from 'razorpay';

// Use env variables in real app
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'mock_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock_secret'
});

export const createPaymentOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobId, amount } = req.body;

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }

    const options = {
      amount: amount * 100, // Amount in paise
      currency: "INR",
      receipt: `receipt_${jobId}`
    };

    const order = await razorpay.orders.create(options);

    const payment = await prisma.payment.create({
      data: {
        jobId,
        amount,
        platformFee: amount * 0.05,
        netAmount: amount * 0.95,
        status: 'PENDING',
        razorpayOrderId: order.id,
      }
    });

    res.json({ 
      orderId: order.id, 
      amount, 
      currency: order.currency, 
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'mock_key' 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create payment order' });
  }
};

export const confirmPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, jobId } = req.body;

    // 1. Verify HMAC signature
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'mock_secret')
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSig !== razorpaySignature && process.env.NODE_ENV !== 'development') {
      res.status(400).json({ error: 'Payment verification failed' });
      return;
    }

    // 2. Fetch job and payment
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { payment: true, partner: { include: { user: true } } },
    });
    
    if (!job || !job.partner) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const grossAmount = job.payment?.amount || 0;
    const platformFee = grossAmount * 0.05;
    const netAmount = grossAmount - platformFee;

    // 3. Credit wallet and update records in one transaction
    await prisma.$transaction([
      prisma.payment.update({
        where: { jobId },
        data: { status: 'COMPLETED', razorpayPaymentId, method: 'card' },
      }),
      prisma.partner.update({
        where: { id: job.partnerId! },
        data: { walletBalance: { increment: netAmount } },
      }),
      prisma.job.update({ where: { id: jobId }, data: { status: 'COMPLETED' } }),
    ]);

    // 4. Notify partner
    const { getIO } = await import('../socket');
    const io = getIO();
    if (io) {
      io.to(`user:${job.partner.userId}`).emit('payment:received', {
        amount: netAmount,
        jobId,
        transactionId: razorpayPaymentId,
      });
    }

    try {
      const { sendPushNotification } = await import('../services/pushService');
      await sendPushNotification(job.partner.userId, 'PAYMENT_RECEIVED', { amount: netAmount });
    } catch (e) {}

    res.json({ success: true, netAmount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
};
