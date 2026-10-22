import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { realtimeService } from '../services/realtimeService.js';

const router = Router();

// Server-Sent Events (SSE) Endpoint for Real-time Ticket & Message Updates
router.get('/events', authenticate, (req: Request, res: Response) => {
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // prevents nginx buffering
  });

  const clientId = `CLIENT-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const role = req.user?.role || 'author';
  const authorId = req.user?.author_id || req.user?.id;

  realtimeService.addClient(clientId, res, role, authorId);
});

export default router;
