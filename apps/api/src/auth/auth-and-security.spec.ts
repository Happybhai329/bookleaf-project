import { AuthService } from './auth.service';
import { AuthorService } from '../author/author.service';
import { AdminService } from '../admin/admin.service';
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
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserRole, MessageVisibility } from '@bookleaf/shared';

describe('Auth, Ownership, and Security Isolation', () => {
  let store: JsonDataStore;
  let userRepo: UserRepository;
  let authorRepo: AuthorRepository;
  let bookRepo: BookRepository;
  let ticketRepo: TicketRepository;
  let messageRepo: TicketMessageRepository;
  let auditRepo: AuditRepository;
  let authService: AuthService;
  let authorService: AuthorService;
  let adminService: AdminService;
  let aiService: AiService;

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

    authService = new AuthService(userRepo);
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
  });

  it('Requirement 3: Author can authenticate with valid credentials and retrieve own profile/books', async () => {
    const authUser = await authService.validateUser('priya.sharma@email.com', 'BookLeaf2024!');
    expect(authUser).toBeDefined();
    expect(authUser.role).toBe(UserRole.AUTHOR);
    expect(authUser.author_id).toBe('AUTH001');

    const books = await authorService.getBooks(authUser.author_id!);
    expect(books.length).toBe(2);
    expect(books.every((b) => b.author_id === 'AUTH001')).toBe(true);
  });

  it('Requirement 3b: Invalid credentials are appropriately rejected', async () => {
    await expect(
      authService.validateUser('priya.sharma@email.com', 'WrongPassword123!'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('Requirement 4: Author cannot access another author books or tickets', async () => {
    // Priya (AUTH001) attempts to inspect Rohit Kapoor's book (BK003)
    await expect(authorService.getBook('AUTH001', 'BK003')).rejects.toThrow(ForbiddenException);

    // Priya attempts to view Rohit Kapoor's ticket (BL-0002)
    const rohitTicket = await ticketRepo.findByReference('BL-0002');
    expect(rohitTicket).toBeDefined();
    await expect(authorService.getTicket('AUTH001', rohitTicket!.id)).rejects.toThrow(ForbiddenException);
  });

  it('Requirement 6 & 13: Internal notes are strictly filtered from author responses', async () => {
    // Ticket BL-0002 has both a PUBLIC message and an INTERNAL_NOTE message
    const rohitTicket = (await ticketRepo.findByReference('BL-0002'))!;

    // When fetched as author (Rohit - AUTH002), only public messages are returned
    const authorView = await authorService.getTicket('AUTH002', rohitTicket.id);
    expect(authorView.messages.length).toBeGreaterThan(0);
    expect(
      authorView.messages.every((m) => m.visibility === MessageVisibility.PUBLIC),
    ).toBe(true);
    expect(
      authorView.messages.some((m) => m.visibility === MessageVisibility.INTERNAL_NOTE),
    ).toBe(false);

    // When fetched as admin, all messages including INTERNAL_NOTE are present
    const adminView = await adminService.getTicket(rohitTicket.id);
    expect(
      adminView.messages.some((m) => m.visibility === MessageVisibility.INTERNAL_NOTE),
    ).toBe(true);
  });

  it('Requirement 7: Admin can view tickets across all authors in the global queue', async () => {
    const queue = await adminService.getTickets({ page: 1, limit: 50 });
    expect(queue.total).toBeGreaterThanOrEqual(6);

    const authorIds = new Set(queue.data.map((t) => t.author_id));
    expect(authorIds.size).toBeGreaterThan(1);
  });
});
