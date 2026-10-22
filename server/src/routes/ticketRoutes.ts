import { Router } from 'express';
import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  addMessage,
  addInternalNote,
  getOrGenerateAIDraft,
  regenerateAIDraft,
} from '../controllers/ticketController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// List tickets (authors see own tickets, admins see all with filters)
router.get('/', authenticate, getTickets);

// Create new ticket (authors)
router.post('/', authenticate, requireRole(['author']), createTicket);

// Get single ticket details
router.get('/:id', authenticate, getTicketById);

// Update ticket status, priority, category override, assignee (admins only)
router.patch('/:id', authenticate, requireRole(['admin']), updateTicket);

// Add reply message in thread (both author and admin)
router.post('/:id/messages', authenticate, addMessage);

// Add internal note (admin only - strictly hidden from authors)
router.post('/:id/notes', authenticate, requireRole(['admin']), addInternalNote);

// AI-Drafted Response routes (admin only)
router.get('/:id/ai-draft', authenticate, requireRole(['admin']), getOrGenerateAIDraft);
router.post('/:id/ai-draft/regenerate', authenticate, requireRole(['admin']), regenerateAIDraft);

export default router;
