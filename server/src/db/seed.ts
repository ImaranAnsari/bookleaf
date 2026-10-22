import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { db, initDatabase } from './database.js';

interface RawBook {
  book_id: string;
  title: string;
  isbn: string;
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
}

interface RawAuthor {
  author_id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  joined_date: string;
  books: RawBook[];
}

interface SampleData {
  authors: RawAuthor[];
}

export function seed() {
  console.log('🌱 Starting BookLeaf database seeding...');

  // Ensure tables exist
  initDatabase();

  // Clear existing records to ensure idempotent clean seed
  db.exec(`
    DELETE FROM ticket_internal_notes;
    DELETE FROM ticket_messages;
    DELETE FROM tickets;
    DELETE FROM books;
    DELETE FROM authors;
    DELETE FROM admins;
  `);

  const passwordHash = bcrypt.hashSync('author123', 10);
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);
  const now = new Date().toISOString();

  // 1. Seed Admin Accounts
  const insertAdmin = db.prepare(`
    INSERT INTO admins (admin_id, name, email, password_hash, role, title, created_at)
    VALUES (?, ?, ?, ?, 'admin', ?, ?)
  `);

  insertAdmin.run(
    'ADM001',
    'Aarav Mehta',
    'admin@bookleafpub.com',
    adminPasswordHash,
    'Head of Operations & Author Success',
    now
  );

  insertAdmin.run(
    'ADM002',
    'Simran Kaur',
    'support@bookleafpub.com',
    adminPasswordHash,
    'Senior Author Success Specialist',
    now
  );

  console.log('✅ Seeded 2 Admin accounts (admin@bookleafpub.com, support@bookleafpub.com)');

  // 2. Read bookleaf_sample_data.json
  const sampleDataPath = path.resolve(process.cwd(), 'bookleaf_sample_data.json');
  if (!fs.existsSync(sampleDataPath)) {
    throw new Error(`Cannot find bookleaf_sample_data.json at ${sampleDataPath}`);
  }

  const rawJson = fs.readFileSync(sampleDataPath, 'utf-8');
  const sampleData: SampleData = JSON.parse(rawJson);

  const insertAuthor = db.prepare(`
    INSERT INTO authors (author_id, name, email, password_hash, phone, city, role, joined_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'author', ?, ?)
  `);

  const insertBook = db.prepare(`
    INSERT INTO books (
      book_id, author_id, title, isbn, genre, publication_date, status,
      mrp, author_royalty_per_copy, total_copies_sold, total_royalty_earned,
      royalty_paid, royalty_pending, last_royalty_payout_date, print_partner,
      available_on, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let bookCount = 0;

  for (const author of sampleData.authors) {
    insertAuthor.run(
      author.author_id,
      author.name,
      author.email,
      passwordHash,
      author.phone,
      author.city,
      author.joined_date,
      now
    );

    for (const book of author.books) {
      insertBook.run(
        book.book_id,
        author.author_id,
        book.title,
        book.isbn,
        book.genre,
        book.publication_date,
        book.status,
        book.mrp,
        book.author_royalty_per_copy,
        book.total_copies_sold || 0,
        book.total_royalty_earned || 0,
        book.royalty_paid || 0,
        book.royalty_pending || 0,
        book.last_royalty_payout_date,
        book.print_partner,
        JSON.stringify(book.available_on || []),
        now
      );
      bookCount++;
    }
  }

  console.log(`✅ Seeded ${sampleData.authors.length} authors and ${bookCount} books from official dataset`);

  // 3. Pre-seed Realistic Sample Tickets (representing cases from PDF specification)
  const insertTicket = db.prepare(`
    INSERT INTO tickets (
      ticket_id, author_id, book_id, subject, description, category, ai_category,
      priority, ai_priority, ai_reasoning, ai_draft_response, status, assigned_to,
      attachment_name, attachment_url, created_at, updated_at, resolved_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMessage = db.prepare(`
    INSERT INTO ticket_messages (message_id, ticket_id, sender_type, sender_id, sender_name, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertNote = db.prepare(`
    INSERT INTO ticket_internal_notes (note_id, ticket_id, admin_id, admin_name, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Ticket 1: Priya Sharma - Overdue Royalty (Critical)
  insertTicket.run(
    'TCK-1001',
    'AUTH001',
    'BK001',
    'I published my book 4 months ago and still haven\'t received any royalty. What\'s going on?',
    'I published "Whispers of the Ganges" back in June and have sold over 340 copies. It has been over 4 months and my pending royalty of ₹3,570 has not been deposited in my HDFC account.',
    'Royalty & Payments',
    'Royalty & Payments',
    'Critical',
    'Critical',
    'High severity: Author reports delayed/unreceived royalties over multiple months with pending balance > ₹3,000.',
    `Dear Priya,\n\nThank you for reaching out, and I completely understand your frustration regarding your royalty payout for "Whispers of the Ganges". Timely compensation is essential.\n\nAt BookLeaf, royalties are processed on a quarterly cycle and disbursed within 45 days after quarter-end. For "Whispers of the Ganges", our records confirm 342 copies sold with ₹3,570 in pending royalty.\n\nI have escalated this directly to our finance desk to verify your linked bank credentials and expedite disbursement. Our team will resolve this and confirm payment details with you within 48 hours.\n\nWarm regards,\nAuthor Support Team\nBookLeaf Publishing`,
    'Open',
    null,
    null,
    null,
    '2026-03-01T09:30:00Z',
    '2026-03-01T09:30:00Z',
    null
  );
  insertMessage.run(
    'MSG-1001-1',
    'TCK-1001',
    'author',
    'AUTH001',
    'Priya Sharma',
    'I published "Whispers of the Ganges" back in June and have sold over 340 copies. It has been over 4 months and my pending royalty of ₹3,570 has not been deposited in my HDFC account.',
    '2026-03-01T09:30:00Z'
  );

  // Ticket 2: Rohit Kapoor - Low Royalty Explanation (High)
  insertTicket.run(
    'TCK-1002',
    'AUTH002',
    'BK004',
    'My royalty amount seems too low. I sold 200 copies but only received ₹3,000.',
    'On my dashboard for "Startup Sutra", I noticed my recent batch of sales earned lower per copy than expected. Could you break down how the net profit was calculated?',
    'Royalty & Payments',
    'Royalty & Payments',
    'High',
    'High',
    'Financial query regarding royalty discrepancy or formula calculation.',
    `Dear Rohit,\n\nThank you for contacting us with your question regarding royalty calculations for "Startup Sutra". We believe in total financial transparency with our authors.\n\nUnder BookLeaf's 80/20 royalty policy, you receive 80% of net profit per book. Net profit = MRP minus actual printing cost, platform commissions (Amazon/Flipkart), and shipping charges.\n\nFor "Startup Sutra" (MRP: ₹499), your royalty per copy is ₹48. For 1,203 copies sold, total royalty earned is ₹57,744, of which ₹50,000 was paid on Nov 15, 2025.\n\nWe would be delighted to share a line-by-line platform sales breakdown. Let us know if you'd like this generated!\n\nWarm regards,\nBookLeaf Author Support`,
    'In Progress',
    'ADM001',
    null,
    null,
    '2026-03-03T11:15:00Z',
    '2026-03-03T14:20:00Z',
    null
  );
  insertMessage.run(
    'MSG-1002-1',
    'TCK-1002',
    'author',
    'AUTH002',
    'Rohit Kapoor',
    'On my dashboard for "Startup Sutra", I noticed my recent batch of sales earned lower per copy than expected. Could you break down how the net profit was calculated?',
    '2026-03-03T11:15:00Z'
  );
  insertMessage.run(
    'MSG-1002-2',
    'TCK-1002',
    'admin',
    'ADM001',
    'Aarav Mehta',
    'Hello Rohit, thank you for reaching out. Under our 80/20 policy, 80% of net profit (MRP minus printing, retailer commission, and shipping) goes directly to you. Your current earnings stand at ₹57,744 with ₹7,744 pending for the upcoming cycle. I will email you the itemized Amazon & Flipkart statements shortly.',
    '2026-03-03T14:20:00Z'
  );
  insertNote.run(
    'NOTE-1002-1',
    'TCK-1002',
    'ADM001',
    'Aarav Mehta',
    'Sales report exported from Repro India and Amazon Seller Central. Verified that ₹7,744 is scheduled for next month payout cycle.',
    '2026-03-03T14:22:00Z'
  );

  // Ticket 3: Farhan Sheikh - ISBN Mismatch (Critical)
  insertTicket.run(
    'TCK-1003',
    'AUTH008',
    'BK014',
    'My book is showing a different ISBN on Amazon than what\'s on the physical copy.',
    'I received my physical copies of "Ghazal of the Forgotten" with ISBN 978-93-5XXXX-14-1, but the Amazon India listing shows another ISBN number. Readers are confused when ordering.',
    'ISBN & Metadata Issues',
    'ISBN & Metadata Issues',
    'Critical',
    'High',
    'External retail data mismatch (ISBN) affecting book catalog integrity. Escalated to Critical by admin.',
    `Dear Farhan,\n\nThank you for bringing this to our attention. We treat ISBN and retail catalog discrepancies with highest priority, and apologize for this confusion.\n\nThe official ISBN registered under BookLeaf's publisher imprint for "Ghazal of the Forgotten" is 978-93-5XXXX-14-1. We have escalated this directly to our production lead to trigger a retail metadata sync with Amazon.\n\nWe will update you within 48 hours once Amazon verifies the correction.\n\nWarm regards,\nBookLeaf Author Support`,
    'In Progress',
    'ADM002',
    null,
    null,
    '2026-03-04T08:00:00Z',
    '2026-03-04T09:10:00Z',
    null
  );
  insertMessage.run(
    'MSG-1003-1',
    'TCK-1003',
    'author',
    'AUTH008',
    'Farhan Sheikh',
    'I received my physical copies of "Ghazal of the Forgotten" with ISBN 978-93-5XXXX-14-1, but the Amazon India listing shows another ISBN number. Readers are confused when ordering.',
    '2026-03-04T08:00:00Z'
  );
  insertNote.run(
    'NOTE-1003-1',
    'TCK-1003',
    'ADM002',
    'Simran Kaur',
    'Checked Amazon ASIN mapping. An older draft barcode was cached by Amazon India catalog. Sent catalog override ticket to Amazon Vendor Central with imprint certificate.',
    '2026-03-04T09:12:00Z'
  );

  // Ticket 4: Vikram Joshi - Print Quality Issue (High)
  insertTicket.run(
    'TCK-1004',
    'AUTH004',
    'BK006',
    'I received my author copies and the print quality is terrible. The images are blurry and pages are misaligned.',
    'The 10 author copies of "Debugging Life" I ordered arrived today from the Delhi warehouse. The inner diagrams are smudged and several pages in Chapter 3 are trimmed crookedly.',
    'Printing & Quality',
    'Printing & Quality',
    'High',
    'High',
    'Physical copy quality defect requiring photographic verification and free reprint.',
    `Dear Vikram,\n\nPlease accept our sincere apologies for the condition of your author copies for "Debugging Life". This falls far short of BookLeaf's print quality benchmark.\n\nCould you please share 2–3 photos highlighting the smudged diagrams and misaligned pages? As soon as our quality inspection team confirms the defect, BookLeaf will immediately arrange a 100% free reprint of all 10 copies.\n\nReprints take 5–7 business days from verification. We are committed to making this right.\n\nWarm regards,\nBookLeaf Author Support`,
    'Open',
    null,
    'damaged_pages_sample.jpg',
    'https://placehold.co/600x400?text=Damaged+Copies+Proof',
    '2026-03-04T12:00:00Z',
    '2026-03-04T12:00:00Z',
    null
  );
  insertMessage.run(
    'MSG-1004-1',
    'TCK-1004',
    'author',
    'AUTH004',
    'Vikram Joshi',
    'The 10 author copies of "Debugging Life" I ordered arrived today from the Delhi warehouse. The inner diagrams are smudged and several pages in Chapter 3 are trimmed crookedly.',
    '2026-03-04T12:00:00Z'
  );

  // Ticket 5: Sneha Kulkarni - Amazon Currently Unavailable (High)
  insertTicket.run(
    'TCK-1005',
    'AUTH007',
    'BK011',
    'My book is published but it\'s showing as "Currently Unavailable" on Amazon.',
    'Several of my readers in Bangalore messaged me saying "The Algorithm of Love" says "Currently Unavailable" on Amazon India even though my dashboard says Published & Live.',
    'Distribution & Availability',
    'Distribution & Availability',
    'High',
    'High',
    'Retail availability issue on primary sales channel.',
    `Dear Sneha,\n\nThank you for alerting us about the listing for "The Algorithm of Love" on Amazon India.\n\nSeeing your book marked as "Currently Unavailable" is alarming, but this is typically a routine inventory sync issue between retailer fulfillment centers and our catalog feed.\n\nWe have triggered an immediate distribution re-sync with Amazon's marketplace team. Stock availability normally refreshes within 24–48 hours. We will monitor the ASIN closely until it reflects "In Stock".\n\nWarm regards,\nBookLeaf Author Support`,
    'In Progress',
    'ADM001',
    null,
    null,
    '2026-03-03T16:00:00Z',
    '2026-03-04T10:00:00Z',
    null
  );
  insertMessage.run(
    'MSG-1005-1',
    'TCK-1005',
    'author',
    'AUTH007',
    'Sneha Kulkarni',
    'Several of my readers in Bangalore messaged me saying "The Algorithm of Love" says "Currently Unavailable" on Amazon India even though my dashboard says Published & Live.',
    '2026-03-03T16:00:00Z'
  );
  insertMessage.run(
    'MSG-1005-2',
    'TCK-1005',
    'admin',
    'ADM001',
    'Aarav Mehta',
    'Hi Sneha, our distribution coordinator has pushed an emergency stock sync API call to Amazon India. The listing should refresh within 24 hours. We are monitoring this closely.',
    '2026-03-04T10:00:00Z'
  );

  // Ticket 6: Kavita Deshmukh - In Production Typesetting Delay (Medium -> Resolved)
  insertTicket.run(
    'TCK-1006',
    'AUTH009',
    'BK015',
    'It\'s been 3 weeks and my book is still in typesetting. When will it be done?',
    'I submitted my manuscript for "Raising Roots" 3 weeks ago. The status has remained at "In Production - Typesetting" for a while. Could you provide an estimated date for the digital proof?',
    'Book Status & Production Updates',
    'Book Status & Production Updates',
    'Medium',
    'Medium',
    'Production workflow tracking query for book currently in production.',
    `Dear Kavita,\n\nThank you for checking in on "Raising Roots"! We know how eager you are to see your book completed.\n\nYour book is currently in Typesetting. Because "Raising Roots" includes specialized parenting formatting and tables, our designers are ensuring meticulous typography.\n\nTypesetting is scheduled to finish this Friday, following which your digital proof copy will be uploaded to your dashboard for approval. You will receive an email as soon as it is ready!\n\nWarm regards,\nBookLeaf Author Support`,
    'Resolved',
    'ADM002',
    null,
    null,
    '2026-02-28T10:00:00Z',
    '2026-03-01T15:30:00Z',
    '2026-03-01T15:30:00Z'
  );
  insertMessage.run(
    'MSG-1006-1',
    'TCK-1006',
    'author',
    'AUTH009',
    'Kavita Deshmukh',
    'I submitted my manuscript for "Raising Roots" 3 weeks ago. The status has remained at "In Production - Typesetting" for a while. Could you provide an estimated date for the digital proof?',
    '2026-02-28T10:00:00Z'
  );
  insertMessage.run(
    'MSG-1006-2',
    'TCK-1006',
    'admin',
    'ADM002',
    'Simran Kaur',
    'Dear Kavita, typesetting for "Raising Roots" is in its final proofing pass! We have uploaded the initial interior PDF to your portal today. Please review and let us know your feedback.',
    '2026-03-01T15:30:00Z'
  );

  // Ticket 7: Diya Chatterjee - General Description Update (Low -> Resolved)
  insertTicket.run(
    'TCK-1007',
    'AUTH010',
    'BK017',
    'Can I update the description of my book on Amazon after it\'s already live?',
    'I want to add a blurb from a recent literary review to the Amazon product description for "Durga\'s Daughters". How do I submit this update?',
    'General Inquiry',
    'General Inquiry',
    'Low',
    'Low',
    'General author inquiry regarding post-publication metadata updates.',
    `Dear Diya,\n\nYes, absolutely! You can submit description and metadata updates directly to our team. Simply email us the updated text or reply here with the exact description.\n\nOnce submitted, metadata changes typically reflect on Amazon, Flipkart, and the BookLeaf Store within 3–5 business days.\n\nWarm regards,\nBookLeaf Author Support`,
    'Resolved',
    'ADM001',
    null,
    null,
    '2026-02-25T14:00:00Z',
    '2026-02-26T11:00:00Z',
    '2026-02-26T11:00:00Z'
  );
  insertMessage.run(
    'MSG-1007-1',
    'TCK-1007',
    'author',
    'AUTH010',
    'Diya Chatterjee',
    'I want to add a blurb from a recent literary review to the Amazon product description for "Durga\'s Daughters". How do I submit this update?',
    '2026-02-25T14:00:00Z'
  );
  insertMessage.run(
    'MSG-1007-2',
    'TCK-1007',
    'admin',
    'ADM001',
    'Aarav Mehta',
    'Hello Diya! Yes, you can submit updated metadata anytime. Please share the revised blurb text and our team will push the update to Amazon and Flipkart within 3–5 business days.',
    '2026-02-26T11:00:00Z'
  );

  console.log('✅ Seeded 7 realistic tickets spanning all categories, priorities, and workflow states');
  console.log('🎉 Seeding successfully completed!');
}

// Run directly if called as a script
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seed();
}
