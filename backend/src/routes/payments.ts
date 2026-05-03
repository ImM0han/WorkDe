import { Router } from 'express';
import { createPaymentOrder, confirmPayment } from '../controllers/paymentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/order', createPaymentOrder);
router.post('/confirm', confirmPayment);

export default router;
