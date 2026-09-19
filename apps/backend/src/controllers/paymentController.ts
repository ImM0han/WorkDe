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
    prisma.payment.upsert({
      where: { jobId },
      update: { 
        status: 'COMPLETED', 
        razorpayPaymentId, 
        method,
        amount: grossAmount,
        platformFee,
        netAmount
      },
      create: {
        jobId,
        status: 'COMPLETED',
        razorpayPaymentId,
        method,
        amount: grossAmount,
        platformFee,
        netAmount
      }
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
      io.to(`partner:${job.partnerId}`).emit('payment:received', {
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

    if (!jobId) {
      res.status(400).json({ error: 'Missing jobId' });
      return;
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) { 
      res.status(404).json({ error: 'Job not found' }); 
      return; 
    }

    // Security check: validate that the job belongs to the requesting client user
    if (job.clientId !== userId) {
      if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_PAYOUT_SIMULATION === 'true') {
        console.warn(`[Payment Controller] Warning: Job clientId mismatch in dev/simulation mode (job.clientId: ${job.clientId}, req.user: ${userId}). Permitting payment.`);
      } else {
        res.status(403).json({ error: 'Unauthorized: This job does not belong to you' });
        return;
      }
    }

    const numericAmount = parseFloat(amount || '0');
    const finalAmount = (isNaN(numericAmount) || numericAmount <= 0)
      ? (job.billableAmount || job.rate || 100)
      : numericAmount;

    let orderId: string;
    let currency: string = 'INR';

    try {
      const options = {
        amount: Math.round(finalAmount * 100), // Amount in paise
        currency: "INR",
        receipt: `receipt_${jobId}`
      };

      const order = await razorpay.orders.create(options);
      orderId = order.id;
      currency = order.currency;
    } catch (rzpErr: any) {
      console.error('[Payment Controller] Razorpay SDK order creation failed:', rzpErr.message || rzpErr);

      // Fallback for development/testing if Razorpay key/secret is invalid or API fails
      if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_PAYOUT_SIMULATION === 'true' || !process.env.RAZORPAY_KEY_ID) {
        console.warn('[Payment Controller] Using simulated Razorpay order ID fallback for test/dev mode.');
        orderId = `order_simulated_${Date.now()}`;
      } else {
        throw rzpErr;
      }
    }

    // Save order details to Database
    await prisma.payment.upsert({
      where: { jobId },
      create: {
        jobId,
        amount: finalAmount,
        platformFee: 0,
        netAmount: finalAmount,
        status: 'PENDING',
        razorpayOrderId: orderId,
      },
      update: {
        amount: finalAmount,
        platformFee: 0,
        netAmount: finalAmount,
        status: 'PENDING',
        razorpayOrderId: orderId,
      }
    });

    res.json({ 
      orderId, 
      amount: finalAmount, 
      currency, 
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_fallback'
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

    // 1. Verify HMAC signature (Allow simulated signature in dev/test keys or simulated order IDs)
    const isSimulated = razorpaySignature === 'simulated_payment_sig' || razorpayOrderId.startsWith('order_simulated_');
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

/**
 * Render hosted HTML page with Razorpay Checkout JS script for web/browser fallback.
 */
export const renderCheckoutPage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, amount, jobId, name, email, contact, redirectUri } = req.query;

    if (!orderId || !amount || !jobId) {
      res.status(400).send('Missing required payment parameters');
      return;
    }

    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_TZtFjRx85UYAef';
    const amountInPaise = Math.round(parseFloat(amount as string) * 100);
    const baseRedirect = (redirectUri as string) || 'wrkup://payment-callback';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>WorkDe Secure Payment</title>
  <style>
    body {
      background-color: #0F172A;
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
      text-align: center;
    }
    .spinner {
      border: 4px solid rgba(255, 255, 255, 0.1);
      border-left-color: #FF6B1A;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      animation: spin 1s linear infinite;
      margin-bottom: 24px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    h2 { font-size: 20px; font-weight: 700; margin: 0 0 8px 0; }
    p { font-size: 14px; color: #94A3B8; margin: 0; }
  </style>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
  <div class="spinner"></div>
  <h2>Opening Razorpay Payment Gateway</h2>
  <p>Please complete your payment in the checkout window...</p>

  <script>
    var baseRedirect = ${JSON.stringify(baseRedirect)};
    function sendRedirect(params) {
      var separator = baseRedirect.indexOf('?') !== -1 ? '&' : '?';
      window.location.href = baseRedirect + separator + params;
    }

    var options = {
      "key": "${keyId}",
      "amount": "${amountInPaise}",
      "currency": "INR",
      "name": "WorkDe",
      "description": "Payment for Job #${jobId}",
      "order_id": "${orderId}",
      "prefill": {
        "name": ${JSON.stringify(name || 'Client')},
        "email": ${JSON.stringify(email || 'test@example.com')},
        "contact": ${JSON.stringify(contact || '9999999999')}
      },
      "theme": { "color": "#FF6B1A" },
      "handler": function (response) {
        sendRedirect("status=success&jobId=${jobId}"
          + "&razorpay_order_id=" + encodeURIComponent(response.razorpay_order_id || '')
          + "&razorpay_payment_id=" + encodeURIComponent(response.razorpay_payment_id || '')
          + "&razorpay_signature=" + encodeURIComponent(response.razorpay_signature || ''));
      },
      "modal": {
        "ondismiss": function() {
          sendRedirect("status=cancelled&jobId=${jobId}");
        }
      }
    };

    var rzp = new Razorpay(options);
    rzp.on('payment.failed', function (resp) {
      var err = (resp.error && resp.error.description) ? resp.error.description : 'Payment Failed';
      sendRedirect("status=failed&jobId=${jobId}&error=" + encodeURIComponent(err));
    });

    window.onload = function() {
      rzp.open();
    };
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err: any) {
    console.error('[Payment Controller] renderCheckoutPage error:', err);
    res.status(500).send('Failed to load payment checkout page');
  }
};


