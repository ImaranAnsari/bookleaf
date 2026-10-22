import { Request, Response } from 'express';
import { db } from '../db/database.js';

export const getMyBooks = (req: Request, res: Response): void => {
  const authorId = req.user?.author_id || req.user?.id;
  if (!authorId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const books = db.prepare('SELECT * FROM books WHERE author_id = ? ORDER BY publication_date DESC, created_at DESC').all(authorId) as any[];

  // Format books and calculate financial summary
  let totalSold = 0;
  let totalEarned = 0;
  let totalPaid = 0;
  let totalPending = 0;

  const formattedBooks = books.map((b) => {
    let platforms = [];
    try {
      platforms = b.available_on ? JSON.parse(b.available_on) : [];
    } catch {
      platforms = [];
    }

    totalSold += b.total_copies_sold || 0;
    totalEarned += b.total_royalty_earned || 0;
    totalPaid += b.royalty_paid || 0;
    totalPending += b.royalty_pending || 0;

    const isProduction = b.status.includes('Production');
    const isBelowThreshold = b.royalty_pending > 0 && b.royalty_pending < 1000;

    return {
      ...b,
      available_on: platforms,
      is_production: isProduction,
      is_below_threshold: isBelowThreshold,
    };
  });

  res.json({
    success: true,
    data: {
      books: formattedBooks,
      summary: {
        totalBooks: formattedBooks.length,
        totalCopiesSold: totalSold,
        totalRoyaltyEarned: totalEarned,
        totalRoyaltyPaid: totalPaid,
        totalRoyaltyPending: totalPending,
        minimumPayoutThreshold: 1000,
        nextPayoutEligible: totalPending >= 1000,
      },
    },
  });
};

export const getAllAuthors = (_req: Request, res: Response): void => {
  const authors = db.prepare(`
    SELECT 
      a.author_id,
      a.name,
      a.email,
      a.phone,
      a.city,
      a.joined_date,
      COUNT(b.book_id) as book_count,
      SUM(COALESCE(b.total_copies_sold, 0)) as total_sales,
      SUM(COALESCE(b.royalty_pending, 0)) as total_pending_royalty
    FROM authors a
    LEFT JOIN books b ON a.author_id = b.author_id
    GROUP BY a.author_id
    ORDER BY a.name ASC
  `).all();

  res.json({ success: true, data: authors });
};

export const getAuthorById = (req: Request, res: Response): void => {
  const { id } = req.params;
  const author = db.prepare('SELECT author_id, name, email, phone, city, joined_date FROM authors WHERE author_id = ?').get(id) as any;

  if (!author) {
    res.status(404).json({ success: false, error: 'Author not found' });
    return;
  }

  const books = db.prepare('SELECT * FROM books WHERE author_id = ?').all(id) as any[];
  const formattedBooks = books.map((b) => ({
    ...b,
    available_on: b.available_on ? JSON.parse(b.available_on) : [],
  }));

  res.json({
    success: true,
    data: {
      ...author,
      books: formattedBooks,
    },
  });
};
