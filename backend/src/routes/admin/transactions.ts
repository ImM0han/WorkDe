import { Router } from 'express';
import {
  listPayments,
  listJobs,
  listDisputes,
  resolveDispute,
  getUserTransactionHistory
} from '../../controllers/admin/transactionsController';
import { authenticateAdmin } from '../../middleware/adminAuth';

const router = Router();

router.use(authenticateAdmin);

router.get('/payments', listPayments);
router.get('/jobs', listJobs);
router.get('/disputes', listDisputes);
router.post('/disputes/:id/resolve', resolveDispute);
router.get('/users/:userId/history', getUserTransactionHistory);

export default router;
