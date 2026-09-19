import { Router } from 'express';
import { listAdmins, createAdmin, updateAdmin, deleteAdmin } from '../../controllers/admin/adminManagementController';
import { authenticateAdmin, requireSuperadmin } from '../../middleware/adminAuth';

const router = Router();

// Superadmin only for all admin management routes
router.use(authenticateAdmin, requireSuperadmin);

router.get('/', listAdmins);
router.post('/', createAdmin);
router.put('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);

export default router;
