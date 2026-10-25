import type {
  TicketCategory,
  TicketPriority,
  ClassificationResult,
  DraftResult,
  TicketContext,
} from '@bookleaf/shared';

/**
 * Provider interface for AI classification and draft generation.
 * Implement this interface to plug in a real AI service (OpenAI, Gemini, etc.)
 * or use the MockAiProvider for development.
 */
export interface AiProvider {
  /**
   * Classify a ticket's category and priority based on its content.
   */
  classifyTicket(context: {
    subject: string;
    description: string;
    bookTitle?: string;
    bookStatus?: string;
  }): Promise<ClassificationResult>;

  /**
   * Generate a draft response for a ticket.
   */
  generateReplyDraft(
    ticketContext: TicketContext,
    knowledgeContext: string,
  ): Promise<DraftResult>;
}
