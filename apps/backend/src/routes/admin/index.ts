import { Router } from 'express';
import authRoutes from './auth';
import adminRoutes from './admins';
import userRoutes from './users';
import transactionRoutes from './transactions';
import withdrawalRoutes from './withdrawals';
import authConsoleRoutes from './authConsole';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admins', adminRoutes);
router.use('/users', userRoutes);
router.use('/transactions', transactionRoutes);
router.use('/withdrawals', withdrawalRoutes);
router.use('/auth-console', authConsoleRoutes);

export default router;
