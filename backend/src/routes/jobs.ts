import { Router } from 'express';
import multer from 'multer';
import { getNearbyJobs, acceptJob, rejectJob, completeJob, createJob, getClientJobs, cancelJob, extendJob } from '../controllers/jobController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken);

router.get('/nearby', getNearbyJobs);
router.post('/:id/accept', acceptJob);
router.post('/:id/reject', rejectJob);
router.patch('/:id/complete', upload.array('photos', 3), completeJob);

router.post('/', createJob);
router.get('/client', getClientJobs);
router.delete('/:id', cancelJob);
router.post('/:id/extend', extendJob);

export default router;
