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
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, jobId, method } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !jobId) {
      res.status(400).json({ error: 'Missing payment confirmation parameters' });
      return;
    }

    const isTestMode = !process.env.RAZORPAY_KEY_ID ||
      process.env.RAZORPAY_KEY_ID.startsWith('rzp_test_') ||
      process.env.NODE_ENV !== 'production' ||
      process.env.ALLOW_PAYOUT_SIMULATION === 'true';

    // Check if payment is a simulated test payment fallback
    const isSimulated = razorpaySignature === 'simulated_payment_sig' ||
      razorpayOrderId.startsWith('order_simulated_') ||
      razorpayPaymentId.startsWith('pay_rzp_') ||
      razorpayPaymentId.startsWith('pay_simulated_');

    if (!isTestMode && isSimulated) {
      res.status(400).json({ error: 'Real Razorpay payment is required in production. Payment was not completed on gateway.' });
      return;
    }

    // 1. Verify HMAC signature if signature is provided and not a simulated test payment
    if (razorpaySignature && process.env.RAZORPAY_KEY_SECRET && !isSimulated) {
      const expectedSig = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (expectedSig !== razorpaySignature) {
        res.status(400).json({ error: 'Payment verification failed: invalid Razorpay signature' });
        return;
      }
    }

    // 2. Fetch payment details from Razorpay API to confirm credit amount and captured status
    let actualPaidAmount: number | undefined = undefined;
    if (razorpayPaymentId && !isSimulated && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      try {
        const rzpPaymentObj = await razorpay.payments.fetch(razorpayPaymentId);
        if (rzpPaymentObj) {
          if (rzpPaymentObj.status !== 'captured' && rzpPaymentObj.status !== 'authorized') {
            res.status(400).json({ error: `Payment not completed on Razorpay (Gateway status: ${rzpPaymentObj.status})` });
            return;
          }
          if (rzpPaymentObj.amount) {
            actualPaidAmount = Number(rzpPaymentObj.amount) / 100; // Convert paise to Rupees
          }
        }
      } catch (rzpFetchErr: any) {
        console.warn('[Payment Controller] Could not fetch Razorpay payment status via API:', rzpFetchErr.message || rzpFetchErr);
      }
    }

    // 3. Process wallet crediting and DB status updates
    const paymentMethod = method || 'UPI';
    const result = await processPaymentSuccess(jobId, razorpayPaymentId, paymentMethod, actualPaidAmount);

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
      const actualAmount = paymentEntity.amount ? paymentEntity.amount / 100 : undefined;
      await processPaymentSuccess(paymentRecord.jobId, paymentId, method, actualAmount);
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
 * Render hosted HTML page with Razorpay Checkout JS script for mobile web browser checkout.
 */
