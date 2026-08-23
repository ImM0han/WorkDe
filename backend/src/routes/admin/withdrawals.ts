import { Router } from 'express';
import {
  listWithdrawals,
  getWithdrawal,
  markProcessing,
  markPaid,
  rejectWithdrawal
} from '../../controllers/admin/withdrawalsController';
import { authenticateAdmin } from '../../middleware/adminAuth';

const router = Router();

router.use(authenticateAdmin);

router.get('/', listWithdrawals);
router.get('/:id', getWithdrawal);
router.post('/:id/processing', markProcessing);
router.post('/:id/pay', markPaid);
router.post('/:id/reject', rejectWithdrawal);

export default router;
