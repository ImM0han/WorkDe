import { Router } from 'express';
import { sendOtp, verifyOtp, register, me, setPassword, loginPassword, forgotPassword, resetPassword, changePassword, updateProfile } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { rateLimitOtp } from '../middleware/rateLimiter';

const router = Router();

router.post('/send-otp', rateLimitOtp, sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register', register);
router.post('/set-password', setPassword);
router.post('/login-password', loginPassword);
router.post('/forgot-password', rateLimitOtp, forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', authenticateToken, changePassword);
router.get('/me', authenticateToken, me);
router.put('/profile', authenticateToken, updateProfile);

export default router;
