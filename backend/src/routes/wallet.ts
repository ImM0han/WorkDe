import { Router } from 'express';
import { getBalance, withdrawFunds, addBankAccount } from '../controllers/walletController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/balance', getBalance);
router.post('/withdraw', withdrawFunds);
router.post('/bank-account', addBankAccount);

export default router;
