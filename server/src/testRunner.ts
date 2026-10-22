import { db, initDatabase } from './db/database.js';
import { seed } from './db/seed.js';
import { aiService } from './services/aiService.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './middleware/auth.js';

async function runTests() {
  console.log('🧪 Starting BookLeaf Automated Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  try {
    // 1. Seed verification
    seed();
    initDatabase();

    const authorCount = (db.prepare('SELECT COUNT(*) as count FROM authors').get() as any).count;
    assert(authorCount === 10, 'Database contains exactly 10 authors from official dataset', `Found: ${authorCount}`);

    const bookCount = (db.prepare('SELECT COUNT(*) as count FROM books').get() as any).count;
    assert(bookCount === 18, 'Database contains exactly 18 books from official dataset', `Found: ${bookCount}`);

    const adminCount = (db.prepare('SELECT COUNT(*) as count FROM admins').get() as any).count;
    assert(adminCount === 2, 'Database contains 2 pre-seeded admin accounts', `Found: ${adminCount}`);

    // 2. Author Specific Tests
    const priyaBooks = db.prepare('SELECT * FROM books WHERE author_id = ?').all('AUTH001') as any[];
    assert(priyaBooks.length === 2, 'Priya Sharma (AUTH001) has 2 books', `Found: ${priyaBooks.length}`);
    assert(priyaBooks.some((b) => b.title === 'Whispers of the Ganges'), 'Found title "Whispers of the Ganges"');

    // 3. Edge Cases: In-Production and Royalty Threshold
    const snehaBooks = db.prepare('SELECT * FROM books WHERE author_id = ?').all('AUTH007') as any[];
    const prodBook = snehaBooks.find((b) => b.title === 'Midnight in Mysore');
    assert(prodBook && prodBook.status.includes('Production'), 'Sneha has book in production ("Midnight in Mysore")');
    assert(prodBook && prodBook.mrp === null, 'In-production book has null MRP');

    const kavitaBooks = db.prepare('SELECT * FROM books WHERE author_id = ?').all('AUTH009') as any[];
    const nagpurBook = kavitaBooks.find((b) => b.title === 'The Nagpur Notebooks');
    assert(nagpurBook && nagpurBook.royalty_pending === 850, 'Kavita has ₹850 pending royalty (< ₹1,000 threshold)');

    // 4. Pre-seeded realistic tickets check
    const ticketCount = (db.prepare('SELECT COUNT(*) as count FROM tickets').get() as any).count;
    assert(ticketCount === 7, 'Database has 7 pre-seeded tickets spanning categories', `Found: ${ticketCount}`);

    // 5. Test AI Auto-Classification Engine
    console.log('\n🤖 Testing AI Auto-Classification & Policy Logic:');
    
    // Case A: Delayed Royalty
    const royaltyClassification = await aiService.classifyTicket(
      'Haven\'t received royalties for 4 months',
      'My book has sold copies but I have received zero payments in my bank.'
    );
    assert(royaltyClassification.category === 'Royalty & Payments', 'Classified overdue royalty as "Royalty & Payments"', royaltyClassification.category);
    assert(royaltyClassification.priority === 'Critical', 'Classified overdue royalty as Critical priority', royaltyClassification.priority);

    // Case B: ISBN Mismatch
    const isbnClassification = await aiService.classifyTicket(
      'Different ISBN on Amazon listing',
      'The Amazon listing shows a different ISBN number than my printed copies.'
    );
    assert(isbnClassification.category === 'ISBN & Metadata Issues', 'Classified ISBN mismatch as "ISBN & Metadata Issues"', isbnClassification.category);
    assert(['Critical', 'High'].includes(isbnClassification.priority), 'Classified ISBN mismatch as High/Critical priority', isbnClassification.priority);

    // Case C: Defective Print
    const printClassification = await aiService.classifyTicket(
      'Defective misaligned author copies',
      'The book pages are blurry and trimmed poorly.'
    );
    assert(printClassification.category === 'Printing & Quality', 'Classified defect as "Printing & Quality"', printClassification.category);
    assert(printClassification.priority === 'High', 'Classified print defect as High priority', printClassification.priority);

    // 6. Test AI Draft Generation with Knowledge Base Context
    console.log('\n📝 Testing AI Draft Response Generation (Knowledge Base adherence):');
    const draftResult = await aiService.generateDraftResponse(
      {
        subject: 'Haven\'t received royalties for 4 months',
        description: 'My pending royalty of ₹3,570 for Whispers of the Ganges has not been deposited.',
        category: 'Royalty & Payments',
      },
      {
        author_id: 'AUTH001',
        name: 'Priya Sharma',
        email: 'priya.sharma@email.com',
      },
      priyaBooks[0]
    );

    assert(draftResult.draftResponse.length > 50, 'Generated comprehensive draft response');
    assert(draftResult.draftResponse.includes('Priya'), 'Draft greets author by name ("Priya")');
    assert(
      draftResult.draftResponse.includes('48 hours') || draftResult.draftResponse.includes('quarter'),
      'Draft includes specific timeline or quarterly policy'
    );
    assert(draftResult.draftResponse.includes('BookLeaf'), 'Draft signed by BookLeaf');

    // 7. JWT Generation and Token verification
    console.log('\n🔐 Testing Security & Role-Based Access Control:');
    const authorToken = jwt.sign({ id: 'AUTH001', role: 'author', email: 'priya.sharma@email.com' }, JWT_SECRET);
    const decoded: any = jwt.verify(authorToken, JWT_SECRET);
    assert(decoded.role === 'author', 'JWT token signs and decodes author role accurately');

    const adminToken = jwt.sign({ id: 'ADM001', role: 'admin', email: 'admin@bookleafpub.com' }, JWT_SECRET);
    const decodedAdmin: any = jwt.verify(adminToken, JWT_SECRET);
    assert(decodedAdmin.role === 'admin', 'JWT token signs and decodes admin role accurately');

    console.log(`\n========================================`);
    console.log(`Test Results: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
