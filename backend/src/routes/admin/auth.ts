import { Router } from 'express';
import { login, me, changeOwnPassword } from '../../controllers/admin/authController';
import { authenticateAdmin } from '../../middleware/adminAuth';
import { rateLimitAdminLogin } from '../../middleware/rateLimiter';

const router = Router();

router.post('/login', rateLimitAdminLogin, login);
router.get('/me', authenticateAdmin, me);
router.post('/change-password', authenticateAdmin, changeOwnPassword);

export default router;
