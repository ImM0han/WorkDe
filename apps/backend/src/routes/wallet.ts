import { Router } from 'express';
import { getBalance, withdrawFunds, addBankAccount, getTransactions, getTransactionById } from '../controllers/walletController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/balance', getBalance);
router.get('/transactions', getTransactions);
router.get('/transactions/:id', getTransactionById);
router.post('/withdraw', withdrawFunds);
router.post('/bank-account', addBankAccount);

export default router;
