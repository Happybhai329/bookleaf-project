import { Injectable } from '@nestjs/common';
import {
  TicketCategory,
  TicketPriority,
} from '@bookleaf/shared';
import type {
  ClassificationResult,
  DraftResult,
  TicketContext,
} from '@bookleaf/shared';
import type { AiProvider } from './ai-provider.interface';

interface KeywordRule {
  keywords: string[];
  category: TicketCategory;
  priorityBoost?: TicketPriority;
}

@Injectable()
export class MockAiProvider implements AiProvider {
  private readonly PROVIDER_NAME = 'mock';

  // ─── Classification rules (ordered by precedence) ───────────

  private readonly categoryRules: KeywordRule[] = [
    {
      keywords: [
        'royalty', 'royalties', 'payment', 'payout', 'unpaid', 'earnings',
        'pending payment', 'bank transfer', 'quarterly payment', 'not received payment',
      ],
      category: TicketCategory.ROYALTY_PAYMENTS,
    },
    {
      keywords: [
        'isbn', 'duplicate isbn', 'incorrect isbn', 'wrong isbn', 'isbn error',
        'isbn mismatch', 'metadata', 'wrong title', 'incorrect author name',
      ],
      category: TicketCategory.ISBN_METADATA,
      priorityBoost: TicketPriority.HIGH,
    },
    {
      keywords: [
        'blurry', 'misprint', 'binding', 'damaged', 'print quality', 'color issue',
        'printing defect', 'washed out', 'smudge', 'torn pages', 'ink',
        'paper quality', 'defective copies', 'reprint',
      ],
      category: TicketCategory.PRINTING_QUALITY,
    },
    {
      keywords: [
        'unavailable', 'out of stock', 'listing', 'distribution', 'not listed',
        'amazon listing', 'flipkart listing', 'stock', 'not showing', 'delisted',
        'not available on', 're-sync', 'resync',
      ],
      category: TicketCategory.DISTRIBUTION_AVAILABILITY,
    },
    {
      keywords: [
        'production', 'typesetting', 'proofreading', 'cover design', 'editing',
        'manuscript', 'delay', 'production status', 'when will', 'production update',
        'stage', 'publishing timeline',
      ],
      category: TicketCategory.BOOK_STATUS_PRODUCTION,
    },
  ];

  private readonly criticalKeywords = [
    'urgent', 'immediately', 'asap', 'critical', 'severe', 'emergency',
    'legal', 'lawsuit', 'fraud', 'unauthorized',
  ];

  private readonly highKeywords = [
    'overdue', 'long delay', 'weeks', 'months', 'still waiting',
    'not received', 'incorrect', 'wrong', 'error', 'missing',
    'substantial', 'significant',
  ];

  async classifyTicket(context: {
    subject: string;
    description: string;
    bookTitle?: string;
    bookStatus?: string;
  }): Promise<ClassificationResult> {
    const text = `${context.subject} ${context.description}`.toLowerCase();
    const reasoning: string[] = [];

    // ── Determine category ──
    let matchedCategory: TicketCategory = TicketCategory.GENERAL_INQUIRY;
    let confidence: 'high' | 'medium' | 'low' = 'low';
    let categoryPriorityBoost: TicketPriority | undefined;

    for (const rule of this.categoryRules) {
      const matchedKeywords = rule.keywords.filter((kw) => text.includes(kw));
      if (matchedKeywords.length > 0) {
        matchedCategory = rule.category;
        categoryPriorityBoost = rule.priorityBoost;
        confidence = matchedKeywords.length >= 2 ? 'high' : 'medium';
        reasoning.push(
          `Matched keywords: ${matchedKeywords.join(', ')} → ${matchedCategory}`,
        );
        break; // First match wins (rules ordered by precedence)
      }
    }

    if (matchedCategory === TicketCategory.GENERAL_INQUIRY) {
      reasoning.push(
        'No specific category keywords matched — classified as General Inquiry.',
      );
      confidence = 'low';
    }

    // ── Determine priority ──
    let priority: TicketPriority = TicketPriority.MEDIUM;

    // Check for critical signals
    const criticalMatches = this.criticalKeywords.filter((kw) => text.includes(kw));
    if (criticalMatches.length > 0) {
      priority = TicketPriority.CRITICAL;
      reasoning.push(
        `Urgency signals detected: ${criticalMatches.join(', ')} → CRITICAL priority`,
      );
    } else if (categoryPriorityBoost) {
      priority = categoryPriorityBoost;
      reasoning.push(
        `Category-specific priority boost applied → ${categoryPriorityBoost}`,
      );
    } else {
      const highMatches = this.highKeywords.filter((kw) => text.includes(kw));
      if (highMatches.length > 0) {
        priority = TicketPriority.HIGH;
        reasoning.push(
          `Escalation signals detected: ${highMatches.join(', ')} → HIGH priority`,
        );
      } else if (matchedCategory === TicketCategory.GENERAL_INQUIRY) {
        priority = TicketPriority.LOW;
        reasoning.push('General inquiry with no urgency signals → LOW priority');
      }
    }

    return {
      category: matchedCategory,
      priority,
      reasoning: `[Demo/Rule-based classification] ${reasoning.join('. ')}`,
      confidence,
      provider: this.PROVIDER_NAME,
    };
  }

