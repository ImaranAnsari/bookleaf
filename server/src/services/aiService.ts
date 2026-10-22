import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

export type TicketCategory =
  | 'Royalty & Payments'
  | 'ISBN & Metadata Issues'
  | 'Printing & Quality'
  | 'Distribution & Availability'
  | 'Book Status & Production Updates'
  | 'General Inquiry';

export type TicketPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface AuthorBookContext {
  book_id?: string;
  title?: string;
  isbn?: string;
  genre?: string;
  status?: string;
  mrp?: number | null;
  author_royalty_per_copy?: number | null;
  total_copies_sold?: number;
  total_royalty_earned?: number;
  royalty_paid?: number;
  royalty_pending?: number;
  last_royalty_payout_date?: string | null;
  print_partner?: string | null;
  available_on?: string[];
}

export interface AuthorContext {
  author_id: string;
  name: string;
  email: string;
  city?: string;
  joined_date?: string;
  books?: AuthorBookContext[];
}

export interface AIClassificationResult {
  category: TicketCategory;
  priority: TicketPriority;
  reasoning: string;
  provider: 'gemini' | 'openai' | 'fallback-engine';
  isFallback: boolean;
}

export interface AIDraftResult {
  draftResponse: string;
  relevantContextUsed: string[];
  provider: 'gemini' | 'openai' | 'fallback-engine';
  isFallback: boolean;
}

// Targeted Knowledge Base Sections for Cost-Aware Token Usage
export const KNOWLEDGE_BASE_SECTIONS = {
  company: `BookLeaf Publishing operates in India and the US. Packages: Standard Free (no upfront cost) and Bestseller Breakthrough (premium marketing/distribution). In-house printing in Delhi; partners Repro India & Epitome Books.`,

  royalty: `ROYALTY POLICY:
- 80/20 royalty split: 80% net profit to author, 20% to BookLeaf.
- Net profit = MRP minus printing cost, platform commission (Amazon/Flipkart), and shipping charges.
- Royalties calculated quarterly and paid within 45 days of quarter ending.
- Minimum payout threshold: ₹1,000. If below ₹1,000, rolls over to next quarter.
- Payouts via direct bank transfer to linked account. Full breakdown viewable in author dashboard.`,

  isbn: `ISBN POLICY:
- Unique ISBN assigned under BookLeaf publisher imprint. Authors wanting own imprint obtain independently.
- ISBN errors (mismatches, wrong edition linked on Amazon/Flipkart) are treated as HIGH/CRITICAL PRIORITY and escalated immediately to the production team with a 48-hour resolution timeline.`,

  printing: `PRINTING & QUALITY POLICY:
- Standard print turnaround: 5–7 business days from order confirmation.
- Quality issues (misprints, binding defects, paper/color inconsistency): apologize sincerely, request photos of defective copies, BookLeaf arranges a 100% free reprint once verified (5–7 business days).`,

  distribution: `DISTRIBUTION & AVAILABILITY POLICY:
- Listed on Amazon India, Flipkart, Amazon US, Amazon UK, and BookLeaf Store.
- New listings take 7–10 business days after publication.
- "Currently Unavailable" status on Amazon is usually a stock sync issue: operations triggers re-sync within 24–48 hours.`,

  production: `PRODUCTION STAGES:
- Manuscript Received → Editing → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live.
- Delays typically happen during Cover Design (author approval) or Proofreading (revision rounds). Ops provides specific updated timeline with collaborative framing.`
};

const COMMUNICATION_TONE_GUIDELINES = `
COMMUNICATION TONE & RULES:
1. Empathetic and professional: Authors are our creative partners, not support tickets.
2. Acknowledge concerns directly before providing technical details.
3. Be specific: include actual numbers, figures, dates, and book titles from the author's record.
4. Direct ownership: If it's a BookLeaf issue (delayed royalties, sync glitch, ISBN mismatch), own it without corporate deflection.
5. Provide clear timelines: Use 48-hour escalation windows or 5–7 business days for reprints.
6. End with concrete next steps for both author and BookLeaf operations.
`;

