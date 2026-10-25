import { Injectable } from '@nestjs/common';
import { TicketCategory } from '@bookleaf/shared';

export interface PolicySection {
  title: string;
  content: string;
}

@Injectable()
export class KnowledgeBaseService {
  // ────────────────────────────────────────────────────────────
  // Company Overview
  // ────────────────────────────────────────────────────────────

  readonly companyOverview: PolicySection = {
    title: 'Company Overview',
    content: `BookLeaf Publishing is a self-publishing company operating in India and the US. Publishing packages include Standard Free and Bestseller Breakthrough. Services include cover design, typesetting, ISBN assignment, printing, distribution, and royalty management. BookLeaf has an in-house printing facility and warehouse in Delhi. External printing partners include Repro India and Epitome Books.`,
  };

  // ────────────────────────────────────────────────────────────
  // Royalty Policy
  // ────────────────────────────────────────────────────────────

  readonly royaltyPolicy: PolicySection = {
    title: 'Royalty Policy',
    content: `80% of net profit per book goes to the author, 20% to BookLeaf. Net profit = MRP minus printing cost, platform commission, and shipping charges. Royalties are calculated quarterly. Royalties are paid within 45 days of the quarter ending. Minimum payout threshold is ₹1,000. Accumulated royalties below the threshold roll over to the next quarter. Payouts are made by bank transfer to the account linked in the author's dashboard. A detailed platform-wise breakdown can be viewed in the author dashboard.`,
  };

  // ────────────────────────────────────────────────────────────
  // ISBN Policy
  // ────────────────────────────────────────────────────────────

  readonly isbnPolicy: PolicySection = {
    title: 'ISBN Policy',
    content: `Each book published through BookLeaf receives a unique ISBN. BookLeaf-assigned ISBNs are registered under the BookLeaf publisher imprint. Authors seeking their own imprint ISBN must obtain it independently. Duplicate or incorrect ISBN issues must be treated as high priority and escalated to the production team.`,
  };

  // ────────────────────────────────────────────────────────────
  // Printing & Quality
  // ────────────────────────────────────────────────────────────

  readonly printingQuality: PolicySection = {
    title: 'Printing & Quality',
    content: `BookLeaf handles most printing in-house at the Delhi facility. Overflow and certain formats may go to Repro India or Epitome Books. Standard printing turnaround is 5–7 business days from order confirmation. For verified misprints, binding defects, or color issues, BookLeaf arranges a free reprint. Authors may need to provide photographs of defective copies for verification.`,
  };

  // ────────────────────────────────────────────────────────────
  // Distribution & Availability
  // ────────────────────────────────────────────────────────────

  readonly distributionAvailability: PolicySection = {
    title: 'Distribution & Availability',
    content: `Distribution platforms include Amazon India, Flipkart, Amazon US, Amazon UK, and the BookLeaf Store. New listings generally go live within 7–10 business days after publication is complete. An unavailable listing may reflect a stock synchronization issue. BookLeaf can trigger a re-sync, which typically takes 24–48 hours.`,
  };

  // ────────────────────────────────────────────────────────────
  // Production Stages
  // ────────────────────────────────────────────────────────────

  readonly productionStages: PolicySection = {
    title: 'Production Stages',
    content: `The production pipeline follows these stages in order: Manuscript Received → Editing (if opted) → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live. Authors are updated by email at each stage. Delays commonly arise while waiting for cover approval or during proofreading revisions.`,
  };

  // ────────────────────────────────────────────────────────────
  // Metadata Updates
  // ────────────────────────────────────────────────────────────

  readonly metadataUpdates: PolicySection = {
    title: 'Metadata Updates',
    content: `Description and metadata changes can be submitted through the dashboard or by emailing the BookLeaf team. Changes generally reflect on platforms within 3–5 business days.`,
  };

  // ────────────────────────────────────────────────────────────
  // Communication Guidelines
  // ────────────────────────────────────────────────────────────

  readonly communicationGuidelines: PolicySection = {
    title: 'Communication Guidelines',
    content: `Every response should: Be empathetic and professional. Acknowledge the author's concern before offering a solution. Give accurate details wherever supported. Own acknowledged BookLeaf errors without deflection. Provide an appropriate investigation timeline (e.g., 48 hours when the policy calls for escalation). End with a clear next step. Avoid generic reassurance and unnecessary filler. Avoid fabricating dates, investigations, approval, payment transfers, or completed operational actions. Distinguish published policy from unverified account-specific facts.`,
  };

  /**
   * Return the relevant knowledge base policies for a given ticket category.
   */
  getPoliciesForCategory(category: TicketCategory): PolicySection[] {
    const policies: PolicySection[] = [this.companyOverview];

    switch (category) {
      case TicketCategory.ROYALTY_PAYMENTS:
        policies.push(this.royaltyPolicy);
        break;
      case TicketCategory.ISBN_METADATA:
        policies.push(this.isbnPolicy);
        break;
      case TicketCategory.PRINTING_QUALITY:
        policies.push(this.printingQuality);
        break;
      case TicketCategory.DISTRIBUTION_AVAILABILITY:
        policies.push(this.distributionAvailability);
        break;
      case TicketCategory.BOOK_STATUS_PRODUCTION:
        policies.push(this.productionStages);
        break;
      case TicketCategory.GENERAL_INQUIRY:
        policies.push(this.metadataUpdates);
        break;
    }

    policies.push(this.communicationGuidelines);
    return policies;
  }

  /**
   * Format knowledge base policies into a readable string for AI context.
   */
  formatPolicies(policies: PolicySection[]): string {
    return policies
      .map((p) => `## ${p.title}\n${p.content}`)
      .join('\n\n');
  }
}
