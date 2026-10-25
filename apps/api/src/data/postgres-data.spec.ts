import { UserRepository } from './repositories/user.repository';
import { AuthorRepository } from './repositories/author.repository';
import { BookRepository } from './repositories/book.repository';
import { TicketRepository } from './repositories/ticket.repository';
import { TicketMessageRepository } from './repositories/ticket-message.repository';
import { AuditRepository } from './repositories/audit.repository';
import { AuthorService } from '../author/author.service';
import { AdminService } from '../admin/admin.service';
import { AiService } from '../ai/ai.service';
import { MockAiProvider } from '../ai/mock-ai.provider';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
  UserRole,
  MessageVisibility,
} from '@bookleaf/shared';
import type { Ticket, TicketMessage, Book, Author } from '@bookleaf/shared';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

describe('PostgreSQL Relational Persistence & Repository Layer (12 Test Cases)', () => {
  let mockPrisma: any;
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
    id: 'admin_uuid_1',
    email: 'admin@bookleaf.in',
    role: UserRole.ADMIN,
    author_id: null,
    display_name: 'BookLeaf Admin',
  };

  const sampleAuthors: Author[] = [
    {
      author_id: 'AUTH001',
      name: 'Priya Sharma',
      email: 'priya.sharma@email.com',
      phone: '+91 98765 43210',
      city: 'Varanasi',
      joined_date: '2023-01-15',
    },
    {
      author_id: 'AUTH002',
      name: 'Rohit Kapoor',
      email: 'rohit.kapoor@email.com',
      phone: '+91 98765 43211',
      city: 'Bengaluru',
      joined_date: '2023-02-10',
    },
  ];

  const sampleBooks: Book[] = [
    {
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
      available_on: ['Amazon India', 'Flipkart'],
    },
    {
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
    },
  ];

  const dbTickets: any[] = [];
  const dbMessages: any[] = [];
  const dbAudit: any[] = [];

  beforeEach(() => {
    dbTickets.length = 0;
    dbMessages.length = 0;
    dbAudit.length = 0;

    mockPrisma = {
      author: {
        findMany: jest.fn().mockResolvedValue(sampleAuthors),
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          return Promise.resolve(sampleAuthors.find((a) => a.author_id === where.author_id) || null);
        }),
        findFirst: jest.fn().mockImplementation(({ where }: any) => {
          return Promise.resolve(sampleAuthors.find((a) => a.email.toLowerCase() === where.email.equals.toLowerCase()) || null);
        }),
        count: jest.fn().mockResolvedValue(sampleAuthors.length),
      },
      book: {
        findMany: jest.fn().mockImplementation(({ where }: any) => {
          if (where?.author_id) {
            return Promise.resolve(sampleBooks.filter((b) => b.author_id === where.author_id));
          }
          return Promise.resolve(sampleBooks);
        }),
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          return Promise.resolve(sampleBooks.find((b) => b.book_id === where.book_id) || null);
        }),
        findFirst: jest.fn().mockImplementation(({ where }: any) => {
          return Promise.resolve(sampleBooks.find((b) => b.isbn === where.isbn) || null);
        }),
        count: jest.fn().mockResolvedValue(sampleBooks.length),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }: any) => {
          return Promise.resolve({ ...data, created_at: new Date() });
        }),
        count: jest.fn().mockResolvedValue(0),
      },
      ticket: {
        findMany: jest.fn().mockImplementation(({ where }: any) => {
          let list = [...dbTickets];
          if (where?.author_id) {
            list = list.filter((t) => t.author_id === where.author_id);
          }
          if (where?.status) {
            list = list.filter((t) => t.status === where.status);
          }
          if (where?.final_category) {
            list = list.filter((t) => t.final_category === where.final_category);
          }
          if (where?.final_priority) {
            list = list.filter((t) => t.final_priority === where.final_priority);
          }
          return Promise.resolve(list);
        }),
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.id) return Promise.resolve(dbTickets.find((t) => t.id === where.id) || null);
          if (where.reference) return Promise.resolve(dbTickets.find((t) => t.reference === where.reference) || null);
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation(({ data }: any) => {
          const record = {
            ...data,
            created_at: data.created_at || new Date(),
            updated_at: data.updated_at || new Date(),
          };
          dbTickets.push(record);
          return Promise.resolve(record);
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const idx = dbTickets.findIndex((t) => t.id === where.id);
          if (idx !== -1) {
            dbTickets[idx] = { ...dbTickets[idx], ...data, updated_at: new Date() };
            return Promise.resolve(dbTickets[idx]);
          }
          return Promise.resolve(null);
        }),
        count: jest.fn().mockImplementation((args?: any) => {
          const where = args?.where;
          let list = [...dbTickets];
          if (where?.status) {
            if (typeof where.status === 'object' && where.status.notIn) {
              list = list.filter((t) => !where.status.notIn.includes(t.status));
            } else {
              list = list.filter((t) => t.status === where.status);
            }
          }
          if (where?.assigned_admin_id === null) {
            list = list.filter((t) => !t.assigned_admin_id);
          }
          return Promise.resolve(list.length);
        }),
      },
      ticketMessage: {
        findMany: jest.fn().mockImplementation(({ where }: any) => {
          let list = dbMessages.filter((m) => m.ticket_id === where.ticket_id);
          if (where?.visibility) {
            list = list.filter((m) => m.visibility === where.visibility);
          }
          return Promise.resolve(list);
        }),
        create: jest.fn().mockImplementation(({ data }: any) => {
          const record = {
            ...data,
            created_at: data.created_at || new Date(),
          };
          dbMessages.push(record);
          return Promise.resolve(record);
        }),
      },
      auditLog: {
        findMany: jest.fn().mockImplementation(({ where }: any) => {
          return Promise.resolve(dbAudit.filter((a) => a.ticket_id === where.ticket_id));
        }),
        create: jest.fn().mockImplementation(({ data }: any) => {
          const record = {
            ...data,
            created_at: data.created_at || new Date(),
          };
          dbAudit.push(record);
          return Promise.resolve(record);
        }),
      },
    };

    process.env.DATA_PROVIDER = 'postgres';
    userRepo = new UserRepository({} as any, mockPrisma);
    authorRepo = new AuthorRepository({} as any, mockPrisma);
    bookRepo = new BookRepository({} as any, mockPrisma);
    ticketRepo = new TicketRepository({} as any, mockPrisma);
    messageRepo = new TicketMessageRepository({} as any, mockPrisma);
    auditRepo = new AuditRepository({} as any, mockPrisma);

    const mockAi = new MockAiProvider();
    const knowledgeBase = new KnowledgeBaseService();
    aiService = new AiService(mockAi, knowledgeBase);

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

  // 1. Authors query
  it('Case 1: Queries all authors with correct schema fields', async () => {
    const authors = await authorRepo.findAll();
    expect(authors.length).toBe(2);
    expect(authors[0].author_id).toBe('AUTH001');
    expect(authors[0].name).toBe('Priya Sharma');
    expect(mockPrisma.author.findMany).toHaveBeenCalled();
  });

  // 2. Books query with relations
  it('Case 2: Queries books by author relation', async () => {
    const priyaBooks = await bookRepo.findByAuthorId('AUTH001');
    expect(priyaBooks.length).toBe(1);
    expect(priyaBooks[0].title).toBe('Whispers of the Ganges');
    expect(priyaBooks[0].author_id).toBe('AUTH001');
  });

  // 3. Ticket creation with correct foreign keys
  it('Case 3: Creates a ticket with valid author_id and book_id relations', async () => {
    const ticket = await authorService.createTicket('AUTH001', 'user_1', 'Priya', {
      book_id: 'BK001',
      subject: 'Royalty inquiry',
      description: 'Pending payout query',
    });

    expect(ticket.author_id).toBe('AUTH001');
    expect(ticket.book_id).toBe('BK001');
    expect(ticket.reference).toBe('BL-0001');
    expect(mockPrisma.ticket.create).toHaveBeenCalled();
  });

  // 4. Ticket update (status transition, priority change, category change)
  it('Case 4: Updates ticket status and priority in database', async () => {
    const ticket = await authorService.createTicket('AUTH001', 'user_1', 'Priya', {
      book_id: 'BK001',
      subject: 'Defective copies',
      description: 'Pages missing',
    });

    const updated = await adminService.updateTicket(
      ticket.id,
      {
        status: TicketStatus.IN_PROGRESS,
        final_priority: TicketPriority.CRITICAL,
      },
      mockAdminUser,
    );

    expect(updated.status).toBe(TicketStatus.IN_PROGRESS);
    expect(updated.final_priority).toBe(TicketPriority.CRITICAL);
    expect(mockPrisma.ticket.update).toHaveBeenCalled();
  });

  // 5. Ticket message creation (PUBLIC vs INTERNAL_NOTE)
  it('Case 5: Creates PUBLIC replies and INTERNAL_NOTE messages with correct visibility flags', async () => {
    const ticket = await authorService.createTicket('AUTH001', 'user_1', 'Priya', {
      book_id: null,
      subject: 'General query',
      description: 'Hello',
    });

    const publicMsg = await adminService.addReply(ticket.id, 'Official reply', mockAdminUser);
    const internalNote = await adminService.addNote(ticket.id, 'Staff note only', mockAdminUser);

    expect(publicMsg.visibility).toBe(MessageVisibility.PUBLIC);
    expect(internalNote.visibility).toBe(MessageVisibility.INTERNAL_NOTE);
    expect(mockPrisma.ticketMessage.create).toHaveBeenCalledTimes(2);
  });

  // 6. Public message isolation: author view queries only PUBLIC messages
  it('Case 6: Author view filters out internal staff notes completely', async () => {
    const ticket = await authorService.createTicket('AUTH001', 'user_1', 'Priya', {
      book_id: null,
      subject: 'Security check',
      description: 'Check visibility',
    });

    await adminService.addReply(ticket.id, 'Public message for author', mockAdminUser);
    await adminService.addNote(ticket.id, 'SECRET STAFF NOTE: do not show to author', mockAdminUser);

    const authorView = await authorService.getTicket('AUTH001', ticket.id);
    expect(authorView.messages.length).toBe(1);
    expect(authorView.messages[0].content).toBe('Public message for author');
    expect(
      authorView.messages.some((m) => m.visibility === MessageVisibility.INTERNAL_NOTE),
    ).toBe(false);
  });

  // 7. Cross-author ticket isolation: author A cannot access author B's ticket
  it('Case 7: Rejects cross-author ticket access with ForbiddenException', async () => {
    const ticket = await authorService.createTicket('AUTH001', 'user_1', 'Priya', {
      book_id: null,
      subject: 'Priya private ticket',
      description: 'Confidential',
    });

    // Rohit (AUTH002) tries to access Priya's ticket
    await expect(authorService.getTicket('AUTH002', ticket.id)).rejects.toThrow(
      ForbiddenException,
    );
  });

  // 8. Cross-author book isolation: author A cannot select author B's book
  it('Case 8: Rejects attaching another author book to a new ticket', async () => {
    // Priya (AUTH001) tries to create ticket with Rohit's book BK003
    await expect(
      authorService.createTicket('AUTH001', 'user_1', 'Priya', {
        book_id: 'BK003',
        subject: 'Unauthorized book attachment',
        description: 'Should fail',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  // 9. Pagination and filtering on tickets
  it('Case 9: Correctly filters and paginates tickets in admin queue', async () => {
    await authorService.createTicket('AUTH001', 'user_1', 'Priya', {
      book_id: 'BK001',
      subject: 'Royalty check 1',
      description: 'Royalty details',
    });

    const res = await adminService.getTickets({
      category: TicketCategory.ROYALTY_PAYMENTS,
      page: 1,
      limit: 10,
    });

    expect(res.data.length).toBeGreaterThanOrEqual(1);
    expect(res.data[0].final_category).toBe(TicketCategory.ROYALTY_PAYMENTS);
  });

  // 10. Unassigned tickets filter and count
  it('Case 10: Correctly counts unassigned unresolved tickets', async () => {
    await authorService.createTicket('AUTH001', 'user_1', 'Priya', {
      book_id: null,
      subject: 'Unassigned ticket',
      description: 'Needs assignment',
    });

    const unassignedCount = await ticketRepo.countUnassigned();
    expect(unassignedCount).toBeGreaterThan(0);
  });

  // 11. Audit log entry creation
  it('Case 11: Creates structured audit log records on admin mutations', async () => {
    const ticket = await authorService.createTicket('AUTH001', 'user_1', 'Priya', {
      book_id: null,
      subject: 'Audit test',
      description: 'Testing audit logs',
    });

    await adminService.addReply(ticket.id, 'Audit logged reply', mockAdminUser);

    expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    const logs = await auditRepo.findByTicketId(ticket.id);
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].action).toBe('REPLY_SENT');
    expect(logs[0].user_name).toBe(mockAdminUser.display_name);
  });

  // 12. Decimals and monetary preservation
  it('Case 12: Preserves book monetary values without precision loss', async () => {
    const book = await bookRepo.findById('BK001');
    expect(book).toBeDefined();
    expect(typeof book!.mrp).toBe('number');
    expect(book!.mrp).toBe(399);
    expect(typeof book!.royalty_pending).toBe('number');
    expect(book!.royalty_pending).toBe(3570);
    expect(isNaN(book!.royalty_pending)).toBe(false);
  });
});
