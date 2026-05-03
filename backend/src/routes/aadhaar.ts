import { Router } from 'express';
import { initiateAadhaarKyc, verifyAadhaarOtp } from '../controllers/aadhaarController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/initiate', authenticateToken, initiateAadhaarKyc);
router.post('/verify', authenticateToken, verifyAadhaarOtp);

export default router;
