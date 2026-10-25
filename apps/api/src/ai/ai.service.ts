import { Injectable, Inject, Logger } from '@nestjs/common';
import type { AiProvider } from './ai-provider.interface';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import type {
  ClassificationResult,
  DraftResult,
  TicketContext,
} from '@bookleaf/shared';
import { TicketCategory, TicketPriority } from '@bookleaf/shared';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Inject('AI_PROVIDER') private readonly provider: AiProvider,
    private readonly knowledgeBase: KnowledgeBaseService,
  ) {}

  /**
   * Classify a ticket. Returns safe fallback if classification fails.
   */
  async classifyTicket(context: {
    subject: string;
    description: string;
    bookTitle?: string;
    bookStatus?: string;
  }): Promise<ClassificationResult> {
    try {
      const result = await this.provider.classifyTicket(context);

      // Validate the result contains valid enum values
      if (!Object.values(TicketCategory).includes(result.category)) {
        this.logger.warn(`Invalid category from provider: ${result.category}`);
        result.category = TicketCategory.GENERAL_INQUIRY;
        result.confidence = 'low';
      }
      if (!Object.values(TicketPriority).includes(result.priority)) {
        this.logger.warn(`Invalid priority from provider: ${result.priority}`);
        result.priority = TicketPriority.MEDIUM;
        result.confidence = 'low';
      }

      return result;
    } catch (error) {
      this.logger.error('Classification failed, returning fallback', error);
      return {
        category: TicketCategory.GENERAL_INQUIRY,
        priority: TicketPriority.MEDIUM,
        reasoning:
          '[Demo/Rule-based classification] Classification failed — ticket flagged for manual review.',
        confidence: 'low',
        provider: 'fallback',
      };
    }
  }

  /**
   * Generate a draft response for a ticket.
   */
  async generateReplyDraft(ticketContext: TicketContext): Promise<DraftResult> {
    try {
      const policies = this.knowledgeBase.getPoliciesForCategory(
        ticketContext.category,
      );
      const knowledgeContext = this.knowledgeBase.formatPolicies(policies);

      const result = await this.provider.generateReplyDraft(
        ticketContext,
        knowledgeContext,
      );

      return result;
    } catch (error) {
      this.logger.error('Draft generation failed', error);
      return {
        content:
          'Unable to generate a draft at this time. Please compose a response manually.',
        provider: 'fallback',
        generated_at: new Date().toISOString(),
      };
    }
  }
}
