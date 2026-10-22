import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'bookleaf.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);

// Enable WAL mode for high performance and concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS authors (
      author_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT,
      city TEXT,
      role TEXT NOT NULL DEFAULT 'author',
      joined_date TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admins (
      admin_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      title TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS books (
      book_id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      title TEXT NOT NULL,
      isbn TEXT,
      genre TEXT,
      publication_date TEXT,
      status TEXT NOT NULL,
      mrp REAL,
      author_royalty_per_copy REAL,
      total_copies_sold INTEGER NOT NULL DEFAULT 0,
      total_royalty_earned REAL NOT NULL DEFAULT 0,
      royalty_paid REAL NOT NULL DEFAULT 0,
      royalty_pending REAL NOT NULL DEFAULT 0,
      last_royalty_payout_date TEXT,
      print_partner TEXT,
      available_on TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (author_id) REFERENCES authors (author_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tickets (
      ticket_id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      book_id TEXT,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      ai_category TEXT NOT NULL,
      priority TEXT NOT NULL,
      ai_priority TEXT NOT NULL,
      ai_reasoning TEXT,
      ai_draft_response TEXT,
      status TEXT NOT NULL DEFAULT 'Open',
      assigned_to TEXT,
      attachment_name TEXT,
      attachment_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY (author_id) REFERENCES authors (author_id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES books (book_id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS ticket_messages (
      message_id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      sender_type TEXT NOT NULL, -- 'author' | 'admin' | 'system'
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES tickets (ticket_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ticket_internal_notes (
      note_id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      admin_id TEXT NOT NULL,
      admin_name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES tickets (ticket_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_books_author_id ON books(author_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_author_id ON tickets(author_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
    CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
    CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON ticket_messages(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_notes_ticket_id ON ticket_internal_notes(ticket_id);
  `);
}
