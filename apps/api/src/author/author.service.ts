import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AuthorRepository } from '../data/repositories/author.repository';
import { BookRepository } from '../data/repositories/book.repository';
import { TicketRepository } from '../data/repositories/ticket.repository';
import { TicketMessageRepository } from '../data/repositories/ticket-message.repository';
import { AuditRepository } from '../data/repositories/audit.repository';
import { AiService } from '../ai/ai.service';
import {
  TicketStatus,
  MessageVisibility,
  UserRole,
  TicketCategory,
  TicketPriority,
} from '@bookleaf/shared';
import type {
  Author,
  Book,
  Ticket,
  TicketMessage,
  AuthorDashboard,
} from '@bookleaf/shared';
import { CreateBookDto } from './dto/create-book.dto';

@Injectable()
export class AuthorService {
  private readonly logger = new Logger(AuthorService.name);

  constructor(
    private readonly authorRepo: AuthorRepository,
    private readonly bookRepo: BookRepository,
    private readonly ticketRepo: TicketRepository,
    private readonly messageRepo: TicketMessageRepository,
    private readonly auditRepo: AuditRepository,
    private readonly aiService: AiService,
  ) {}

  async getProfile(authorId: string): Promise<Author> {
    const author = await this.authorRepo.findById(authorId);
    if (!author) throw new NotFoundException('Author not found');
    return author;
  }

  async getDashboard(authorId: string): Promise<AuthorDashboard> {
    const author = await this.authorRepo.findById(authorId);
    if (!author) throw new NotFoundException('Author not found');

    const books = await this.bookRepo.findByAuthorId(authorId);
    const tickets = await this.ticketRepo.findByAuthorId(authorId);

    const publishedBooks = books.filter(
      (b) => b.status === 'Published & Live',
    );
    const inProductionBooks = books.filter(
      (b) => b.status !== 'Published & Live',
    );

    // Null-safe aggregations from source fields
    const totalCopiesSold = books.reduce(
      (sum, b) => sum + (b.total_copies_sold ?? 0),
      0,
    );
    const totalRoyaltiesEarned = books.reduce(
      (sum, b) => sum + (b.total_royalty_earned ?? 0),
      0,
    );
    const totalRoyaltiesPaid = books.reduce(
      (sum, b) => sum + (b.royalty_paid ?? 0),
      0,
    );
    const totalPendingRoyalties = books.reduce(
      (sum, b) => sum + (b.royalty_pending ?? 0),
      0,
    );

    // Recent books (last 5 by publication date, most recent first)
    const recentBooks = [...books]
      .sort((a, b) => {
        if (!a.publication_date && !b.publication_date) return 0;
        if (!a.publication_date) return -1; // in-production first
        if (!b.publication_date) return 1;
        return (
          new Date(b.publication_date).getTime() -
          new Date(a.publication_date).getTime()
        );
      })
      .slice(0, 5);

    // Recent tickets (last 5 by created_at)
    const recentTickets = [...tickets]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 5);

