import { Router } from 'express';
import { getAdminStats } from '../controllers/statsController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, requireRole(['admin']), getAdminStats);

export default router;
