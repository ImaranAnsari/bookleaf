import { Router } from 'express';
import { getMyBooks, getAllAuthors, getAuthorById } from '../controllers/authorController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Author-facing: Author gets their own books
router.get('/me/books', authenticate, requireRole(['author']), getMyBooks);

// Admin-facing: Admins can list all authors or get specific author
router.get('/', authenticate, requireRole(['admin']), getAllAuthors);
router.get('/:id', authenticate, requireRole(['admin']), getAuthorById);

export default router;
