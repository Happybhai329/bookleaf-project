import { GeminiAiProvider } from './gemini-ai.provider';
import { AiService } from './ai.service';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import { TicketCategory, TicketPriority, UserRole, MessageVisibility } from '@bookleaf/shared';
import type { TicketContext, Author, Book } from '@bookleaf/shared';
import { AuthorService } from '../author/author.service';
import { AdminService } from '../admin/admin.service';
import { JsonDataStore } from '../data/json-data-store';
import { UserRepository } from '../data/repositories/user.repository';
import { AuthorRepository } from '../data/repositories/author.repository';
import { BookRepository } from '../data/repositories/book.repository';
import { TicketRepository } from '../data/repositories/ticket.repository';
import { TicketMessageRepository } from '../data/repositories/ticket-message.repository';
import { AuditRepository } from '../data/repositories/audit.repository';

describe('Gemini AI Provider Integration & Resilience (12 Test Cases)', () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.GEMINI_MODEL;
  const originalDataProvider = process.env.DATA_PROVIDER;

  let knowledgeBase: KnowledgeBaseService;

  beforeAll(() => {
    knowledgeBase = new KnowledgeBaseService();
    process.env.DATA_PROVIDER = 'json';
  });

  afterAll(() => {
    global.fetch = originalFetch;
    process.env.GEMINI_API_KEY = originalApiKey;
    process.env.GEMINI_MODEL = originalModel;
    process.env.DATA_PROVIDER = originalDataProvider;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.GEMINI_API_KEY = 'test_mock_gemini_key_12345';
  });

  // 1. Normal valid classification
  it('Case 1: Correctly parses valid structured JSON classification from Gemini', async () => {
    process.env.GEMINI_API_KEY = 'test_key';
    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  suggested_category: 'ROYALTY_PAYMENTS',
                  suggested_priority: 'HIGH',
                  reasoning: 'Author reports missing quarterly payout exceeding threshold.',
                  confidence: 'high',
                }),
              },
            ],
          },
        },
      ],
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockGeminiResponse,
    } as any);

    const provider = new GeminiAiProvider();
    const result = await provider.classifyTicket({
      subject: 'Missing royalty payout for Q3',
      description: 'The dashboard shows ₹3,570 pending royalty. When will this be disbursed?',
      bookTitle: 'Whispers of the Ganges',
    });

    expect(result.category).toBe(TicketCategory.ROYALTY_PAYMENTS);
    expect(result.priority).toBe(TicketPriority.HIGH);
    expect(result.reasoning).toContain('missing quarterly payout');
    expect(result.confidence).toBe('high');
    expect(result.provider).toBe('gemini');
  });

  // 2. Normalization of invalid category or priority
  it('Case 2: Normalizes invalid enum values from model response to safe defaults', async () => {
    process.env.GEMINI_API_KEY = 'test_key';
    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  suggested_category: 'UNKNOWN_CATEGORY_XYZ',
                  suggested_priority: 'EMERGENCY_MAX',
                  reasoning: 'Model hallucinated non-existent enum names.',
                  confidence: 'uncertain',
                }),
              },
            ],
          },
        },
      ],
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockGeminiResponse,
    } as any);

    const provider = new GeminiAiProvider();
    const aiService = new AiService(provider, knowledgeBase);

    const result = await aiService.classifyTicket({
      subject: 'Weird ticket category',
      description: 'Testing enum normalization',
    });

    expect(result.category).toBe(TicketCategory.GENERAL_INQUIRY);
    expect(result.priority).toBe(TicketPriority.MEDIUM);
    expect(result.confidence).toBe('low');
  });

  // 3. Malformed JSON returns safe fallback
  it('Case 3: Gracefully handles malformed/broken JSON payload from Gemini', async () => {
    process.env.GEMINI_API_KEY = 'test_key';
    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: 'This is not valid JSON at all: { unclosed bracket',
              },
            ],
          },
        },
      ],
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockGeminiResponse,
    } as any);

    const provider = new GeminiAiProvider();
    const result = await provider.classifyTicket({
      subject: 'Test subject',
      description: 'Testing malformed response',
    });

    expect(result.category).toBe(TicketCategory.GENERAL_INQUIRY);
    expect(result.priority).toBe(TicketPriority.MEDIUM);
    expect(result.provider).toBe('fallback');
    expect(result.confidence).toBe('low');
  });

  // 4. Missing API key safe fallback
  it('Case 4: Safely handles missing GEMINI_API_KEY without unhandled crash', async () => {
    process.env.GEMINI_API_KEY = '';
    const provider = new GeminiAiProvider();
    const result = await provider.classifyTicket({
      subject: 'Ticket without key',
      description: 'Testing missing key scenario',
    });

    expect(result.category).toBe(TicketCategory.GENERAL_INQUIRY);
    expect(result.priority).toBe(TicketPriority.MEDIUM);
    expect(result.provider).toBe('fallback');
  });

  // 5. Model error / 500 / 503 HTTP status
  it('Case 5: Retries and returns safe fallback on HTTP 503 Service Unavailable', async () => {
    process.env.GEMINI_API_KEY = 'test_key';
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'Model overloaded, please try again later',
    } as any);

    const provider = new GeminiAiProvider();
    const result = await provider.classifyTicket({
      subject: 'Server overload scenario',
      description: 'Testing 503 handling',
    });

    expect(result.category).toBe(TicketCategory.GENERAL_INQUIRY);
    expect(result.provider).toBe('fallback');
    // Fetch should have been attempted with retry
    expect(global.fetch).toHaveBeenCalled();
  });

  // 6. HTTP 429 rate limit
  it('Case 6: Retries and falls back cleanly on HTTP 429 Too Many Requests', async () => {
    process.env.GEMINI_API_KEY = 'test_key';
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded: quota depleted',
    } as any);

    const provider = new GeminiAiProvider();
    const result = await provider.classifyTicket({
      subject: 'Rate limit hit',
      description: 'Testing 429 rate limiting',
    });

    expect(result.category).toBe(TicketCategory.GENERAL_INQUIRY);
    expect(result.provider).toBe('fallback');
  });

  // 7. Timeout (>15s) abort and safe fallback
  it('Case 7: Handles network abort/timeout gracefully with safe fallback', async () => {
    process.env.GEMINI_API_KEY = 'test_key';
    global.fetch = jest.fn().mockImplementation(() => {
      const err = new Error('The operation was aborted due to timeout');
      err.name = 'TimeoutError';
      return Promise.reject(err);
    });

    const provider = new GeminiAiProvider();
    const result = await provider.classifyTicket({
      subject: 'Hanging request',
      description: 'Testing timeout',
    });

    expect(result.category).toBe(TicketCategory.GENERAL_INQUIRY);
    expect(result.provider).toBe('fallback');
  });

  // 8. Preservation of ticket creation even if classification fails
  it('Case 8: Ticket is saved in repository FIRST before AI classification', async () => {
    const store = new JsonDataStore();
    const userRepo = new UserRepository(store);
    const authorRepo = new AuthorRepository(store);
    const bookRepo = new BookRepository(store);
    const ticketRepo = new TicketRepository(store);
    const messageRepo = new TicketMessageRepository(store);

    // Mock provider that deliberately throws an error
    const failingProvider = {
      classifyTicket: jest.fn().mockRejectedValue(new Error('Fatal API crash')),
      generateReplyDraft: jest.fn(),
    };
    const aiService = new AiService(failingProvider, knowledgeBase);
    const authorService = new AuthorService(authorRepo, bookRepo, ticketRepo, messageRepo, aiService);

    // Create ticket as Priya (AUTH001) for her book BK001
    const ticket = await authorService.createTicket('AUTH001', 'user_priya', 'Priya Sharma', {
      book_id: 'BK001',
      subject: 'Testing resilience against AI outage',
      description: 'This ticket must be saved even if AI service crashes entirely.',
    });

    expect(ticket).toBeDefined();
    expect(ticket.id).toBeDefined();
    expect(ticket.reference).toMatch(/^BL-\d{4}$/);
    expect(ticket.status).toBe('OPEN');

    // Confirm ticket exists in the repository
    const found = await ticketRepo.findById(ticket.id);
    expect(found).toBeDefined();
    expect(found?.reference).toBe(ticket.reference);
  });

  // 9. Reply draft generation grounded in knowledge base policies
  it('Case 9: Reply draft prompt incorporates BookLeaf policies and receives generated draft', async () => {
    process.env.GEMINI_API_KEY = 'test_key';
    const mockReplyText = `Dear Priya Sharma,\n\nThank you for reaching out regarding your royalty query. Under BookLeaf's Royalty Policy, royalties are calculated quarterly and distributed within 45 days of the quarter ending, provided your balance meets the ₹1,000 threshold. Since your pending royalty is ₹3,570, this will be transferred to your registered bank account in the upcoming payout cycle.\n\nWarm regards,\nBookLeaf Author Support Team`;

    let capturedPayload: any = null;
    global.fetch = jest.fn().mockImplementation((_url, options) => {
      capturedPayload = JSON.parse(options.body);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: mockReplyText }],
              },
            },
          ],
        }),
      });
    });

    const provider = new GeminiAiProvider();
    const author: Author = {
      author_id: 'AUTH001',
      name: 'Priya Sharma',
      email: 'priya.sharma@email.com',
      phone: '+91 98765 43210',
      city: 'Varanasi',
      joined_date: '2023-01-15',
    };
    const book: Book = {
      book_id: 'BK001',
      author_id: 'AUTH001',
      title: 'Whispers of the Ganges',
      isbn: '978-93-5000-001-1',
      genre: 'Literary Fiction',
      publication_date: '2023-06-20',
      status: 'Published & Live',
      mrp: 399,
      author_royalty_per_copy: 85,
      total_copies_sold: 142,
      total_royalty_earned: 12070,
      royalty_paid: 8500,
      royalty_pending: 3570,
      last_royalty_payout_date: '2024-03-31',
      print_partner: 'In-house Delhi',
      available_on: ['Amazon India', 'Flipkart', 'BookLeaf Store'],
    };

    const ticketContext: TicketContext = {
      subject: 'When will my Q3 royalty be paid?',
      description: 'The dashboard shows ₹3,570 pending for Whispers of the Ganges.',
      book,
      author,
      category: TicketCategory.ROYALTY_PAYMENTS,
      priority: TicketPriority.HIGH,
      existing_messages: [],
    };

    const draft = await provider.generateReplyDraft(
      ticketContext,
      knowledgeBase.formatPolicies(knowledgeBase.getPoliciesForCategory(TicketCategory.ROYALTY_PAYMENTS)),
    );

    expect(draft.content).toContain('Dear Priya Sharma');
    expect(draft.content).toContain('₹3,570');
    expect(draft.provider).toBe('gemini');
    expect(capturedPayload.systemInstruction.parts[0].text).toContain('Royalty Policy');
  });

  // 10. Reply draft incorporates author name and book context accurately
  it('Case 10: Ensures draft prompt context injects author name and book metadata', async () => {
    process.env.GEMINI_API_KEY = 'test_key';
    let capturedPrompt = '';

    global.fetch = jest.fn().mockImplementation((_url, options) => {
      const body = JSON.parse(options.body);
      capturedPrompt = body.contents[0].parts[0].text;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Draft reply text' }],
              },
            },
          ],
        }),
      });
    });

    const provider = new GeminiAiProvider();
    const author: Author = {
      author_id: 'AUTH002',
      name: 'Rohit Kapoor',
      email: 'rohit.kapoor@email.com',
      phone: '+91 98765 43211',
      city: 'Bengaluru',
      joined_date: '2023-02-10',
    };
    const book: Book = {
      book_id: 'BK003',
      author_id: 'AUTH002',
      title: 'Code & Karma',
      isbn: '978-93-5000-003-5',
      genre: 'Technology & Philosophy',
      publication_date: '2023-08-15',
      status: 'Published & Live',
      mrp: 499,
      author_royalty_per_copy: 110,
      total_copies_sold: 210,
      total_royalty_earned: 23100,
      royalty_paid: 18000,
      royalty_pending: 5100,
      last_royalty_payout_date: '2024-03-31',
      print_partner: 'Repro India',
      available_on: ['Amazon India', 'Flipkart'],
    };

    await provider.generateReplyDraft(
      {
        subject: 'ISBN display issue',
        description: 'Wrong ISBN on Amazon listing',
        book,
        author,
        category: TicketCategory.ISBN_METADATA,
        priority: TicketPriority.HIGH,
        existing_messages: [],
      },
      'ISBN Policy Details',
    );

    expect(capturedPrompt).toContain('Rohit Kapoor');
    expect(capturedPrompt).toContain('Code & Karma');
    expect(capturedPrompt).toContain('978-93-5000-003-5');
  });

  // 11. Refusal to hallucinate policy-contradicting promises
  it('Case 11: System prompt enforces anti-hallucination instruction', async () => {
    process.env.GEMINI_API_KEY = 'test_key';
    let systemInstruction = '';

    global.fetch = jest.fn().mockImplementation((_url, options) => {
      const body = JSON.parse(options.body);
      systemInstruction = body.systemInstruction.parts[0].text;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Grounded reply' }] } }],
        }),
      });
    });

    const provider = new GeminiAiProvider();
    await provider.generateReplyDraft(
      {
        subject: 'Hallucination test',
        description: 'Can I get paid tomorrow?',
        book: null,
        author: {
          author_id: 'A1',
          name: 'Author Test',
          email: 'a@test.com',
          phone: '',
          city: '',
          joined_date: '',
        },
        category: TicketCategory.ROYALTY_PAYMENTS,
        priority: TicketPriority.MEDIUM,
        existing_messages: [],
      },
      'Quarterly payments only.',
    );

    expect(systemInstruction).toContain('Never hallucinate or invent numbers');
    expect(systemInstruction).toContain('Ground your response firmly');
  });

  // 12. No auto-publishing: generated draft is returned without creating public message
  it('Case 12: Generated draft is returned to caller without creating a public message', async () => {
    const store = new JsonDataStore();
    const userRepo = new UserRepository(store);
    const authorRepo = new AuthorRepository(store);
    const bookRepo = new BookRepository(store);
    const ticketRepo = new TicketRepository(store);
    const messageRepo = new TicketMessageRepository(store);
    const auditRepo = new AuditRepository(store);

    const mockAiProvider = {
      classifyTicket: jest.fn(),
      generateReplyDraft: jest.fn().mockResolvedValue({
        content: 'Proposed draft for staff review',
        provider: 'gemini',
        generated_at: new Date().toISOString(),
      }),
    };

    const aiService = new AiService(mockAiProvider as any, knowledgeBase);
    const adminService = new AdminService(
      ticketRepo,
      messageRepo,
      authorRepo,
      bookRepo,
      userRepo,
      auditRepo,
      aiService,
    );

    // Initial state: BL-0002 messages count
    const initialMessages = await messageRepo.findByTicketId(
      (await ticketRepo.findByReference('BL-0002'))!.id,
    );
    const initialCount = initialMessages.length;

    // Call generateDraft
    const rohitTicket = (await ticketRepo.findByReference('BL-0002'))!;
    const draft = await adminService.generateDraft(rohitTicket.id);

    expect(draft.content).toBe('Proposed draft for staff review');
    expect(draft.provider).toBe('gemini');

    // Verify NO new message was created in the repository
    const afterMessages = await messageRepo.findByTicketId(rohitTicket.id);
    expect(afterMessages.length).toBe(initialCount);
  });
});
