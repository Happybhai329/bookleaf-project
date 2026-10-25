import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TicketRepository } from '../data/repositories/ticket.repository';
import { TicketMessageRepository } from '../data/repositories/ticket-message.repository';
import { AuthorRepository } from '../data/repositories/author.repository';
import { BookRepository } from '../data/repositories/book.repository';
import { UserRepository } from '../data/repositories/user.repository';
import { AuditRepository } from '../data/repositories/audit.repository';
import { AiService } from '../ai/ai.service';
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
  MessageVisibility,
  UserRole,
} from '@bookleaf/shared';
import type {
  Ticket,
  TicketMessage,
  Author,
  Book,
  AdminDashboard,
  PaginatedResponse,
  AuthUser,
  TicketContext,
} from '@bookleaf/shared';
import { TicketFilterDto } from './dto/ticket-filter.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

export interface EnrichedTicket extends Ticket {
  author_name: string;
  author_email: string;
  book_title: string | null;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly ticketRepo: TicketRepository,
    private readonly messageRepo: TicketMessageRepository,
    private readonly authorRepo: AuthorRepository,
    private readonly bookRepo: BookRepository,
    private readonly userRepo: UserRepository,
    private readonly auditRepo: AuditRepository,
    private readonly aiService: AiService,
  ) {}

  async getDashboard(): Promise<AdminDashboard> {
    const allTickets = await this.ticketRepo.findAll();

    const openCount = allTickets.filter((t) => t.status === TicketStatus.OPEN).length;
    const inProgressCount = allTickets.filter(
      (t) => t.status === TicketStatus.IN_PROGRESS,
    ).length;
    const resolvedCount = allTickets.filter(
      (t) => t.status === TicketStatus.RESOLVED,
    ).length;
    const closedCount = allTickets.filter(
      (t) => t.status === TicketStatus.CLOSED,
    ).length;

    const criticalUnresolved = allTickets.filter(
      (t) =>
        t.final_priority === TicketPriority.CRITICAL &&
        t.status !== TicketStatus.RESOLVED &&
        t.status !== TicketStatus.CLOSED,
    ).length;

    const highUnresolved = allTickets.filter(
      (t) =>
        t.final_priority === TicketPriority.HIGH &&
        t.status !== TicketStatus.RESOLVED &&
        t.status !== TicketStatus.CLOSED,
    ).length;

    const unassignedCount = allTickets.filter(
      (t) =>
        !t.assigned_admin_id &&
        t.status !== TicketStatus.RESOLVED &&
        t.status !== TicketStatus.CLOSED,
    ).length;

    // Categories breakdown
    const ticketsByCategory: Record<TicketCategory, number> = {
      [TicketCategory.ROYALTY_PAYMENTS]: 0,
      [TicketCategory.ISBN_METADATA]: 0,
      [TicketCategory.PRINTING_QUALITY]: 0,
      [TicketCategory.DISTRIBUTION_AVAILABILITY]: 0,
      [TicketCategory.BOOK_STATUS_PRODUCTION]: 0,
      [TicketCategory.GENERAL_INQUIRY]: 0,
    };

    for (const ticket of allTickets) {
      if (ticketsByCategory[ticket.final_category] !== undefined) {
        ticketsByCategory[ticket.final_category]++;
      }
    }

    // Oldest unresolved
    const oldestUnresolved = allTickets
      .filter(
        (t) =>
          t.status !== TicketStatus.RESOLVED && t.status !== TicketStatus.CLOSED,
      )
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
      .slice(0, 5);

    return {
      total_tickets: allTickets.length,
      open_tickets: openCount,
      in_progress_tickets: inProgressCount,
      resolved_tickets: resolvedCount,
      closed_tickets: closedCount,
      critical_unresolved: criticalUnresolved,
      high_unresolved: highUnresolved,
      unassigned_tickets: unassignedCount,
      tickets_by_category: ticketsByCategory,
      oldest_unresolved: oldestUnresolved,
    };
  }

  async getTickets(filters: TicketFilterDto): Promise<PaginatedResponse<EnrichedTicket>> {
    const { data: tickets, total } = await this.ticketRepo.findFiltered(filters);

    const enriched: EnrichedTicket[] = await Promise.all(
      tickets.map(async (t) => {
        const author = await this.authorRepo.findById(t.author_id);
        const book = t.book_id ? await this.bookRepo.findById(t.book_id) : null;

        return {
          ...t,
          author_name: author?.name || 'Unknown Author',
          author_email: author?.email || 'unknown@email.com',
          book_title: book?.title || null,
        };
      }),
    );

    const page = filters.page || 1;
    const limit = filters.limit || 20;

    return {
      data: enriched,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    };
  }

  async getTicket(ticketId: string): Promise<{
    ticket: Ticket;
    author: Author;
    book: Book | null;
    messages: TicketMessage[];
    audit: any[];
  }> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    const author = await this.authorRepo.findById(ticket.author_id);
    if (!author) {
      throw new NotFoundException(`Author not found for ticket ${ticketId}`);
    }

    const book = ticket.book_id ? (await this.bookRepo.findById(ticket.book_id)) ?? null : null;
    const messages = await this.messageRepo.findByTicketId(ticketId);
    const audit = await this.auditRepo.findByTicketId(ticketId);

    return {
      ticket,
      author,
      book,
      messages,
      audit,
    };
  }

  async updateTicket(
    ticketId: string,
    dto: UpdateTicketDto,
    adminUser: AuthUser,
  ): Promise<Ticket> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    const updates: Partial<Ticket> = {};
    const auditChanges: Record<string, any> = {};

    if (dto.final_category && dto.final_category !== ticket.final_category) {
      updates.final_category = dto.final_category;
      auditChanges.previous_category = ticket.final_category;
      auditChanges.new_category = dto.final_category;
    }

    if (dto.final_priority && dto.final_priority !== ticket.final_priority) {
      updates.final_priority = dto.final_priority;
      auditChanges.previous_priority = ticket.final_priority;
      auditChanges.new_priority = dto.final_priority;
    }

    if (dto.status && dto.status !== ticket.status) {
      updates.status = dto.status;
      auditChanges.previous_status = ticket.status;
      auditChanges.new_status = dto.status;
    }

    if (Object.keys(updates).length === 0) {
      return ticket;
    }

    const updated = await this.ticketRepo.update(ticketId, updates);
    if (!updated) {
      throw new BadRequestException('Failed to update ticket');
    }

    await this.auditRepo.create(
      ticketId,
      adminUser.id,
      adminUser.display_name,
      'TICKET_UPDATED',
      auditChanges,
    );

    return updated;
  }

  async generateDraft(
    ticketId: string,
    additionalContext?: string,
  ) {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    const author = await this.authorRepo.findById(ticket.author_id);
    if (!author) {
      throw new NotFoundException(`Author not found for ticket ${ticketId}`);
    }

    const book = ticket.book_id ? (await this.bookRepo.findById(ticket.book_id)) ?? null : null;
    const publicMessages = await this.messageRepo.findPublicByTicketId(ticketId);

    const ticketContext: TicketContext = {
      subject: ticket.subject,
      description: additionalContext
        ? `${ticket.description}\n[Admin note: ${additionalContext}]`
        : ticket.description,
      book,
      author,
      category: ticket.final_category,
      priority: ticket.final_priority,
      existing_messages: publicMessages.map((m) => ({
        sender_role: m.sender_role,
        content: m.content,
        created_at: m.created_at,
      })),
    };

    return this.aiService.generateReplyDraft(ticketContext);
  }

  async addReply(
    ticketId: string,
    content: string,
    adminUser: AuthUser,
  ): Promise<TicketMessage> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    const message: TicketMessage = {
      id: uuidv4(),
      ticket_id: ticketId,
      sender_id: adminUser.id,
      sender_name: adminUser.display_name,
      sender_role: UserRole.ADMIN,
      visibility: MessageVisibility.PUBLIC,
      content,
      is_ai_draft: false,
      created_at: new Date().toISOString(),
    };

    await this.messageRepo.create(message);

    // Update ticket timestamp & move to IN_PROGRESS if OPEN
    const updates: Partial<Ticket> = { updated_at: new Date().toISOString() };
    if (ticket.status === TicketStatus.OPEN) {
      updates.status = TicketStatus.IN_PROGRESS;
    }
    await this.ticketRepo.update(ticketId, updates);

    await this.auditRepo.create(
      ticketId,
      adminUser.id,
      adminUser.display_name,
      'REPLY_SENT',
      { preview: content.slice(0, 100) },
    );

    return message;
  }

  async addNote(
    ticketId: string,
    content: string,
    adminUser: AuthUser,
  ): Promise<TicketMessage> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    const message: TicketMessage = {
      id: uuidv4(),
      ticket_id: ticketId,
      sender_id: adminUser.id,
      sender_name: adminUser.display_name,
      sender_role: UserRole.ADMIN,
      visibility: MessageVisibility.INTERNAL_NOTE,
      content,
      is_ai_draft: false,
      created_at: new Date().toISOString(),
    };

    await this.messageRepo.create(message);
    await this.ticketRepo.update(ticketId, { updated_at: new Date().toISOString() });

    await this.auditRepo.create(
      ticketId,
      adminUser.id,
      adminUser.display_name,
      'INTERNAL_NOTE_ADDED',
      { preview: content.slice(0, 100) },
    );

    return message;
  }

  async assignTicket(
    ticketId: string,
    adminId: string | null,
    currentAdmin: AuthUser,
  ): Promise<Ticket> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    let assignedAdminName: string | null = null;
    if (adminId) {
      const admin = await this.userRepo.findById(adminId);
      if (!admin || admin.role !== UserRole.ADMIN) {
        throw new BadRequestException('Assigned user must be an administrator');
      }
      assignedAdminName = admin.display_name;
    }

    const updated = await this.ticketRepo.update(ticketId, {
      assigned_admin_id: adminId,
      assigned_admin_name: assignedAdminName,
    });

    if (!updated) {
      throw new BadRequestException('Failed to assign ticket');
    }

    await this.auditRepo.create(
      ticketId,
      currentAdmin.id,
      currentAdmin.display_name,
      'ASSIGNMENT_CHANGED',
      {
        assigned_to_id: adminId,
        assigned_to_name: assignedAdminName,
      },
    );

    return updated;
  }

  async getAuthors(): Promise<any[]> {
    const authors = await this.authorRepo.findAll();
    const books = await this.bookRepo.findAll();
    const tickets = await this.ticketRepo.findAll();

    return authors.map((author) => {
      const authorBooks = books.filter((b) => b.author_id === author.author_id);
      const authorTickets = tickets.filter((t) => t.author_id === author.author_id);

      const totalCopiesSold = authorBooks.reduce((sum, b) => sum + (b.total_copies_sold || 0), 0);
      const totalRoyaltyEarned = authorBooks.reduce((sum, b) => sum + Number(b.total_royalty_earned || 0), 0);
      const royaltyPending = authorBooks.reduce((sum, b) => sum + Number(b.royalty_pending || 0), 0);
      const openTicketsCount = authorTickets.filter(
        (t) => t.status === TicketStatus.OPEN || t.status === TicketStatus.IN_PROGRESS,
      ).length;

      return {
        ...author,
        books_count: authorBooks.length,
        live_books_count: authorBooks.filter((b) => b.status === 'Published & Live').length,
        total_copies_sold: totalCopiesSold,
        total_royalty_earned: totalRoyaltyEarned,
        royalty_pending: royaltyPending,
        open_tickets_count: openTicketsCount,
        books: authorBooks,
      };
    });
  }

  async getBooks(): Promise<any[]> {
    const books = await this.bookRepo.findAll();
    const authors = await this.authorRepo.findAll();
    const authorMap = new Map(authors.map((a) => [a.author_id, a]));

    return books.map((b) => ({
      ...b,
      author_name: authorMap.get(b.author_id)?.name || 'Unknown Author',
      author_email: authorMap.get(b.author_id)?.email || '',
    }));
  }
}