  async generateReplyDraft(
    ticketContext: TicketContext,
    knowledgeContext: string,
  ): Promise<DraftResult> {
    const { subject, description, book, author, category, existing_messages } =
      ticketContext;

    const authorFirstName = author.name.split(' ')[0];
    const bookRef = book ? `"${book.title}"` : 'your account';

    let draft: string;

    switch (category) {
      case TicketCategory.ROYALTY_PAYMENTS:
        draft = this.generateRoyaltyDraft(authorFirstName, book, description);
        break;
      case TicketCategory.ISBN_METADATA:
        draft = this.generateIsbnDraft(authorFirstName, book);
        break;
      case TicketCategory.PRINTING_QUALITY:
        draft = this.generatePrintQualityDraft(authorFirstName, book);
        break;
      case TicketCategory.DISTRIBUTION_AVAILABILITY:
        draft = this.generateDistributionDraft(authorFirstName, book);
        break;
      case TicketCategory.BOOK_STATUS_PRODUCTION:
        draft = this.generateProductionDraft(authorFirstName, book);
        break;
      default:
        draft = this.generateGeneralDraft(authorFirstName, subject);
        break;
    }

    // Add follow-up context if there are existing messages
    if (existing_messages.length > 0) {
      draft = `Following up on our previous correspondence:\n\n${draft}`;
    }

    return {
      content: draft,
      provider: this.PROVIDER_NAME,
      generated_at: new Date().toISOString(),
    };
  }

  // ─── Draft generators by category ───────────────────────────

  private generateRoyaltyDraft(
    name: string,
    book: TicketContext['book'],
    description: string,
  ): string {
    const bookTitle = book ? `"${book.title}"` : 'your book(s)';
    const pendingAmount =
      book && book.royalty_pending > 0 ? `₹${book.royalty_pending.toLocaleString('en-IN')}` : null;
    const lastPayout = book?.last_royalty_payout_date
      ? new Date(book.last_royalty_payout_date).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : null;

    let draft = `Dear ${name},\n\nThank you for reaching out regarding the royalty payment for ${bookTitle}. We understand how important timely payments are to our authors.\n\n`;

    if (pendingAmount) {
      draft += `According to our records, the pending royalty amount for ${bookTitle} is ${pendingAmount}. `;
    }

    if (lastPayout) {
      draft += `The last royalty payout was processed on ${lastPayout}. `;
    }

    draft += `\n\nAs per BookLeaf's royalty policy:\n`;
    draft += `• Royalties are calculated on a quarterly basis\n`;
    draft += `• Payments are processed within 45 days of the quarter ending\n`;
    draft += `• The minimum payout threshold is ₹1,000\n`;
    draft += `• Payouts are made via bank transfer to the account linked in your dashboard\n\n`;

    draft += `We will review your royalty account and provide a specific update within 48 hours. In the meantime, please ensure your bank details in the dashboard are current.\n\n`;
    draft += `If you have any further questions, please don't hesitate to ask.\n\nBest regards,\nBookLeaf Support Team`;

    return draft;
  }

