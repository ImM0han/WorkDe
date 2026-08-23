import { Router } from 'express';
import {
  listAuthUsers,
  markUserAuthProcessing,
  verifyUserAuth,
  editVerifiedUserPassword,
  rejectUserAuth,
  deleteAndBanUser,
  revokeDeleteUser
} from '../../controllers/admin/authConsoleController';
import { authenticateAdmin } from '../../middleware/adminAuth';

const router = Router();

router.use(authenticateAdmin);

router.get('/users', listAuthUsers);
router.post('/users/:id/mark-processing', markUserAuthProcessing);
router.post('/users/:id/verify-auth', verifyUserAuth);
router.post('/users/:id/edit-password', editVerifiedUserPassword);
router.post('/users/:id/reject-auth', rejectUserAuth);
router.post('/users/:id/delete-and-ban', deleteAndBanUser);
router.post('/users/:id/revoke-delete', revokeDeleteUser);

export default router;
