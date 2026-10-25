import { AiService } from './ai.service';
import { MockAiProvider } from './mock-ai.provider';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import { TicketCategory, TicketPriority, UserRole } from '@bookleaf/shared';

describe('AI Service and Classifier', () => {
  let aiService: AiService;
  let mockProvider: MockAiProvider;
  let knowledgeBase: KnowledgeBaseService;

  beforeEach(() => {
    mockProvider = new MockAiProvider();
    knowledgeBase = new KnowledgeBaseService();
    aiService = new AiService(mockProvider, knowledgeBase);
  });

  it('Requirement 10: Classification returns only valid categories and priorities', async () => {
    const royaltyTicket = await aiService.classifyTicket({
      subject: 'Royalty payout delayed',
      description: 'I have not received my quarterly royalty payment for this book.',
    });

    expect(Object.values(TicketCategory)).toContain(royaltyTicket.category);
    expect(Object.values(TicketPriority)).toContain(royaltyTicket.priority);
    expect(royaltyTicket.category).toBe(TicketCategory.ROYALTY_PAYMENTS);
    expect(royaltyTicket.confidence).toBe('high');
    expect(royaltyTicket.provider).toBe('mock');

    const isbnTicket = await aiService.classifyTicket({
      subject: 'Wrong ISBN displayed on retail store',
      description: 'The ISBN number shown on Flipkart is incorrect and belongs to another book.',
    });
    expect(isbnTicket.category).toBe(TicketCategory.ISBN_METADATA);
    expect(isbnTicket.priority).toBe(TicketPriority.HIGH);

    const printTicket = await aiService.classifyTicket({
      subject: 'Blurry images in printed copies',
      description: 'The photos in chapter 2 have bad print quality and washed out colors.',
    });
    expect(printTicket.category).toBe(TicketCategory.PRINTING_QUALITY);

    const distributionTicket = await aiService.classifyTicket({
      subject: 'Book out of stock on Amazon India',
      description: 'The listing is unavailable and out of stock for customers.',
    });
    expect(distributionTicket.category).toBe(TicketCategory.DISTRIBUTION_AVAILABILITY);

    const productionTicket = await aiService.classifyTicket({
      subject: 'Cover design delay',
      description: 'When will my book move to typesetting stage in production?',
    });
    expect(productionTicket.category).toBe(TicketCategory.BOOK_STATUS_PRODUCTION);
  });

  it('Requirement 9: A ticket classification failure falls back safely without failing creation', async () => {
    // Force mock provider to throw an error
    jest.spyOn(mockProvider, 'classifyTicket').mockRejectedValueOnce(new Error('Simulated network failure'));

    const result = await aiService.classifyTicket({
      subject: 'Any subject',
      description: 'Any description text here',
    });

    expect(result).toBeDefined();
    expect(result.category).toBe(TicketCategory.GENERAL_INQUIRY);
    expect(result.priority).toBe(TicketPriority.MEDIUM);
    expect(result.provider).toBe('fallback');
    expect(result.confidence).toBe('low');
  });

  it('Generates context-aware draft response using Knowledge Base without fabricating approvals', async () => {
    const draft = await aiService.generateReplyDraft({
      subject: 'Print binding defect',
      description: 'Several copies have loose binding and torn pages.',
      category: TicketCategory.PRINTING_QUALITY,
      priority: TicketPriority.MEDIUM,
      author: {
        author_id: 'AUTH001',
        name: 'Priya Sharma',
        email: 'priya@example.com',
        phone: '1234567890',
        city: 'Mumbai',
        joined_date: '2023-01-01',
      },
      book: {
        book_id: 'BK001',
        author_id: 'AUTH001',
        title: 'Whispers of the Ganges',
        isbn: '978-93-5XXXX-01-1',
        genre: 'Fiction',
        publication_date: '2023-06-20',
        status: 'Published & Live',
        mrp: 399,
        author_royalty_per_copy: 35,
        total_copies_sold: 100,
        total_royalty_earned: 3500,
        royalty_paid: 2000,
        royalty_pending: 1500,
        last_royalty_payout_date: '2025-10-15',
        print_partner: 'In-House',
        available_on: ['Amazon India'],
      },
      existing_messages: [],
    });

    expect(draft.content).toContain('Priya');
    expect(draft.content).toContain('Whispers of the Ganges');
    expect(draft.content).toContain('free reprint');
    expect(draft.content).toContain('photographs');
    expect(draft.provider).toBe('mock');
  });
});
