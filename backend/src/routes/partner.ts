import { Router } from 'express';
import multer from 'multer';
import { updateSkills, uploadCertificate, initiateAadhaar, verifyAadhaar, updateLocation, getNearbyPartners, getPartnerProfile, getPartnerReviews } from '../controllers/partnerController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken);

router.put('/skills', updateSkills);
router.post('/certificates', upload.single('certificate'), uploadCertificate);
router.post('/aadhaar/initiate', initiateAadhaar);
router.post('/aadhaar/verify', verifyAadhaar);
router.patch('/location', updateLocation);
router.get('/nearby', getNearbyPartners);
router.get('/:id/reviews', getPartnerReviews);
router.get('/:id', getPartnerProfile);
export default router;
