import { Router } from 'express';
import { listUsers, getUser, updateUser, deleteUser, createUser, resetUserPassword, updateUserAuthSettings } from '../../controllers/admin/usersController';
import { authenticateAdmin, requireSuperadmin } from '../../middleware/adminAuth';

const router = Router();

router.use(authenticateAdmin);

router.get('/', listUsers);
router.post('/', requireSuperadmin, createUser);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', requireSuperadmin, deleteUser);
router.post('/:id/reset-password', resetUserPassword);
router.put('/:id/auth-settings', updateUserAuthSettings);

export default router;
