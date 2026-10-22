import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/database.js';
import { aiService, TicketCategory, TicketPriority } from '../services/aiService.js';
import { realtimeService } from '../services/realtimeService.js';

const createTicketSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  description: z.string().min(10, 'Please describe your query in detail (at least 10 characters)'),
  book_id: z.string().optional().nullable(),
  attachment_name: z.string().optional().nullable(),
  attachment_url: z.string().optional().nullable(),
});

const updateTicketSchema = z.object({
  status: z.enum(['Open', 'In Progress', 'Resolved', 'Closed']).optional(),
  category: z.enum([
    'Royalty & Payments',
    'ISBN & Metadata Issues',
    'Printing & Quality',
    'Distribution & Availability',
    'Book Status & Production Updates',
    'General Inquiry',
  ]).optional(),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
  assigned_to: z.string().optional().nullable(),
});

const addMessageSchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty'),
});

const addNoteSchema = z.object({
  content: z.string().min(1, 'Note content cannot be empty'),
});

const regenerateDraftSchema = z.object({
  custom_instructions: z.string().optional(),
});

export const createTicket = async (req: Request, res: Response): Promise<void> => {
  const authorId = req.user?.author_id || req.user?.id;
  if (!authorId || req.user?.role !== 'author') {
    res.status(403).json({ success: false, error: 'Only registered authors can raise support queries' });
    return;
  }

  const parseResult = createTicketSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: parseResult.error.issues[0]?.message || 'Validation error',
    });
    return;
  }

  const { subject, description, book_id, attachment_name, attachment_url } = parseResult.data;

  // Retrieve author record
  const author = db.prepare('SELECT * FROM authors WHERE author_id = ?').get(authorId) as any;
  if (!author) {
    res.status(404).json({ success: false, error: 'Author record not found' });
    return;
  }

  // Retrieve book if attached
  let book: any = null;
  if (book_id && book_id !== 'general') {
    book = db.prepare('SELECT * FROM books WHERE book_id = ? AND author_id = ?').get(book_id, authorId);
  }

  // 1. AI-Powered Auto-Classification & Priority Scoring (Requirement B & D)
  let classificationResult = {
    category: 'General Inquiry' as TicketCategory,
    priority: 'Medium' as TicketPriority,
    reasoning: 'Standard classification',
    provider: 'fallback-engine',
    isFallback: true,
  };

  try {
    classificationResult = await aiService.classifyTicket(subject, description, book || undefined);
  } catch (err) {
    console.error('[TicketController] AI classification failed, using graceful fallback:', err);
  }

  // 2. Pre-generate AI Drafted Response based on Knowledge Base & Author Context
  let initialDraft = '';
  try {
    const draftResult = await aiService.generateDraftResponse(
      { subject, description, category: classificationResult.category },
      {
        author_id: author.author_id,
        name: author.name,
        email: author.email,
        city: author.city,
      },
      book || undefined
    );
    initialDraft = draftResult.draftResponse;
  } catch (err) {
    console.error('[TicketController] Initial AI draft generation failed:', err);
  }

  // Generate unique Ticket ID: TCK-YYYYMMDD-XXXX
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const ticketId = `TCK-${randomSuffix}`;
  const now = new Date().toISOString();

  // Save Ticket
  const insertTicket = db.prepare(`
    INSERT INTO tickets (
      ticket_id, author_id, book_id, subject, description, category, ai_category,
      priority, ai_priority, ai_reasoning, ai_draft_response, status, assigned_to,
      attachment_name, attachment_url, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open', NULL, ?, ?, ?, ?)
  `);

  insertTicket.run(
    ticketId,
    authorId,
    book?.book_id || null,
    subject,
    description,
    classificationResult.category,
    classificationResult.category,
    classificationResult.priority,
    classificationResult.priority,
    classificationResult.reasoning,
    initialDraft,
    attachment_name || null,
    attachment_url || null,
    now,
    now
  );

  // Save initial message in thread
  const messageId = `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  db.prepare(`
    INSERT INTO ticket_messages (
      message_id, ticket_id, sender_type, sender_id, sender_name, content, created_at
    ) VALUES (?, ?, 'author', ?, ?, ?, ?)
  `).run(messageId, ticketId, authorId, author.name, description, now);

  const fullCreatedTicket = db.prepare(`
    SELECT t.*, a.name as author_name, a.email as author_email, b.title as book_title
    FROM tickets t
    JOIN authors a ON t.author_id = a.author_id
    LEFT JOIN books b ON t.book_id = b.book_id
    WHERE t.ticket_id = ?
  `).get(ticketId);

  // Broadcast real-time event to Admin dashboard and Author
  realtimeService.broadcast('ticket:created', fullCreatedTicket, authorId);

  res.status(201).json({
    success: true,
    data: fullCreatedTicket,
    meta: {
      ai_provider: classificationResult.provider,
      ai_fallback_active: classificationResult.isFallback,
    },
  });
};

export const getTickets = (req: Request, res: Response): void => {
  const isAuthor = req.user?.role === 'author';
  const authorId = req.user?.author_id || req.user?.id;

  const { status, category, priority, search, sort = 'urgent_first' } = req.query;

  let query = `
    SELECT 
      t.*,
      a.name as author_name,
      a.email as author_email,
      b.title as book_title,
      b.status as book_status,
      (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.ticket_id) as message_count,
      (SELECT created_at FROM ticket_messages WHERE ticket_id = t.ticket_id ORDER BY created_at DESC LIMIT 1) as last_message_at
    FROM tickets t
    JOIN authors a ON t.author_id = a.author_id
    LEFT JOIN books b ON t.book_id = b.book_id
    WHERE 1=1
  `;

  const params: any[] = [];

  // RBAC: Authors only see their own tickets
  if (isAuthor) {
    query += ` AND t.author_id = ?`;
    params.push(authorId);
  }

  // Filters
  if (status && status !== 'all') {
    query += ` AND t.status = ?`;
    params.push(status);
  }

  if (category && category !== 'all') {
    query += ` AND t.category = ?`;
    params.push(category);
  }

  if (priority && priority !== 'all') {
    query += ` AND t.priority = ?`;
    params.push(priority);
  }

  if (search && typeof search === 'string' && search.trim()) {
    query += ` AND (t.subject LIKE ? OR t.description LIKE ? OR a.name LIKE ? OR b.title LIKE ?)`;
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  // Sorting
  // Assignment Requirement B: "The most urgent and oldest unresolved tickets should be easy to spot."
  if (sort === 'urgent_first') {
    query += `
      ORDER BY 
        CASE 
          WHEN t.status IN ('Resolved', 'Closed') THEN 2 
          ELSE 1 
        END ASC,
        CASE t.priority 
          WHEN 'Critical' THEN 1 
          WHEN 'High' THEN 2 
          WHEN 'Medium' THEN 3 
          ELSE 4 
        END ASC,
        t.created_at ASC
    `;
  } else if (sort === 'newest') {
    query += ` ORDER BY t.created_at DESC`;
  } else if (sort === 'oldest') {
    query += ` ORDER BY t.created_at ASC`;
  } else {
    query += ` ORDER BY t.updated_at DESC`;
  }

  const tickets = db.prepare(query).all(...params);

  res.json({
    success: true,
    data: tickets,
    count: tickets.length,
  });
};

export const getTicketById = (req: Request, res: Response): void => {
  const { id } = req.params;
  const isAuthor = req.user?.role === 'author';
  const authorId = req.user?.author_id || req.user?.id;

  const ticket = db.prepare(`
    SELECT 
      t.*,
      a.name as author_name,
      a.email as author_email,
      a.phone as author_phone,
      a.city as author_city,
      a.joined_date as author_joined_date,
      b.title as book_title,
      b.isbn as book_isbn,
      b.status as book_status,
      b.mrp as book_mrp,
      b.author_royalty_per_copy as book_royalty_per_copy,
      b.total_copies_sold as book_total_copies_sold,
      b.total_royalty_earned as book_total_royalty_earned,
      b.royalty_paid as book_royalty_paid,
      b.royalty_pending as book_royalty_pending,
      b.last_royalty_payout_date as book_last_payout_date,
      b.print_partner as book_print_partner
    FROM tickets t
    JOIN authors a ON t.author_id = a.author_id
    LEFT JOIN books b ON t.book_id = b.book_id
    WHERE t.ticket_id = ?
  `).get(id) as any;

  if (!ticket) {
    res.status(404).json({ success: false, error: 'Ticket not found' });
    return;
  }

  // RBAC: Verify author access
  if (isAuthor && ticket.author_id !== authorId) {
    res.status(403).json({ success: false, error: 'Access denied: You can only view your own tickets' });
    return;
  }

  // Fetch public thread messages
  const messages = db.prepare(`
    SELECT * FROM ticket_messages 
    WHERE ticket_id = ? 
    ORDER BY created_at ASC
  `).all(id);

  // Fetch internal notes strictly for admins
  let internalNotes: any[] = [];
  if (!isAuthor) {
    internalNotes = db.prepare(`
      SELECT * FROM ticket_internal_notes 
      WHERE ticket_id = ? 
      ORDER BY created_at ASC
    `).all(id);
  }

  // Fetch all author books if admin (for rich context sidebar)
  let authorBooks: any[] = [];
  if (!isAuthor) {
    authorBooks = db.prepare(`
      SELECT book_id, title, isbn, status, mrp, total_copies_sold, total_royalty_earned, royalty_pending
      FROM books WHERE author_id = ?
    `).all(ticket.author_id);
  }

  res.json({
    success: true,
    data: {
      ...ticket,
      messages,
      // Internal notes strictly hidden from author
      internal_notes: isAuthor ? undefined : internalNotes,
      author_books: isAuthor ? undefined : authorBooks,
    },
  });
};

export const updateTicket = (req: Request, res: Response): void => {
  const { id } = req.params;

  const parseResult = updateTicketSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: parseResult.error.issues[0]?.message || 'Validation error',
    });
    return;
  }

  const ticket = db.prepare('SELECT * FROM tickets WHERE ticket_id = ?').get(id) as any;
  if (!ticket) {
    res.status(404).json({ success: false, error: 'Ticket not found' });
    return;
  }

  const { status, category, priority, assigned_to } = parseResult.data;
  const now = new Date().toISOString();

  let resolvedAt = ticket.resolved_at;
  if (status && ['Resolved', 'Closed'].includes(status) && !ticket.resolved_at) {
    resolvedAt = now;
  } else if (status && ['Open', 'In Progress'].includes(status)) {
    resolvedAt = null;
  }

  db.prepare(`
    UPDATE tickets 
    SET 
      status = COALESCE(?, status),
      category = COALESCE(?, category),
      priority = COALESCE(?, priority),
      assigned_to = COALESCE(?, assigned_to),
      resolved_at = ?,
      updated_at = ?
    WHERE ticket_id = ?
  `).run(
    status || null,
    category || null,
    priority || null,
    assigned_to !== undefined ? assigned_to : null,
    resolvedAt,
    now,
    id
  );

  const updatedTicket = db.prepare(`
    SELECT t.*, a.name as author_name, a.email as author_email, b.title as book_title
    FROM tickets t
    JOIN authors a ON t.author_id = a.author_id
    LEFT JOIN books b ON t.book_id = b.book_id
    WHERE t.ticket_id = ?
  `).get(id);

  // Broadcast to author and admins
  realtimeService.broadcast('ticket:updated', updatedTicket, ticket.author_id);

  res.json({
    success: true,
    data: updatedTicket,
    message: 'Ticket updated successfully',
  });
};

export const addMessage = (req: Request, res: Response): void => {
  const { id } = req.params;
  const parseResult = addMessageSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: parseResult.error.issues[0]?.message || 'Message content required',
    });
    return;
  }

  const ticket = db.prepare('SELECT * FROM tickets WHERE ticket_id = ?').get(id) as any;
  if (!ticket) {
    res.status(404).json({ success: false, error: 'Ticket not found' });
    return;
  }

  const isAuthor = req.user?.role === 'author';
  const authorId = req.user?.author_id || req.user?.id;

  if (isAuthor && ticket.author_id !== authorId) {
    res.status(403).json({ success: false, error: 'Access denied' });
    return;
  }

  const senderType = isAuthor ? 'author' : 'admin';
  const senderId = req.user?.id || 'unknown';
  const senderName = req.user?.name || (isAuthor ? 'Author' : 'BookLeaf Support');
  const now = new Date().toISOString();

  const messageId = `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  db.prepare(`
    INSERT INTO ticket_messages (
      message_id, ticket_id, sender_type, sender_id, sender_name, content, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(messageId, id, senderType, senderId, senderName, parseResult.data.content, now);

  // If admin responds to an Open ticket, update status to 'In Progress'
  let newStatus = ticket.status;
  if (!isAuthor && ticket.status === 'Open') {
    newStatus = 'In Progress';
  }

  db.prepare(`
    UPDATE tickets 
    SET status = ?, updated_at = ? 
    WHERE ticket_id = ?
  `).run(newStatus, now, id);

  const message = {
    message_id: messageId,
    ticket_id: id,
    sender_type: senderType,
    sender_id: senderId,
    sender_name: senderName,
    content: parseResult.data.content,
    created_at: now,
  };

  // Broadcast message to author & admins in real time
  realtimeService.broadcast('message:created', message, ticket.author_id);
  realtimeService.broadcast('ticket:updated', { ...ticket, status: newStatus, updated_at: now }, ticket.author_id);

  res.status(201).json({
    success: true,
    data: message,
  });
};

export const addInternalNote = (req: Request, res: Response): void => {
  const { id } = req.params;
  const parseResult = addNoteSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: parseResult.error.issues[0]?.message || 'Note content required',
    });
    return;
  }

  const ticket = db.prepare('SELECT * FROM tickets WHERE ticket_id = ?').get(id) as any;
  if (!ticket) {
    res.status(404).json({ success: false, error: 'Ticket not found' });
    return;
  }

  const adminId = req.user?.admin_id || req.user?.id || 'ADMIN';
  const adminName = req.user?.name || 'Operations Lead';
  const now = new Date().toISOString();
  const noteId = `NOTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  db.prepare(`
    INSERT INTO ticket_internal_notes (
      note_id, ticket_id, admin_id, admin_name, content, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(noteId, id, adminId, adminName, parseResult.data.content, now);

  const note = {
    note_id: noteId,
    ticket_id: id,
    admin_id: adminId,
    admin_name: adminName,
    content: parseResult.data.content,
    created_at: now,
  };

  // Broadcast note strictly to admins
  realtimeService.broadcast('note:created', note);

  res.status(201).json({
    success: true,
    data: note,
  });
};

export const getOrGenerateAIDraft = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const ticket = db.prepare(`
    SELECT t.*, a.name as author_name, a.email as author_email, a.city as author_city
    FROM tickets t
    JOIN authors a ON t.author_id = a.author_id
    WHERE t.ticket_id = ?
  `).get(id) as any;

  if (!ticket) {
    res.status(404).json({ success: false, error: 'Ticket not found' });
    return;
  }

  let book: any = null;
  if (ticket.book_id) {
    book = db.prepare('SELECT * FROM books WHERE book_id = ?').get(ticket.book_id);
  }

  // If already cached and valid, return it
  if (ticket.ai_draft_response && !req.query.force) {
    res.json({
      success: true,
      data: {
        draft: ticket.ai_draft_response,
        cached: true,
      },
    });
    return;
  }

  // Generate on demand
  try {
    const draftResult = await aiService.generateDraftResponse(
      { subject: ticket.subject, description: ticket.description, category: ticket.category },
      {
        author_id: ticket.author_id,
        name: ticket.author_name,
        email: ticket.author_email,
        city: ticket.author_city,
      },
      book || undefined
    );

    // Cache to DB
    db.prepare('UPDATE tickets SET ai_draft_response = ? WHERE ticket_id = ?').run(draftResult.draftResponse, id);

    res.json({
      success: true,
      data: {
        draft: draftResult.draftResponse,
        cached: false,
        provider: draftResult.provider,
        is_fallback: draftResult.isFallback,
        context_used: draftResult.relevantContextUsed,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI draft: ' + (err.message || 'Unknown error'),
    });
  }
};

export const regenerateAIDraft = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const parseResult = regenerateDraftSchema.safeParse(req.body);
  const customInstructions = parseResult.success ? parseResult.data.custom_instructions : undefined;

  const ticket = db.prepare(`
    SELECT t.*, a.name as author_name, a.email as author_email, a.city as author_city
    FROM tickets t
    JOIN authors a ON t.author_id = a.author_id
    WHERE t.ticket_id = ?
  `).get(id) as any;

  if (!ticket) {
    res.status(404).json({ success: false, error: 'Ticket not found' });
    return;
  }

  let book: any = null;
  if (ticket.book_id) {
    book = db.prepare('SELECT * FROM books WHERE book_id = ?').get(ticket.book_id);
  }

  try {
    const draftResult = await aiService.generateDraftResponse(
      { subject: ticket.subject, description: ticket.description, category: ticket.category },
      {
        author_id: ticket.author_id,
        name: ticket.author_name,
        email: ticket.author_email,
        city: ticket.author_city,
      },
      book || undefined,
      customInstructions
    );

    // Save newly generated draft
    db.prepare('UPDATE tickets SET ai_draft_response = ? WHERE ticket_id = ?').run(draftResult.draftResponse, id);

    res.json({
      success: true,
      data: {
        draft: draftResult.draftResponse,
        provider: draftResult.provider,
        is_fallback: draftResult.isFallback,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate draft: ' + (err.message || 'Unknown error'),
    });
  }
};
