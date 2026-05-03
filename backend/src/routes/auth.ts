import { Router } from 'express';
import { sendOtp, verifyOtp, register, me, setPassword, loginPassword, forgotPassword, resetPassword, changePassword } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register', register);
router.post('/set-password', setPassword);
router.post('/login-password', loginPassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', authenticateToken, changePassword);
router.get('/me', authenticateToken, me);

export default router;
