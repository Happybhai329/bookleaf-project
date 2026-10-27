import { AuthorService } from '../author/author.service';
import { AdminService } from './admin.service';
import { JsonDataStore } from '../data/json-data-store';
import { UserRepository } from '../data/repositories/user.repository';
import { AuthorRepository } from '../data/repositories/author.repository';
import { BookRepository } from '../data/repositories/book.repository';
import { TicketRepository } from '../data/repositories/ticket.repository';
import { TicketMessageRepository } from '../data/repositories/ticket-message.repository';
import { AuditRepository } from '../data/repositories/audit.repository';
import { AiService } from '../ai/ai.service';
import { MockAiProvider } from '../ai/mock-ai.provider';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import { SeedService } from '../data/seed.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
  UserRole,
  MessageVisibility,
} from '@bookleaf/shared';

describe('Ticket Lifecycle, Overrides, and Filtering', () => {
  let store: JsonDataStore;
  let userRepo: UserRepository;
  let authorRepo: AuthorRepository;
  let bookRepo: BookRepository;
  let ticketRepo: TicketRepository;
  let messageRepo: TicketMessageRepository;
  let auditRepo: AuditRepository;
  let authorService: AuthorService;
  let adminService: AdminService;
  let aiService: AiService;

  const mockAdminUser = {
    id: 'admin_test_1',
    email: 'admin@bookleaf.in',
    role: UserRole.ADMIN,
    author_id: null,
    display_name: 'Lead Admin',
  };

  beforeAll(async () => {
    process.env.DATA_PROVIDER = 'json';
    store = new JsonDataStore();
    userRepo = new UserRepository(store);
    authorRepo = new AuthorRepository(store);
    bookRepo = new BookRepository(store);
    ticketRepo = new TicketRepository(store);
    messageRepo = new TicketMessageRepository(store);
    auditRepo = new AuditRepository(store);

    const mockProvider = new MockAiProvider();
    const knowledgeBase = new KnowledgeBaseService();
    aiService = new AiService(mockProvider, knowledgeBase);

    authorService = new AuthorService(authorRepo, bookRepo, ticketRepo, messageRepo, aiService);
    adminService = new AdminService(
      ticketRepo,
      messageRepo,
      authorRepo,
      bookRepo,
      userRepo,
      auditRepo,
      aiService,
    );

    const seedService = new SeedService(
      store,
      userRepo,
      authorRepo,
      bookRepo,
      ticketRepo,
      messageRepo,
    );
    await seedService.seed();
  });

  it('Requirement 8: Rejects ticket creation if author selects a book belonging to another author', async () => {
    // Priya (AUTH001) tries to select Rohit Kapoor's book (BK003)
    await expect(
      authorService.createTicket('AUTH001', 'user_1', 'Priya', {
        book_id: 'BK003',
        subject: 'Cannot access this book',
        description: 'Trying to create ticket for another author book',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('Requirement 8b: Rejects ticket creation if non-existent book ID is passed', async () => {
    await expect(
      authorService.createTicket('AUTH001', 'user_1', 'Priya', {
        book_id: 'NON_EXISTENT_BK',
        subject: 'Fake book ticket',
        description: 'Should fail with bad request error',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('Creates ticket, assigns reference, and classifies properly', async () => {
    const ticket = await authorService.createTicket('AUTH001', 'user_1', 'Priya', {
      book_id: 'BK001',
      subject: 'Where is my pending quarterly payout?',
      description: 'The dashboard shows ₹3,570 pending royalty for Whispers of the Ganges. When will it be sent?',
    });

    expect(ticket.reference).toMatch(/^BL-\d{4}$/);
    expect(ticket.final_category).toBe(TicketCategory.ROYALTY_PAYMENTS);
    expect(ticket.status).toBe(TicketStatus.OPEN);
  });

  it('Requirement 11: Admin can override priority, category, and status and overrides persist', async () => {
    const ticket = await authorService.createTicket('AUTH001', 'user_1', 'Priya', {
      book_id: null,
      subject: 'Routine question about book cover',
      description: 'Just wondering how cover design revisions work in general.',
    });

    // Admin overrides to CRITICAL and changes status to IN_PROGRESS
    const updated = await adminService.updateTicket(
      ticket.id,
      {
        final_priority: TicketPriority.CRITICAL,
        status: TicketStatus.IN_PROGRESS,
      },
      mockAdminUser,
    );

    expect(updated.final_priority).toBe(TicketPriority.CRITICAL);
    expect(updated.status).toBe(TicketStatus.IN_PROGRESS);

    // Verify stored state in repo
    const reloaded = await ticketRepo.findById(ticket.id);
    expect(reloaded?.final_priority).toBe(TicketPriority.CRITICAL);
    expect(reloaded?.status).toBe(TicketStatus.IN_PROGRESS);
  });

  it('Requirement 12: Admin reply is persisted and appears in author conversation', async () => {
    const ticket = await authorService.createTicket('AUTH001', 'user_1', 'Priya', {
      book_id: 'BK001',
      subject: 'ISBN display query',
      description: 'Checking on the ISBN status for my book.',
    });

    const reply = await adminService.addReply(
      ticket.id,
      'We have checked the ISBN and it is correctly listed under BookLeaf imprint.',
      mockAdminUser,
    );

    expect(reply.visibility).toBe(MessageVisibility.PUBLIC);

    // Author fetches ticket
    const authorView = await authorService.getTicket('AUTH001', ticket.id);
    expect(authorView.messages.length).toBe(1);
    expect(authorView.messages[0].content).toContain('correctly listed under BookLeaf imprint');
  });

  it('Requirement 16: Queue filtering by non-matching criteria returns clean empty list', async () => {
    const results = await adminService.getTickets({
      search: 'DEFINITELY_NO_SUCH_KEYWORD_EXISTS_IN_ANY_TICKET_99999',
    });

    expect(results.data).toEqual([]);
    expect(results.total).toBe(0);
    expect(results.total_pages).toBe(1);
  });
});
