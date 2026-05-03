import { Router } from 'express';
import { createDispute, getMyDisputes, getDisputeById, resolveDispute } from '../controllers/disputeController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/', authenticateToken, createDispute);
router.get('/my', authenticateToken, getMyDisputes);
router.get('/:id', authenticateToken, getDisputeById);
router.patch('/:id/resolve', authenticateToken, resolveDispute);

export default router;
