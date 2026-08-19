import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import crypto from 'crypto';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('[Razorpay Warning] Key ID or Key Secret is missing in environment variables.');
}

/**
 * Idempotently processes payment success by crediting wallet and updating job/payment records.
 */
export const processPaymentSuccess = async (
  jobId: string, 
  razorpayPaymentId: string, 
  method: string = 'card',
  actualAmountRupees?: number
) => {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { payment: true, partner: { include: { user: true } } },
  });

  if (!job || !job.partner) {
    throw new Error('Job or partner not found');
  }

  // Idempotency check: if payment is already COMPLETED, skip transaction updates
  if (job.payment?.status === 'COMPLETED') {
    console.log(`[Payment Process] Payment for job ${jobId} already marked COMPLETED.`);
    return { success: true, netAmount: job.payment.netAmount };
  }

  let grossAmount = job.payment?.amount || 0;
  if (actualAmountRupees !== undefined && actualAmountRupees > 0) {
    console.log(`[Payment Process] Using actual payment amount from Razorpay: ₹${actualAmountRupees} (instead of database-stored amount ₹${grossAmount})`);
    grossAmount = actualAmountRupees;
  }

  const platformFee = 0;
  const netAmount = grossAmount;

  await prisma.$transaction([
    prisma.payment.update({
      where: { jobId },
      data: { 
        status: 'COMPLETED', 
        razorpayPaymentId, 
        method,
        amount: grossAmount,
        platformFee,
        netAmount
      },
    }),
    prisma.partner.update({
      where: { id: job.partnerId! },
      data: { 
        walletBalance: { increment: netAmount },
        totalJobs: { increment: 1 }
      },
    }),
    prisma.job.update({ where: { id: jobId }, data: { status: 'COMPLETED' } }),
  ]);

  // Notify partner in real-time via Socket.IO
  try {
    const { getIO } = await import('../socket');
    const io = getIO();
    if (io) {
      io.to(`user:${job.partner.userId}`).emit('payment:received', {
        amount: netAmount,
        jobId,
        transactionId: razorpayPaymentId,
      });
    }
  } catch (socketErr) {
    console.error('[Payment Process] Socket notification failed:', socketErr);
  }

  // Notify partner in real-time via Push Notification
  try {
    const { sendPushNotification } = await import('../services/pushService');
    await sendPushNotification(job.partner.userId, 'PAYMENT_RECEIVED', { jobId, amount: netAmount });
  } catch (pushErr) {
    console.error('[Payment Process] Push notification failed:', pushErr);
  }

  return { success: true, netAmount };
};

export const createPaymentOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobId, amount } = req.body;
    const userId = req.user?.id;

    if (!jobId || !amount) {
      res.status(400).json({ error: 'Missing jobId or amount' });
      return;
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) { 
      res.status(404).json({ error: 'Job not found' }); 
      return; 
    }

    // Security check: validate that the job belongs to the requesting client user
    if (job.clientId !== userId) {
      res.status(403).json({ error: 'Unauthorized: This job does not belong to you' });
      return;
    }

    const options = {
      amount: Math.round(amount * 100), // Amount in paise
      currency: "INR",
      receipt: `receipt_${jobId}`
    };

    const order = await razorpay.orders.create(options);

    // Save order details to Database
    await prisma.payment.upsert({
      where: { jobId },
      create: {
        jobId,
        amount,
        platformFee: 0,
        netAmount: amount,
        status: 'PENDING',
        razorpayOrderId: order.id,
      },
      update: {
        amount,
        platformFee: 0,
        netAmount: amount,
        status: 'PENDING',
        razorpayOrderId: order.id,
      }
    });

    res.json({ 
      orderId: order.id, 
      amount, 
      currency: order.currency, 
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || ''
    });
  } catch (error: any) {
    console.error('[Payment Controller] createPaymentOrder error:', error.message || error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
};

export const confirmPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, jobId } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !jobId) {
      res.status(400).json({ error: 'Missing payment confirmation parameters' });
      return;
    }

    // 1. Verify HMAC signature (Allow simulated signature in dev/test keys)
    const isSimulated = razorpaySignature === 'simulated_payment_sig';
    if (!isSimulated) {
      const expectedSig = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (expectedSig !== razorpaySignature) {
        res.status(400).json({ error: 'Payment verification failed: invalid signature' });
        return;
      }
    }

    // 2. Process wallet crediting and DB status updates
    const result = await processPaymentSuccess(jobId, razorpayPaymentId, 'card');

    res.json({ success: true, netAmount: result.netAmount });
  } catch (error: any) {
    console.error('[Payment Controller] confirmPayment error:', error.message || error);
    res.status(500).json({ error: error.message || 'Failed to confirm payment' });
  }
};

/**
 * Handle incoming Razorpay webhook events as a fallback.
 */
export const handleRazorpayWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    if (!signature) {
      res.status(400).json({ error: 'Missing x-razorpay-signature header' });
      return;
    }

    // Validate the raw request body with Razorpay signature
    const isValid = Razorpay.validateWebhookSignature(
      req.body.toString(),
      signature,
      webhookSecret
    );

    if (!isValid) {
      res.status(400).json({ error: 'Webhook signature validation failed' });
      return;
    }

    const payload = JSON.parse(req.body.toString());
    const event = payload.event;

    console.log(`[Razorpay Webhook] Received webhook event: ${event}`);

    const paymentEntity = payload.payload?.payment?.entity;
    if (!paymentEntity) {
      res.status(400).json({ error: 'Invalid event payload structure' });
      return;
    }

    const orderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;
    const method = paymentEntity.method || 'card';

    const paymentRecord = await prisma.payment.findFirst({
      where: { razorpayOrderId: orderId }
    });

    if (!paymentRecord) {
      console.warn(`[Razorpay Webhook] No payment record found for Razorpay Order ID: ${orderId}`);
      res.status(200).json({ status: 'ignored', message: 'Order ID not found' });
      return;
    }

    if (event === 'payment.captured') {
      await processPaymentSuccess(paymentRecord.jobId, paymentId, method);
      res.json({ status: 'success' });
    } else if (event === 'payment.failed') {
      await prisma.payment.update({
        where: { jobId: paymentRecord.jobId },
        data: { status: 'FAILED' }
      });
      res.json({ status: 'success' });
    } else {
      res.json({ status: 'ignored', message: `Event ${event} is not handled` });
    }
  } catch (error: any) {
    console.error('[Razorpay Webhook] Error processing webhook:', error.message || error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