    return {
      author,
      total_books: books.length,
      published_books: publishedBooks.length,
      in_production_books: inProductionBooks.length,
      total_copies_sold: totalCopiesSold,
      total_royalties_earned: totalRoyaltiesEarned,
      total_royalties_paid: totalRoyaltiesPaid,
      total_pending_royalties: totalPendingRoyalties,
      recent_books: recentBooks,
      recent_tickets: recentTickets,
    };
  }

  async getBooks(authorId: string): Promise<Book[]> {
    const author = await this.authorRepo.findById(authorId);
    if (!author) throw new NotFoundException('Author not found');
    return this.bookRepo.findByAuthorId(authorId);
  }

  async getBook(authorId: string, bookId: string): Promise<Book> {
    const book = await this.bookRepo.findById(bookId);
    if (!book) throw new NotFoundException('Book not found');
    if (book.author_id !== authorId) {
      throw new ForbiddenException('You do not have access to this book');
    }
    return book;
  }

  async createTicket(
    authorId: string,
    userId: string,
    userName: string,
    data: { book_id: string | null; subject: string; description: string },
  ): Promise<Ticket> {
    // Validate book belongs to author
    let selectedBook: Book | null = null;
    if (data.book_id) {
      const book = await this.bookRepo.findById(data.book_id);
      if (!book) throw new BadRequestException('Selected book not found');
      if (book.author_id !== authorId) {
        throw new ForbiddenException('Selected book does not belong to you');
      }
      selectedBook = book;
    }

    // 1. Generate unique ticket reference
    const ticketNumber = await this.ticketRepo.getNextTicketNumber();
    const reference = `BL-${String(ticketNumber).padStart(4, '0')}`;
    const now = new Date().toISOString();

    // 2. Save ticket to repository first (ensures ticket exists even if AI fails)
    const initialTicket: Ticket = {
      id: uuidv4(),
      reference,
      author_id: authorId,
      book_id: data.book_id,
      subject: data.subject,
      description: data.description,
      status: TicketStatus.OPEN,
      ai_classification: null,
      final_category: TicketCategory.GENERAL_INQUIRY,
      final_priority: TicketPriority.MEDIUM,
      assigned_admin_id: null,
      assigned_admin_name: null,
      created_at: now,
      updated_at: now,
    };

    const savedTicket = await this.ticketRepo.create(initialTicket);

    // 3. Perform AI classification safely
    try {
      const classification = await this.aiService.classifyTicket({
        subject: data.subject,
        description: data.description,
        bookTitle: selectedBook?.title,
        bookStatus: selectedBook?.status,
      });

      const updated = await this.ticketRepo.update(savedTicket.id, {
        final_category: classification.category,
        final_priority: classification.priority,
        ai_classification: {
          suggested_category: classification.category,
          suggested_priority: classification.priority,
          reasoning: classification.reasoning,
          provider: classification.provider,
          classified_at: new Date().toISOString(),
          confidence: classification.confidence,
        },
      });

      this.logger.log(
        `Ticket ${reference} classified by ${classification.provider}: ${classification.category} (${classification.priority})`,
      );

      return updated || savedTicket;
    } catch (aiError: any) {
      this.logger.error(
        `AI classification failed for ${reference}; fallback retained: ${aiError.message}`,
      );
      return savedTicket;
    }
  }

  async getTickets(authorId: string): Promise<Ticket[]> {
    return this.ticketRepo.findByAuthorId(authorId);
  }

  async getTicket(
    authorId: string,
    ticketId: string,
  ): Promise<{ ticket: Ticket; messages: TicketMessage[]; book: Book | null }> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.author_id !== authorId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    // Only return PUBLIC messages for authors
    const messages = await this.messageRepo.findPublicByTicketId(ticketId);

    const book = ticket.book_id
      ? (await this.bookRepo.findById(ticket.book_id)) ?? null
      : null;

    return { ticket, messages, book };
  }

  async createReply(
    authorId: string,
    userId: string,
    userName: string,
    ticketId: string,
    content: string,
  ): Promise<TicketMessage> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.author_id !== authorId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    const message: TicketMessage = {
      id: uuidv4(),
      ticket_id: ticketId,
      sender_id: userId,
      sender_name: userName,
      sender_role: UserRole.AUTHOR,
      visibility: MessageVisibility.PUBLIC,
      content: content.trim(),
      is_ai_draft: false,
      created_at: new Date().toISOString(),
    };

    const saved = await this.messageRepo.create(message);

    // If ticket was resolved or closed, author reply moves it back to in progress
    const updateData: Partial<Ticket> = {
      updated_at: new Date().toISOString(),
    };
    if (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED) {
      updateData.status = TicketStatus.IN_PROGRESS;
    }
    await this.ticketRepo.update(ticketId, updateData);

    await this.auditRepo.create(
      ticketId,
      userId,
      userName,
      'AUTHOR_REPLY',
      { messageId: saved.id },
    );

    return saved;
  }

  async closeTicket(
    authorId: string,
    userId: string,
    userName: string,
    ticketId: string,
  ): Promise<Ticket> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.author_id !== authorId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    const updated = await this.ticketRepo.update(ticketId, {
      status: TicketStatus.RESOLVED,
      updated_at: new Date().toISOString(),
    });

    await this.auditRepo.create(
      ticketId,
      userId,
      userName,
      'AUTHOR_RESOLVED_TICKET',
      { previousStatus: ticket.status },
    );

    return updated || ticket;
  }

  async createBook(authorId: string, dto: CreateBookDto): Promise<Book> {
    const count = await this.bookRepo.count();
    const bookId = `BK${String(count + 1).padStart(3, '0')}`;
    const mrp = dto.mrp || 299;
    const royaltyPerCopy = Math.round(mrp * 0.15); // standard 15% royalty

    const book: Book = {
      book_id: bookId,
      author_id: authorId,
      title: dto.title.trim(),
      isbn: dto.isbn?.trim() || `978-93-${Math.floor(1000000 + Math.random() * 9000000)}`,
      genre: dto.genre.trim(),
      publication_date: new Date().toISOString().slice(0, 10),
      status: dto.status?.trim() || 'In Review / Production',
      mrp,
      author_royalty_per_copy: royaltyPerCopy,
      total_copies_sold: 0,
      total_royalty_earned: 0,
      royalty_paid: 0,
      royalty_pending: 0,
      last_royalty_payout_date: null,
      print_partner: 'Repro Books India',
      available_on: dto.available_on?.length
        ? dto.available_on
        : ['Amazon India', 'Flipkart', 'BookLeaf Bookstore'],
    };

    return this.bookRepo.create(book);
  }
}
