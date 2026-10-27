import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class GeminiAiProvider implements AiProvider {
  private readonly logger = new Logger(GeminiAiProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!this.apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY is not set. Gemini API calls will fail or fall back.',
      );
    } else {
      this.logger.log(`Initialized Gemini AI Provider with model: ${this.model}`);
    }
  }

  /**
   * Helper to execute Gemini generateContent with timeout and exponential backoff retry.
   */
  private async executeGenerateContent(
    payload: Record<string, unknown>,
    timeoutMs = 15000,
    maxRetries = 2,
  ): Promise<any> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const url = `${this.baseUrl}/${encodeURIComponent(this.model)}:generateContent?key=${this.apiKey}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          this.logger.warn(`Retrying Gemini API call (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          const status = response.status;

          // Retry on 429 (rate limited) or 503 (service unavailable/high demand)
          if ((status === 429 || status === 503) && attempt < maxRetries) {
            this.logger.warn(`Gemini API returned ${status}: ${errorBody.slice(0, 150)}`);
            continue;
          }

          throw new Error(`Gemini API error (HTTP ${status}): ${errorBody.slice(0, 200)}`);
        }

        const data = await response.json();
        return data;
      } catch (err: any) {
        lastError = err;
        // Don't retry aborts or client logic errors
        if (err.name === 'AbortError' || err.name === 'TimeoutError') {
          this.logger.error(`Gemini API call timed out after ${timeoutMs}ms`);
          break;
        }
        if (attempt === maxRetries) {
          break;
        }
      }
    }

    throw lastError || new Error('Gemini API call failed');
  }

  /**
   * Classify ticket category and priority using Gemini with structured JSON output.
   */
  async classifyTicket(context: {
    subject: string;
    description: string;
    bookTitle?: string;
    bookStatus?: string;
  }): Promise<ClassificationResult> {
    try {
      const systemInstruction = `You are an expert AI triage and classification assistant for BookLeaf Publishing, an author-first self-publishing company.
Analyze support requests from authors and classify them strictly into one of the designated categories and priority levels.

Categories:
- ROYALTY_PAYMENTS: Questions about royalty calculations, payouts, unpaid earnings, minimum threshold (₹1,000), quarterly payment cycle, bank transfer issues.
- ISBN_METADATA: Issues with ISBN assignments, incorrect author names, wrong book titles, metadata errors on retail platforms.
- PRINTING_QUALITY: Reports of blurry covers, misprints, binding defects, damaged copies, color issues, washed-out printing, defective copies.
- DISTRIBUTION_AVAILABILITY: Books showing out-of-stock, unavailable, or missing on Amazon, Flipkart, or BookLeaf store; inventory sync issues.
- BOOK_STATUS_PRODUCTION: Inquiries about current production stages (editing, typesetting, cover design, proof approval, printing) or delays.
- GENERAL_INQUIRY: General questions, portal navigation, profile updates, publishing packages, marketing inquiries.

Priority Rules:
- CRITICAL: Blocking launch, active financial disputes over ₹10,000, extensive multi-copy defective print run, author threatening legal or public escalation.
- HIGH: Direct royalty payout failure over threshold, duplicate or invalid ISBN on live listings, complete distribution unavailability of an active book.
- MEDIUM: Standard printing defects on single copies, general production status checks within SLA, standard distribution delay questions.
- LOW: General portal questions, general inquiries, future project inquiries, minor non-blocking feedback.

Output strictly valid JSON conforming to the requested schema.`;

      const promptText = `Ticket Details:
Subject: ${context.subject}
Description: ${context.description}
${context.bookTitle ? `Associated Book Title: ${context.bookTitle}` : ''}
${context.bookStatus ? `Associated Book Status: ${context.bookStatus}` : ''}

Classify this ticket accurately.`;

      const payload = {
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: promptText }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
          ...(this.model.includes('2.5') || this.model.includes('2.0')
            ? { thinkingConfig: { thinkingBudget: 0 } }
            : {}),
          responseSchema: {
            type: 'OBJECT',
            properties: {
              suggested_category: {
                type: 'STRING',
                enum: [
                  'ROYALTY_PAYMENTS',
                  'ISBN_METADATA',
                  'PRINTING_QUALITY',
                  'DISTRIBUTION_AVAILABILITY',
                  'BOOK_STATUS_PRODUCTION',
                  'GENERAL_INQUIRY',
                ],
              },
              suggested_priority: {
                type: 'STRING',
                enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
              },
              reasoning: {
                type: 'STRING',
                description: 'Concise explanation for why this category and priority were selected.',
              },
              confidence: {
                type: 'STRING',
                enum: ['high', 'medium', 'low'],
              },
            },
            required: [
              'suggested_category',
              'suggested_priority',
              'reasoning',
              'confidence',
            ],
          },
        },
      };

      const data = await this.executeGenerateContent(payload, 20000, 2);

      const candidate = data?.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      const text = parts.map((p: any) => p.text || '').join('').trim();

      if (!text) {
        throw new Error('Empty response from Gemini API');
      }

      const parsed = JSON.parse(text);

      let confidence = ['high', 'medium', 'low'].includes(parsed.confidence)
        ? parsed.confidence
        : 'medium';

      let category: TicketCategory;
      if (Object.values(TicketCategory).includes(parsed.suggested_category)) {
        category = parsed.suggested_category as TicketCategory;
      } else {
        category = TicketCategory.GENERAL_INQUIRY;
        confidence = 'low';
      }

      let priority: TicketPriority;
      if (Object.values(TicketPriority).includes(parsed.suggested_priority)) {
        priority = parsed.suggested_priority as TicketPriority;
      } else {
        priority = TicketPriority.MEDIUM;
        confidence = 'low';
      }

      return {
        category,
        priority,
        reasoning: parsed.reasoning || 'Classified by Google Gemini.',
        confidence,
        provider: 'gemini',
      };
    } catch (err: any) {
      this.logger.error(`Gemini classification failed: ${err.message}`);
      return {
        category: TicketCategory.GENERAL_INQUIRY,
        priority: TicketPriority.MEDIUM,
        reasoning: `Gemini classification unavailable (${err.message}) — ticket flagged for manual review.`,
        confidence: 'low',
        provider: 'fallback',
      };
    }
  }

  /**
   * Generate an official support reply draft grounded strictly in BookLeaf policies and ticket context.
   */
  async generateReplyDraft(
    ticketContext: TicketContext,
    knowledgeContext: string,
  ): Promise<DraftResult> {
    try {
      const systemInstruction = `You are an empathetic, knowledgeable, and professional author support specialist at BookLeaf Publishing, an author-first self-publishing company.
Your task is to draft a comprehensive, official, and polite response to an author's support ticket.

GROUNDING POLICIES:
${knowledgeContext}

STRICT GUIDELINES:
1. Greet the author warmly by name (${ticketContext.author.name}).
2. Provide a thorough, well-structured response (typically 3-4 cohesive paragraphs) addressing every facet of their inquiry with clarity.
3. Ground your response firmly in the BookLeaf policies provided above. Do not contradict them.
4. If referring to financial figures, copies sold, or dates, use ONLY the numbers provided in the context below. Never hallucinate or invent numbers, payout amounts, or transaction IDs.
5. For royalty questions:
   - Remind the author that BookLeaf calculates royalties quarterly and pays within 45 days of the quarter ending.
   - Explain the 80/20 net profit split (80% to author, 20% to BookLeaf).
   - If accumulated pending royalties are below the ₹1,000 threshold, gently explain that amounts below ₹1,000 roll over to the next cycle.
6. For printing & physical defect questions:
   - Note our 5-7 business day turnaround for resolution.
   - For misprints or defects, kindly request high-resolution photographs of the issue (cover, binding, interior pages) so our quality assurance team can immediately approve a free reprint.
7. For distribution & availability questions:
   - Note that new listings typically take 7-10 business days to propagate across partner platforms (Amazon India, Flipkart, Amazon US/UK).
   - If an active book is out-of-stock, price-discrepant, or unlinked, offer to initiate a 24-48 hour stock/metadata re-sync with the channel.
8. Address any previous dialogue context constructively without repeating yourself needlessly.
9. Tone: Professional, encouraging, respectful of the author's creative work, and reassuring.
10. End with a polite closing sign-off from "The BookLeaf Support Team".
11. Output ONLY the response body text ready for support staff to review and send. Do NOT include greetings to the staff or meta-commentary like "Here is a draft response:".`;

      const bookContextText = ticketContext.book
        ? `Book Title: ${ticketContext.book.title}
ISBN: ${ticketContext.book.isbn}
Status: ${ticketContext.book.status}
Copies Sold: ${ticketContext.book.total_copies_sold}
Royalty Earned: ₹${ticketContext.book.total_royalty_earned}
Royalty Paid: ₹${ticketContext.book.royalty_paid}
Royalty Pending: ₹${ticketContext.book.royalty_pending}
Last Payout Date: ${ticketContext.book.last_royalty_payout_date || 'None'}
Available Channels: ${ticketContext.book.available_on.join(', ') || 'N/A'}`
        : 'No specific book associated with this ticket.';

      const conversationHistory =
        ticketContext.existing_messages && ticketContext.existing_messages.length > 0
          ? ticketContext.existing_messages
              .map(
                (m) =>
                  `[${m.sender_role} - ${new Date(m.created_at).toLocaleDateString()}]: ${m.content}`,
              )
              .join('\n\n')
          : 'No previous messages.';

      const promptText = `Author Name: ${ticketContext.author.name}
Author Email: ${ticketContext.author.email}
Author City: ${ticketContext.author.city}

Ticket Category: ${ticketContext.category}
Ticket Priority: ${ticketContext.priority}
Ticket Subject: ${ticketContext.subject}
Ticket Description:
${ticketContext.description}

Book Information:
${bookContextText}

Conversation History (Author & Staff Public Messages):
${conversationHistory}

Please compose the draft response to the author.`;

      const payload = {
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: promptText }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          ...(this.model.includes('2.5') || this.model.includes('2.0')
            ? { thinkingConfig: { thinkingBudget: 0 } }
            : {}),
        },
      };

      const data = await this.executeGenerateContent(payload, 30000, 2);

      const candidate = data?.candidates?.[0];
      if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
        this.logger.warn(`Gemini reply draft finishReason: ${candidate.finishReason}`);
      }

      const parts = candidate?.content?.parts || [];
      const text = parts.map((p: any) => p.text || '').join('').trim();

      if (!text || text.length === 0) {
        throw new Error('Empty response generated by Gemini');
      }

      return {
        content: text,
        provider: 'gemini',
        generated_at: new Date().toISOString(),
      };
    } catch (err: any) {
      this.logger.error(`Gemini reply draft generation failed: ${err.message}`);
      return {
        content: `Dear ${ticketContext.author.name},\n\nThank you for reaching out to BookLeaf Publishing Support regarding "${ticketContext.subject}".\n\nOur team is currently reviewing your ticket. A support specialist will follow up with specific details shortly.\n\nWarm regards,\nBookLeaf Author Support Team`,
        provider: 'fallback',
        generated_at: new Date().toISOString(),
      };
    }
  }
}