  private generateIsbnDraft(name: string, book: TicketContext['book']): string {
    const bookTitle = book ? `"${book.title}"` : 'the book in question';
    const isbn = book?.isbn || 'the assigned ISBN';

    return `Dear ${name},

Thank you for reporting this ISBN issue with ${bookTitle}. We take ISBN accuracy very seriously, as it directly impacts distribution and discoverability.

The ISBN on record for ${bookTitle} in our system is ${isbn}. We have escalated this matter to our production team for immediate investigation.

Our team will:
• Verify the ISBN registration with our records
• Cross-check the listing on the affected platform(s)
• Coordinate with the distribution team to correct any discrepancies

We expect to have an update for you within 48 hours. If the ISBN displayed on any platform is indeed incorrect, we will prioritize the correction.

Thank you for your patience while we resolve this.

Best regards,
BookLeaf Support Team`;
  }

  private generatePrintQualityDraft(
    name: string,
    book: TicketContext['book'],
  ): string {
    const bookTitle = book ? `"${book.title}"` : 'your book';
    const printPartner = book?.print_partner || 'our printing facility';

    return `Dear ${name},

We sincerely apologize for the print quality issues you've experienced with ${bookTitle}. This does not meet the standards we uphold at BookLeaf, and we want to make this right.

This book was printed at ${printPartner}. To investigate and resolve this promptly, we would appreciate if you could:

1. Send us photographs of the affected pages showing the quality issues
2. Note the specific chapters or page ranges affected
3. Share the order or copy number if available

Once we receive and verify the defect:
• BookLeaf arranges a free reprint for verified misprints, binding defects, or color issues
• Standard reprint turnaround is 5–7 business days from confirmation
• We will also inspect the current print files to prevent recurrence

Please reply with the photographs at your earliest convenience so we can begin the verification process.

Best regards,
BookLeaf Support Team`;
  }

  private generateDistributionDraft(
    name: string,
    book: TicketContext['book'],
  ): string {
    const bookTitle = book ? `"${book.title}"` : 'your book';
    const platforms = book?.available_on?.length
      ? book.available_on.join(', ')
      : 'the listed distribution platforms';

    return `Dear ${name},

Thank you for alerting us about the availability issue with ${bookTitle}. We understand how frustrating it can be when your book is not accessible to readers.

${bookTitle} is currently configured for distribution on: ${platforms}.

An unavailable or out-of-stock listing often reflects a stock synchronization issue between our systems and the platform. Here's what we can do:

• We will initiate a stock re-sync with the affected platform
• Re-sync typically takes 24–48 hours to reflect
• New listings generally go live within 7–10 business days after publication

We will investigate the specific platform listing and update you once the re-sync is confirmed. Please allow 24–48 hours for the change to take effect.

Best regards,
BookLeaf Support Team`;
  }

  private generateProductionDraft(
    name: string,
    book: TicketContext['book'],
  ): string {
    const bookTitle = book ? `"${book.title}"` : 'your book';
    const currentStatus = book?.status || 'In Production';

    return `Dear ${name},

Thank you for your inquiry about the production status of ${bookTitle}.

According to our records, ${bookTitle} is currently in the "${currentStatus}" stage.

Our standard production pipeline follows these stages:
Manuscript Received → Editing (if opted) → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live

Delays can sometimes occur during the cover approval or proofreading revision stages, as these often require author feedback. We will check with the production team to get a specific timeline update for your book.

You will receive an email notification when the book advances to the next production stage. We aim to provide you with an update within 48 hours.

If there's anything specific you'd like to discuss about the production process, please let us know.

Best regards,
BookLeaf Support Team`;
  }

  private generateGeneralDraft(name: string, subject: string): string {
    return `Dear ${name},

Thank you for reaching out to BookLeaf Support regarding "${subject}."

We have received your inquiry and want to ensure we address your concerns thoroughly. Our team is reviewing the details you've provided.

For reference, here are some common resources that may be helpful:
• Book description and metadata changes can be submitted through your dashboard or by emailing our team, and typically reflect on platforms within 3–5 business days
• Royalty information and platform-wise breakdowns are available in your author dashboard
• For any account-related changes, you can update your details directly in your profile settings

We will get back to you with a detailed response within 48 hours. If your inquiry is urgent, please let us know and we will prioritize accordingly.

Best regards,
BookLeaf Support Team`;
  }
}