export const renderCheckoutPage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, amount, jobId, name, email, contact, redirectUri } = req.query;

    if (!orderId || !amount || !jobId) {
      res.status(400).send('Missing required payment parameters');
      return;
    }

    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_TZtFjRx85UYAef';
    const amountVal = parseFloat(amount as string) || 0;
    const amountInPaise = Math.round(amountVal * 100);
    const formattedAmount = amountVal.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    const baseRedirect = (redirectUri as string) || 'wrkup://payment-callback';

    const prefillObj: any = {
      contact: (contact as string) || '9876543210',
      email: (email as string) || 'client@wrkup.com'
    };
    if (name) prefillObj.name = name;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>UPI Direct Payment</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-tap-highlight-color: transparent; }
    body { background-color: #F8FAFC; color: #0F172A; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; padding: 24px; text-align: center; }
    .card { background: #FFFFFF; border-radius: 24px; padding: 32px 24px; width: 100%; max-width: 400px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05); border: 1px solid #E2E8F0; }
    .logo-badge { width: 64px; height: 64px; border-radius: 32px; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 20px auto; }
    .title { font-size: 22px; font-weight: 800; color: #0F172A; margin-bottom: 6px; }
    .subtitle { font-size: 14px; color: #64748B; margin-bottom: 24px; }
    .amount-box { background: #F1F5F9; border-radius: 16px; padding: 16px; margin-bottom: 28px; }
    .amount-label { font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; }
    .amount-value { font-size: 32px; font-weight: 900; color: #0F172A; margin-top: 4px; }
    .pay-btn { width: 100%; background: linear-gradient(135deg, #FF6B1A 0%, #F59E0B 100%); color: #FFFFFF; border: none; border-radius: 16px; padding: 18px; font-size: 17px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 4px 14px rgba(255, 107, 26, 0.35); }
    .pay-btn:active { opacity: 0.9; transform: scale(0.99); }
    .upi-badges { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 20px; }
    .upi-pill { font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; background: #F8FAFC; border: 1px solid #CBD5E1; color: #475569; }
    .cancel-link { margin-top: 24px; font-size: 14px; font-weight: 600; color: #94A3B8; cursor: pointer; text-decoration: none; display: inline-block; }
  </style>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
  <div class="card">
    <div class="logo-badge">⚡</div>
    <div class="title">1-Click UPI Payment</div>
    <div class="subtitle">Complete payment securely via GPay, PhonePe, or Paytm</div>

    <div class="amount-box">
      <div class="amount-label">Total Job Settlement</div>
      <div class="amount-value">₹${formattedAmount}</div>
    </div>

    <button class="pay-btn" onclick="payWithUPI()">
      <span>Pay ₹${formattedAmount} via UPI App</span>
      <span>→</span>
    </button>

    <div class="upi-badges">
      <span class="upi-pill" style="color:#2563EB;">GPay</span>
      <span class="upi-pill" style="color:#5F259F;">PhonePe</span>
      <span class="upi-pill" style="color:#0284C7;">Paytm</span>
      <span class="upi-pill" style="color:#059669;">BHIM</span>
    </div>

    <div>
      <a class="cancel-link" onclick="cancelPayment()">Cancel Payment</a>
    </div>
  </div>

  <script>
    var baseRedirect = ${JSON.stringify(baseRedirect)};
    function sendRedirect(params) {
      var separator = baseRedirect.indexOf('?') !== -1 ? '&' : '?';
      window.location.href = baseRedirect + separator + params;
    }

    function cancelPayment() {
      sendRedirect("status=cancelled&jobId=${jobId}");
    }

    function payWithUPI() {
      var basePrefill = {
        contact: "9876543210",
        email: "customer@wrkup.com",
        name: "WrkUp Client",
        method: "upi"
      };
      var prefill = Object.assign({}, basePrefill, ${JSON.stringify(prefillObj)});
      prefill.method = "upi";

      var options = {
        "key": "${keyId}",
        "amount": "${amountInPaise}",
        "currency": "INR",
        "name": "WrkUp",
        "description": "Job Payment #${jobId}",
        "order_id": "${orderId}",
        "prefill": prefill,
        "readonly": {
          "contact": true,
          "email": true,
          "name": true
        },
        "config": {
          "display": {
            "blocks": {
              "upi": {
                "name": "Pay via UPI App",
                "instruments": [
                  { "method": "upi" }
                ]
              }
            },
            "sequence": ["block.upi"],
            "preferences": {
              "show_default_blocks": false
            }
          }
        },
        "theme": { 
          "color": "#FF6B1A",
          "hide_topbar": true
        },
        "handler": function (response) {
          sendRedirect("status=success&jobId=${jobId}"
            + "&razorpay_order_id=" + encodeURIComponent(response.razorpay_order_id || '')
            + "&razorpay_payment_id=" + encodeURIComponent(response.razorpay_payment_id || '')
            + "&razorpay_signature=" + encodeURIComponent(response.razorpay_signature || ''));
        },
        "modal": {
          "ondismiss": function() {
            // Dismissed checkout dialog returns to 1-click page
          }
        }
      };

      var rzp = new Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        var err = (resp.error && resp.error.description) ? resp.error.description : 'Payment Failed';
        sendRedirect("status=failed&jobId=${jobId}&error=" + encodeURIComponent(err));
      });
      rzp.open();
    }

    window.onload = function() {
      setTimeout(function() {
        payWithUPI();
      }, 300);
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


