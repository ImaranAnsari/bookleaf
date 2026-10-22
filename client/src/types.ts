export interface Author {
  author_id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  role: 'author';
  joined_date?: string;
  created_at?: string;
}

export interface Admin {
  admin_id: string;
  name: string;
  email: string;
  role: 'admin';
  title: string;
  created_at?: string;
}

export interface User {
  id: string;
  author_id?: string;
  admin_id?: string;
  name: string;
  email: string;
  role: 'author' | 'admin';
  title?: string;
  city?: string;
}

export interface Book {
  book_id: string;
  author_id: string;
  title: string;
  isbn: string | null;
  genre: string;
  publication_date: string | null;
  status: string;
  mrp: number | null;
  author_royalty_per_copy: number | null;
  total_copies_sold: number;
  total_royalty_earned: number;
  royalty_paid: number;
  royalty_pending: number;
  last_royalty_payout_date: string | null;
  print_partner: string | null;
  available_on: string[];
  is_production?: boolean;
  is_below_threshold?: boolean;
}

export interface BookSummary {
  totalBooks: number;
  totalCopiesSold: number;
  totalRoyaltyEarned: number;
  totalRoyaltyPaid: number;
  totalRoyaltyPending: number;
  minimumPayoutThreshold: number;
  nextPayoutEligible: boolean;
}

export type TicketCategory =
  | 'Royalty & Payments'
  | 'ISBN & Metadata Issues'
  | 'Printing & Quality'
  | 'Distribution & Availability'
  | 'Book Status & Production Updates'
  | 'General Inquiry';

export type TicketPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export interface TicketMessage {
  message_id: string;
  ticket_id: string;
  sender_type: 'author' | 'admin' | 'system';
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

export interface TicketInternalNote {
  note_id: string;
  ticket_id: string;
  admin_id: string;
  admin_name: string;
  content: string;
  created_at: string;
}

export interface Ticket {
  ticket_id: string;
  author_id: string;
  book_id: string | null;
  subject: string;
  description: string;
  category: TicketCategory;
  ai_category: TicketCategory;
  priority: TicketPriority;
  ai_priority: TicketPriority;
  ai_reasoning: string | null;
  ai_draft_response: string | null;
  status: TicketStatus;
  assigned_to: string | null;
  attachment_name: string | null;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  author_name?: string;
  author_email?: string;
  author_phone?: string;
  author_city?: string;
  author_joined_date?: string;
  book_title?: string;
  book_isbn?: string;
  book_status?: string;
  book_mrp?: number | null;
  book_total_copies_sold?: number;
  book_total_royalty_earned?: number;
  book_royalty_paid?: number;
  book_royalty_pending?: number;
  book_last_payout_date?: string | null;
  book_print_partner?: string | null;
  messages?: TicketMessage[];
  internal_notes?: TicketInternalNote[];
  author_books?: Book[];
  message_count?: number;
  last_message_at?: string;
}

export interface AdminStats {
  tickets: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    criticalUnresolved: number;
    highUnresolved: number;
  };
  categoryBreakdown: { category: string; count: number }[];
  priorityBreakdown: { priority: string; count: number }[];
  oldestUnresolved: {
    ticket_id: string;
    subject: string;
    priority: string;
    created_at: string;
    days_open: number;
  } | null;
  catalog: {
    authorsCount: number;
    booksCount: number;
    totalPendingRoyalties: number;
  };
}
