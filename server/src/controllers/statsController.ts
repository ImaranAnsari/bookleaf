import { Request, Response } from 'express';
import { db } from '../db/database.js';

export const getAdminStats = (_req: Request, res: Response): void => {
  const totalTickets = (db.prepare('SELECT COUNT(*) as count FROM tickets').get() as any)?.count || 0;
  const openTickets = (db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'Open'").get() as any)?.count || 0;
  const inProgressTickets = (db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'In Progress'").get() as any)?.count || 0;
  const resolvedTickets = (db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status IN ('Resolved', 'Closed')").get() as any)?.count || 0;
  
  const criticalTickets = (db.prepare("SELECT COUNT(*) as count FROM tickets WHERE priority = 'Critical' AND status NOT IN ('Resolved', 'Closed')").get() as any)?.count || 0;
  const highTickets = (db.prepare("SELECT COUNT(*) as count FROM tickets WHERE priority = 'High' AND status NOT IN ('Resolved', 'Closed')").get() as any)?.count || 0;

  // Breakdown by Category
  const categoryStats = db.prepare(`
    SELECT category, COUNT(*) as count 
    FROM tickets 
    GROUP BY category 
    ORDER BY count DESC
  `).all();

  // Breakdown by Priority
  const priorityStats = db.prepare(`
    SELECT priority, COUNT(*) as count 
    FROM tickets 
    GROUP BY priority
  `).all();

  // Oldest unresolved ticket
  const oldestUnresolved = db.prepare(`
    SELECT ticket_id, subject, priority, created_at, 
      ROUND((julianday('now') - julianday(created_at))) as days_open
    FROM tickets 
    WHERE status NOT IN ('Resolved', 'Closed')
    ORDER BY created_at ASC 
    LIMIT 1
  `).get();

  // Total Authors & Books
  const totalAuthors = (db.prepare('SELECT COUNT(*) as count FROM authors').get() as any)?.count || 0;
  const totalBooks = (db.prepare('SELECT COUNT(*) as count FROM books').get() as any)?.count || 0;
  const totalPendingRoyalties = (db.prepare('SELECT SUM(royalty_pending) as sum FROM books').get() as any)?.sum || 0;

  res.json({
    success: true,
    data: {
      tickets: {
        total: totalTickets,
        open: openTickets,
        inProgress: inProgressTickets,
        resolved: resolvedTickets,
        criticalUnresolved: criticalTickets,
        highUnresolved: highTickets,
      },
      categoryBreakdown: categoryStats,
      priorityBreakdown: priorityStats,
      oldestUnresolved,
      catalog: {
        authorsCount: totalAuthors,
        booksCount: totalBooks,
        totalPendingRoyalties,
      },
    },
  });
};
