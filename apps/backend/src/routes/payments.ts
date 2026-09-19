import express, { Router } from 'express';
import { createPaymentOrder, confirmPayment, handleRazorpayWebhook, renderCheckoutPage } from '../controllers/paymentController';
import { authenticateToken } from '../middleware/auth';
import { rateLimitPayment } from '../middleware/rateLimiter';

const router = Router();

// 1. Webhook endpoint must be public and use express.raw to retrieve the exact raw body for signature verification
router.post('/webhook/razorpay', express.raw({ type: 'application/json' }), handleRazorpayWebhook);

// 2. Public hosted web checkout page route (used by mobile WebBrowser when native Razorpay SDK is unlinked)
router.get('/checkout-page', renderCheckoutPage);

// 3. Authenticated, rate-limited payments API endpoints
router.use(authenticateToken);
router.use(rateLimitPayment);

router.post('/initiate', createPaymentOrder);
router.post('/confirm', confirmPayment);

export default router;