/**
 * Intelligent AI Service with Google Gemini, OpenAI, and graceful local fallback.
 */
class AIService {
  private geminiClient: GoogleGenAI | null = null;
  private openaiClient: OpenAI | null = null;

  constructor() {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey) {
      try {
        this.geminiClient = new GoogleGenAI({ apiKey: geminiKey });
      } catch (err) {
        console.warn('[AIService] Failed to initialize Google GenAI:', err);
      }
    }

    if (openaiKey) {
      try {
        this.openaiClient = new OpenAI({ apiKey: openaiKey });
      } catch (err) {
        console.warn('[AIService] Failed to initialize OpenAI:', err);
      }
    }
  }

  /**
   * Helper to retrieve only relevant knowledge base sections (Requirement D.4: Cost Awareness)
   */
  private getRelevantKnowledgeSections(query: string, bookStatus?: string): { context: string; sectionNames: string[] } {
    const lower = query.toLowerCase();
    const sections: string[] = ['company'];

    if (lower.includes('royalt') || lower.includes('payout') || lower.includes('payment') || lower.includes('money') || lower.includes('₹') || lower.includes('rs') || lower.includes('earn') || lower.includes('bank') || lower.includes('sale') || lower.includes('sold')) {
      sections.push('royalty');
    }
    if (lower.includes('isbn') || lower.includes('metadata') || lower.includes('imprint') || lower.includes('wrong book')) {
      sections.push('isbn');
    }
    if (lower.includes('print') || lower.includes('defect') || lower.includes('blurry') || lower.includes('misprint') || lower.includes('binding') || lower.includes('paper') || lower.includes('quality') || lower.includes('damage') || lower.includes('reprint')) {
      sections.push('printing');
    }
    if (lower.includes('amazon') || lower.includes('flipkart') || lower.includes('unavailable') || lower.includes('out of stock') || lower.includes('listing') || lower.includes('store') || lower.includes('delivery')) {
      sections.push('distribution');
    }
    if (lower.includes('typesetting') || lower.includes('proofreading') || lower.includes('cover') || lower.includes('stage') || lower.includes('status') || lower.includes('manuscript') || lower.includes('editing') || (bookStatus && bookStatus.includes('Production'))) {
      sections.push('production');
    }

    // Default general context if nothing matched
    if (sections.length === 1) {
      sections.push('royalty', 'distribution');
    }

    const combined = sections
      .map((key) => KNOWLEDGE_BASE_SECTIONS[key as keyof typeof KNOWLEDGE_BASE_SECTIONS])
      .join('\n\n');

    return { context: combined, sectionNames: sections };
  }

  /**
   * Auto-Classify Category and Priority
   */
  async classifyTicket(subject: string, description: string, book?: AuthorBookContext): Promise<AIClassificationResult> {
    const fullText = `${subject}\n${description}`;

    // 1. Try Gemini if configured
    if (this.geminiClient) {
      try {
        const response = await this.geminiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `You are an AI Ticket Classifier for BookLeaf Publishing.
Classify incoming author tickets into EXACTLY one category and priority level.

Valid Categories:
- "Royalty & Payments" (royalties, payments, calculations, bank transfers, payout delays)
- "ISBN & Metadata Issues" (ISBN mismatches, duplicate ISBN, book details, title errors on retailers)
- "Printing & Quality" (damaged copies, misprints, binding defects, blurry images)
- "Distribution & Availability" (Amazon/Flipkart unavailable, stock sync, listing go-live)
- "Book Status & Production Updates" (manuscript, cover design, typesetting, proofreading stages)
- "General Inquiry" (bio updates, packaging, general author questions)

Valid Priorities:
- "Critical": Long overdue payments (>3-6 months), severe data/ISBN errors on retail stores, damaged bulk shipment
- "High": Unresolved payment queries, Amazon out-of-stock sync, single defective author copies, ISBN mismatch
- "Medium": Production status questions, metadata edit requests, royalty calculation explanations
- "Low": General informational inquiries, bio updates, minor cosmetic questions

Author Ticket:
Subject: ${subject}
Description: ${description}
Associated Book: ${book ? `${book.title} (Status: ${book.status})` : 'General / Account Level'}

Return ONLY valid JSON matching this schema:
{
  "category": "Royalty & Payments",
  "priority": "High",
  "reasoning": "Brief explanation of why this category and priority were selected"
}`,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const raw = response.text?.trim() || '';
        const parsed = JSON.parse(raw);
        if (parsed.category && parsed.priority) {
          return {
            category: parsed.category as TicketCategory,
            priority: parsed.priority as TicketPriority,
            reasoning: parsed.reasoning || 'Classified by Gemini AI model based on query severity and keywords.',
            provider: 'gemini',
            isFallback: false,
          };
        }
      } catch (err) {
        console.warn('[AIService] Gemini classification error, trying OpenAI or fallback:', err);
      }
    }

    // 2. Try OpenAI if configured
    if (this.openaiClient) {
      try {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an AI Ticket Classifier for BookLeaf Publishing. Respond in strict JSON only.',
            },
            {
              role: 'user',
              content: `Classify ticket:
Subject: ${subject}
Description: ${description}
Book: ${book?.title || 'None'}

Valid categories: ["Royalty & Payments", "ISBN & Metadata Issues", "Printing & Quality", "Distribution & Availability", "Book Status & Production Updates", "General Inquiry"]
Valid priorities: ["Critical", "High", "Medium", "Low"]

Return JSON: {"category": "...", "priority": "...", "reasoning": "..."}`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        });

        const raw = completion.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(raw);
        if (parsed.category && parsed.priority) {
          return {
            category: parsed.category as TicketCategory,
            priority: parsed.priority as TicketPriority,
            reasoning: parsed.reasoning || 'Classified by OpenAI GPT-4o-mini.',
            provider: 'openai',
            isFallback: false,
          };
        }
      } catch (err) {
        console.warn('[AIService] OpenAI classification error, falling back:', err);
      }
    }

    // 3. Graceful Fallback Engine (Requirement D.3: Graceful Degradation)
    return this.fallbackClassify(fullText, book);
  }

  /**
   * Rule-based Fallback Classification Engine
   */
  private fallbackClassify(text: string, book?: AuthorBookContext): AIClassificationResult {
    const lower = text.toLowerCase();

    // Priority scoring rules from spec
    let priority: TicketPriority = 'Medium';
    let category: TicketCategory = 'General Inquiry';
    let reasoning = 'Classified via BookLeaf Semantic Policy Engine.';

    // Check Critical / High indicators
    const isOverdueRoyalty = lower.includes('haven\'t received') || lower.includes('not received') || lower.includes('4 months') || lower.includes('6 months') || lower.includes('missing payment');
    const isIsbnMismatch = lower.includes('different isbn') || lower.includes('wrong isbn') || lower.includes('duplicate isbn');
    const isPrintDefect = lower.includes('terrible') || lower.includes('misprint') || lower.includes('blurry') || lower.includes('misaligned') || lower.includes('damaged');
    const isUnavailable = lower.includes('unavailable') || lower.includes('out of stock') || lower.includes('stock sync');

    if (lower.includes('royalt') || lower.includes('payout') || lower.includes('commission') || lower.includes('sold') || lower.includes('₹') || lower.includes('payment')) {
      category = 'Royalty & Payments';
      if (isOverdueRoyalty) {
        priority = 'Critical';
        reasoning = 'High severity: Author reports delayed/unreceived royalties over multiple months.';
      } else if (lower.includes('too low') || lower.includes('mismatch')) {
        priority = 'High';
        reasoning = 'Financial query regarding royalty discrepancy or calculation.';
      } else {
        priority = 'Medium';
        reasoning = 'Standard royalty inquiry.';
      }
    } else if (lower.includes('isbn') || lower.includes('metadata') || lower.includes('imprint') || isIsbnMismatch) {
      category = 'ISBN & Metadata Issues';
      priority = isIsbnMismatch ? 'High' : 'Medium';
      reasoning = isIsbnMismatch
        ? 'High priority: External retail data mismatch (ISBN) affecting book catalog integrity.'
        : 'Author inquiry regarding metadata or imprint registration.';
    } else if (lower.includes('print') || lower.includes('binding') || lower.includes('paper') || isPrintDefect) {
      category = 'Printing & Quality';
      priority = isPrintDefect ? 'High' : 'Medium';
      reasoning = 'Physical copy quality issue requiring photographic proof and potential free reprint.';
    } else if (lower.includes('amazon') || lower.includes('flipkart') || isUnavailable || lower.includes('listing')) {
      category = 'Distribution & Availability';
      priority = isUnavailable ? 'High' : 'Medium';
      reasoning = isUnavailable
        ? 'Retail availability impediment on major sales channels (Amazon/Flipkart).'
        : 'Distribution and retail availability query.';
    } else if (lower.includes('typesetting') || lower.includes('proofreading') || lower.includes('cover') || lower.includes('stage') || (book && book.status?.includes('Production'))) {
      category = 'Book Status & Production Updates';
      priority = lower.includes('weeks') || lower.includes('delay') ? 'High' : 'Medium';
      reasoning = 'Production workflow tracking inquiry regarding book status.';
    } else {
      category = 'General Inquiry';
      priority = 'Low';
      reasoning = 'General author account or informational request.';
    }

    return {
      category,
      priority,
      reasoning,
      provider: 'fallback-engine',
      isFallback: true,
    };
  }

  /**
   * Generate AI Draft Response
   * Adheres strictly to the BookLeaf Tone Guidelines, Knowledge Base, and Author Data
   */
  async generateDraftResponse(
    ticket: { subject: string; description: string; category: string },
    author: AuthorContext,
    book?: AuthorBookContext,
    customInstructions?: string
  ): Promise<AIDraftResult> {
    const { context: kbContext, sectionNames } = this.getRelevantKnowledgeSections(
      `${ticket.subject} ${ticket.description}`,
      book?.status
    );

    let platformList = 'Not yet listed';
    if (book?.available_on) {
      if (Array.isArray(book.available_on)) {
        platformList = book.available_on.join(', ');
      } else if (typeof book.available_on === 'string') {
        try {
          const parsed = JSON.parse(book.available_on);
          platformList = Array.isArray(parsed) ? parsed.join(', ') : book.available_on;
        } catch {
          platformList = book.available_on;
        }
      }
    }

    const authorFinancialSummary = book
      ? `BOOK DETAILS:
- Title: ${book.title}
- Status: ${book.status}
- ISBN: ${book.isbn || 'Pending'}
- MRP: ${book.mrp ? `₹${book.mrp}` : 'N/A'}
- Author Royalty Per Copy: ${book.author_royalty_per_copy ? `₹${book.author_royalty_per_copy}` : 'N/A'}
- Total Copies Sold: ${book.total_copies_sold || 0}
- Total Royalty Earned: ₹${book.total_royalty_earned || 0}
- Royalty Paid: ₹${book.royalty_paid || 0}
- Royalty Pending: ₹${book.royalty_pending || 0}
- Last Payout Date: ${book.last_royalty_payout_date || 'No payouts yet'}
- Print Partner: ${book.print_partner || 'In-House'}
- Platforms: ${platformList}`
      : `No specific book selected (General Account level inquiry). Author has ${author.books?.length || 0} books registered.`;

    const systemPrompt = `You are an expert Author Success Representative at BookLeaf Publishing.
Your task is to draft a helpful, professional, and empathetic response to an author's support ticket.

${COMMUNICATION_TONE_GUIDELINES}

BOOKLEAF KNOWLEDGE BASE CONTEXT:
${kbContext}

AUTHOR CONTEXT:
Author Name: ${author.name}
Email: ${author.email}
City: ${author.city || 'India'}
${authorFinancialSummary}

${customInstructions ? `ADMIN INSTRUCTION: ${customInstructions}` : ''}

CRITICAL INSTRUCTIONS:
- Address the author by their first name (${author.name.split(' ')[0]}).
- Be empathetic and warm. Acknowledge their specific issue before explaining the solution.
- Cite accurate numbers from their records (copies sold, payout dates, amounts, book title).
- If it's a BookLeaf issue (delayed payouts, stock sync, print defects), apologize sincerely and take ownership.
- Include a specific timeline (e.g. 48 hours for escalation, 5-7 business days for reprints, 24-48 hours for Amazon sync).
- End with a warm closing and sign off as "BookLeaf Author Support Team".`;

    const userPrompt = `Ticket Category: ${ticket.category}
Subject: ${ticket.subject}
Query: ${ticket.description}`;

    // 1. Try Gemini
    if (this.geminiClient) {
      try {
        const response = await this.geminiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `${systemPrompt}\n\n${userPrompt}`,
          config: {
            temperature: 0.3,
          },
        });

        const draft = response.text?.trim();
        if (draft) {
          return {
            draftResponse: draft,
            relevantContextUsed: sectionNames,
            provider: 'gemini',
            isFallback: false,
          };
        }
      } catch (err) {
        console.warn('[AIService] Gemini draft generation error, trying OpenAI or fallback:', err);
      }
    }

    // 2. Try OpenAI
    if (this.openaiClient) {
      try {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
        });

        const draft = completion.choices[0]?.message?.content?.trim();
        if (draft) {
          return {
            draftResponse: draft,
            relevantContextUsed: sectionNames,
            provider: 'openai',
            isFallback: false,
          };
        }
      } catch (err) {
        console.warn('[AIService] OpenAI draft generation error, falling back:', err);
      }
    }

    // 3. Graceful Fallback Template Engine
    return {
      draftResponse: this.fallbackDraftResponse(ticket, author, book),
      relevantContextUsed: sectionNames,
      provider: 'fallback-engine',
      isFallback: true,
    };
  }

  /**
   * Deterministic Fallback Draft Response calibrated from sample cases in spec
   */
  private fallbackDraftResponse(
    ticket: { subject: string; description: string; category: string },
    author: AuthorContext,
    book?: AuthorBookContext
  ): string {
    const firstName = author.name.split(' ')[0];
    const bookTitle = book ? `"${book.title}"` : 'your book';
    const lower = `${ticket.subject} ${ticket.description}`.toLowerCase();

    // Case 1: Delayed Royalty (Page 6 Sample Query)
    if (lower.includes('haven\'t received') || lower.includes('4 months') || lower.includes('not received any royalty')) {
      return `Dear ${firstName},

Thank you for reaching out, and I completely understand your frustration regarding your royalty payout for ${bookTitle}. You put immense dedication into writing your book, and timely royalties are of utmost importance.

At BookLeaf, royalties are processed on a quarterly cycle and disbursed within 45 days after the close of the quarter. For ${bookTitle}, our records show you have sold ${book?.total_copies_sold || 0} copies with an accumulated royalty of ₹${book?.total_royalty_earned?.toLocaleString() || '0'}. 

We show a pending royalty balance of ₹${book?.royalty_pending?.toLocaleString() || '0'}. I have escalated this immediately to our finance operations desk to verify your linked bank account and expedite processing. 

Our team will investigate and follow up with a concrete confirmation within 48 hours. If you have recently updated your bank details, please let us know.

Warm regards,
Author Support Team
BookLeaf Publishing`;
    }

    // Case 2: Royalty Discrepancy / Low Amount (Page 6 Sample Query)
    if (lower.includes('too low') || (lower.includes('sold') && lower.includes('only received'))) {
      return `Dear ${firstName},

Thank you for contacting us with your question regarding royalty calculations for ${bookTitle}. We believe in total financial transparency with all our authors.

Under BookLeaf's 80/20 royalty policy, you receive 80% of the net profit generated on each sale. Net profit is calculated as the book's MRP minus the actual printing cost, platform commissions (such as Amazon or Flipkart), and standard shipping fees. 

For ${bookTitle} (MRP: ₹${book?.mrp || 350}), your earned royalty per copy is ₹${book?.author_royalty_per_copy || 30}. With ${book?.total_copies_sold || 0} copies sold to date, your total earnings stand at ₹${book?.total_royalty_earned?.toLocaleString() || '0'}, of which ₹${book?.royalty_paid?.toLocaleString() || '0'} has been disbursed.

We would be glad to provide you with a comprehensive, line-by-line platform sales breakdown. Please let us know if you would like this report generated for your records.

Warm regards,
Author Support Team
BookLeaf Publishing`;
    }

    // Case 3: ISBN Mismatch (Page 6 Sample Query)
    if (lower.includes('isbn') && (lower.includes('different') || lower.includes('wrong') || lower.includes('amazon'))) {
      return `Dear ${firstName},

Thank you for bringing this to our attention. We treat ISBN and retail catalog discrepancies with the highest priority, and we sincerely apologize for any confusion this has caused.

The official ISBN registered under BookLeaf's imprint for ${bookTitle} is ${book?.isbn || 'registered in our system'}. An ISBN mismatch on retail channels like Amazon can impact indexing, so I have escalated this directly to our production and distribution leads for immediate remediation.

Our team will coordinate with Amazon to synchronize the metadata and update you within 48 hours once the correction is submitted.

Thank you for your vigilance and partnership.

Warm regards,
Author Support Team
BookLeaf Publishing`;
    }

    // Case 4: Print Quality & Defective Copies (Page 7 Sample Query)
    if (lower.includes('print quality') || lower.includes('terrible') || lower.includes('blurry') || lower.includes('misaligned')) {
      return `Dear ${firstName},

Please accept our sincere apologies for the condition of your author copies for ${bookTitle}. This certainly does not meet BookLeaf's standard of print excellence.

To help us rectify this right away, could you please reply with 2–3 clear photographs highlighting the print defects, page misalignment, or blurry elements? 

Once our quality team verifies the defect, BookLeaf will immediately arrange a 100% free reprint of your copies. Verified reprints are prioritized and dispatched within 5–7 business days.

We are truly sorry for the inconvenience and look forward to resolving this swiftly for you.

Warm regards,
Author Support Team
BookLeaf Publishing`;
    }

    // Case 5: Amazon Currently Unavailable (Page 7 Sample Query)
    if (lower.includes('unavailable') || (lower.includes('amazon') && lower.includes('not showing'))) {
      return `Dear ${firstName},

Thank you for reaching out about the listing for ${bookTitle} on Amazon.

Seeing your book marked as "Currently Unavailable" is understandably alarming, but this is typically a routine inventory sync issue between retailer warehouses and our catalog. 

We have triggered an immediate distribution re-sync with Amazon's marketplace team. Stock availability listings normally refresh and reflect active status within 24–48 hours.

We will keep a close eye on the listing and send you a confirmation once it is live again.

Warm regards,
Author Support Team
BookLeaf Publishing`;
    }

    // Case 6: Production Status / Typesetting Delays (Page 7 Sample Query)
    if (lower.includes('typesetting') || lower.includes('still in') || (book && book.status?.includes('Production'))) {
      return `Dear ${firstName},

Thank you for checking in on the progress of ${bookTitle}. We know how exciting it is to see your manuscript transform into a published book!

Your book is currently in the ${book?.status || 'Typesetting'} stage. Our design team carefully formats every page layout and chapter header to ensure the highest publishing standard. 

We are scheduling your proof copy review within the next 4–5 business days. You will receive an email as soon as the digital proofs are uploaded to your dashboard for your review and approval.

Thank you so much for your patience as we bring ${bookTitle} to life.

Warm regards,
Author Support Team
BookLeaf Publishing`;
    }

    // Default General Response (Empathetic & Professional)
    return `Dear ${firstName},

Thank you for getting in touch with the BookLeaf Author Support team.

We have received your query regarding "${ticket.subject}" and our team is actively reviewing the details. For metadata or account updates, modifications typically reflect across internal systems and partner retail platforms within 3–5 business days.

If any additional information is needed to assist you, we will follow up on this ticket thread directly. 

Thank you for your valued partnership with BookLeaf Publishing!

Warm regards,
Author Support Team
BookLeaf Publishing`;
  }
}

export const aiService = new AIService();
