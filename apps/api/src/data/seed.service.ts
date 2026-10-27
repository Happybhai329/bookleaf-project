import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { JsonDataStore } from './json-data-store';
import { UserRepository } from './repositories/user.repository';
import { AuthorRepository } from './repositories/author.repository';
import { BookRepository } from './repositories/book.repository';
import { TicketRepository } from './repositories/ticket.repository';
import { TicketMessageRepository } from './repositories/ticket-message.repository';
import {
  UserRole,
  TicketStatus,
  TicketCategory,
  TicketPriority,
  MessageVisibility,
} from '@bookleaf/shared';
import type { User, Author, Book, Ticket, TicketMessage } from '@bookleaf/shared';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly store: JsonDataStore,
    private readonly userRepo: UserRepository,
    private readonly authorRepo: AuthorRepository,
    private readonly bookRepo: BookRepository,
    private readonly ticketRepo: TicketRepository,
    private readonly messageRepo: TicketMessageRepository,
  ) {}

  async seed(): Promise<void> {
    const isPostgres = process.env.DATA_PROVIDER !== 'json';

    if (!isPostgres && this.store.isSeeded()) {
      this.logger.log('JSON data store already seeded — skipping');
      return;
    }

    if (isPostgres) {
      const authorCount = await this.authorRepo.count();
      if (authorCount > 0) {
        this.logger.log(`PostgreSQL database already has ${authorCount} authors — skipping seed`);
        return;
      }
    }

    this.logger.log(`Seeding data store (${isPostgres ? 'PostgreSQL' : 'JSON'})...`);

    // Load source dataset robustly across dev / dist / root run contexts
    const candidatePaths = [
      path.resolve(process.cwd(), 'bookleaf_sample_data.json'),
      path.resolve(process.cwd(), '..', '..', 'bookleaf_sample_data.json'),
      path.resolve(__dirname, '..', '..', '..', 'bookleaf_sample_data.json'),
      path.resolve(__dirname, '..', '..', '..', '..', 'bookleaf_sample_data.json'),
    ];
    const samplePath = candidatePaths.find((p) => fs.existsSync(p));
    if (!samplePath) {
      this.logger.error(`Sample data not found in candidates: ${candidatePaths.join(', ')}`);
      throw new Error('bookleaf_sample_data.json not found');
    }

    const raw = fs.readFileSync(samplePath, 'utf-8');
    const sampleData = JSON.parse(raw) as {
      authors: Array<{
        author_id: string;
        name: string;
        email: string;
        phone: string;
        city: string;
        joined_date: string;
        books: Array<Record<string, unknown>>;
      }>;
    };

    const demoPassword = process.env.DEMO_PASSWORD || 'BookLeaf2024!';
    const passwordHash = await bcrypt.hash(demoPassword, 10);

    // Create admin user
    const adminUser: User = {
      id: uuidv4(),
      email: 'admin@bookleaf.in',
      password_hash: passwordHash,
      role: UserRole.ADMIN,
      author_id: null,
      display_name: 'BookLeaf Admin',
      created_at: new Date().toISOString(),
    };

    const users: User[] = [adminUser];
    const authors: Author[] = [];
    const books: Book[] = [];

    for (const authorData of sampleData.authors) {
      // Create author record
      const author: Author = {
        author_id: authorData.author_id,
        name: authorData.name,
        email: authorData.email,
        phone: authorData.phone,
        city: authorData.city,
        joined_date: authorData.joined_date,
      };
      authors.push(author);

      // Create user account for author
      const authorUser: User = {
        id: uuidv4(),
        email: authorData.email,
        password_hash: passwordHash,
        role: UserRole.AUTHOR,
        author_id: authorData.author_id,
        display_name: authorData.name,
        created_at: new Date().toISOString(),
      };
      users.push(authorUser);

      // Create book records
      for (const bookData of authorData.books) {
        const book: Book = {
          book_id: bookData.book_id as string,
          author_id: authorData.author_id,
          title: bookData.title as string,
          isbn: bookData.isbn as string,
          genre: bookData.genre as string,
          publication_date: (bookData.publication_date as string | null) ?? null,
          status: bookData.status as string,
          mrp: (bookData.mrp as number | null) ?? null,
          author_royalty_per_copy:
            (bookData.author_royalty_per_copy as number | null) ?? null,
          total_copies_sold: (bookData.total_copies_sold as number) ?? 0,
          total_royalty_earned: (bookData.total_royalty_earned as number) ?? 0,
          royalty_paid: (bookData.royalty_paid as number) ?? 0,
          royalty_pending: (bookData.royalty_pending as number) ?? 0,
          last_royalty_payout_date:
            (bookData.last_royalty_payout_date as string | null) ?? null,
          print_partner: (bookData.print_partner as string | null) ?? null,
          available_on: (bookData.available_on as string[]) ?? [],
        };
        books.push(book);
      }
    }

    await this.authorRepo.createMany(authors);
    await this.userRepo.createMany(users);
    await this.bookRepo.createMany(books);

    this.logger.log(
      `Seeded ${authors.length} authors, ${books.length} books, ${users.length} users`,
    );

    // Create demo tickets
    await this.seedDemoTickets(authors, books, users, adminUser);

    this.store.markSeeded();
    await this.store.persist();

    this.logger.log('✅ Data store seeding complete');
  }

  private async seedDemoTickets(
    authors: Author[],
    books: Book[],
    users: User[],
    adminUser: User,
  ): Promise<void> {
    const now = new Date();
    const tickets: Ticket[] = [];
    const messages: TicketMessage[] = [];

    // Helper to find user by author_id
    const findUser = (authorId: string) =>
      users.find((u) => u.author_id === authorId)!;

    // Demo ticket 1: Royalty query from Priya Sharma (AUTH001) about BK001
    const t1Id = uuidv4();
    const t1Ref = 'BL-0001';
    tickets.push({
      id: t1Id,
      reference: t1Ref,
      author_id: 'AUTH001',
      book_id: 'BK001',
      subject: 'Royalty payment not received for Q3 2025',
      description:
        'I was expecting a royalty payment for Whispers of the Ganges for Q3 2025, but I have not received any payment yet. My bank details are up to date. Could you please check the status of my pending royalty payment? The dashboard shows ₹3,570 pending.',
      status: TicketStatus.OPEN,
      ai_classification: {
        suggested_category: TicketCategory.ROYALTY_PAYMENTS,
        suggested_priority: TicketPriority.HIGH,
        reasoning:
          'Author reports missing royalty payment with specific amount reference. Royalty-related keywords detected.',
        provider: 'mock',
        classified_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        confidence: 'high',
      },
      final_category: TicketCategory.ROYALTY_PAYMENTS,
      final_priority: TicketPriority.HIGH,
      assigned_admin_id: null,
      assigned_admin_name: null,
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Demo ticket 2: ISBN issue from Rohit Kapoor (AUTH002) about BK003
    const t2Id = uuidv4();
    const t2Ref = 'BL-0002';
    tickets.push({
      id: t2Id,
      reference: t2Ref,
      author_id: 'AUTH002',
      book_id: 'BK003',
      subject: 'Incorrect ISBN displayed on Amazon listing',
      description:
        'The ISBN shown on the Amazon India listing for Code & Karma does not match the ISBN assigned by BookLeaf. The listing shows a different ISBN number. This needs to be corrected urgently as it could cause distribution issues.',
      status: TicketStatus.IN_PROGRESS,
      ai_classification: {
        suggested_category: TicketCategory.ISBN_METADATA,
        suggested_priority: TicketPriority.HIGH,
        reasoning:
          'ISBN discrepancy on retail listing. Duplicate/incorrect ISBN keywords detected. High priority due to potential distribution impact.',
        provider: 'mock',
        classified_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        confidence: 'high',
      },
      final_category: TicketCategory.ISBN_METADATA,
      final_priority: TicketPriority.HIGH,
      assigned_admin_id: adminUser.id,
      assigned_admin_name: adminUser.display_name,
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    });
    messages.push({
      id: uuidv4(),
      ticket_id: t2Id,
      sender_id: adminUser.id,
      sender_name: adminUser.display_name,
      sender_role: UserRole.ADMIN,
      visibility: MessageVisibility.PUBLIC,
      content:
        'Thank you for bringing this to our attention, Rohit. We have escalated this ISBN discrepancy to our production team for immediate investigation. We will update you within 48 hours once we have more information.',
      is_ai_draft: false,
      created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    });
    messages.push({
      id: uuidv4(),
      ticket_id: t2Id,
      sender_id: adminUser.id,
      sender_name: adminUser.display_name,
      sender_role: UserRole.ADMIN,
      visibility: MessageVisibility.INTERNAL_NOTE,
      content:
        'Checked with production — the correct ISBN is 978-93-5XXXX-03-5 as per our records. Amazon listing may have been auto-populated incorrectly. Need to coordinate with distribution team to fix.',
      is_ai_draft: false,
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Demo ticket 3: Print quality issue from Vikram Joshi (AUTH004) about BK006
    const t3Id = uuidv4();
    const t3Ref = 'BL-0003';
    tickets.push({
      id: t3Id,
      reference: t3Ref,
      author_id: 'AUTH004',
      book_id: 'BK006',
      subject: 'Blurry images in printed copies of Debugging Life',
      description:
        'Several readers have complained about blurry images in the latest batch of Debugging Life. The code screenshots in chapters 5-8 are particularly affected. I ordered an author copy and can confirm the images look washed out compared to the original manuscript.',
      status: TicketStatus.OPEN,
      ai_classification: {
        suggested_category: TicketCategory.PRINTING_QUALITY,
        suggested_priority: TicketPriority.MEDIUM,
        reasoning:
          'Reports blurry images and print quality issues. Printing/quality keywords detected.',
        provider: 'mock',
        classified_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        confidence: 'high',
      },
      final_category: TicketCategory.PRINTING_QUALITY,
      final_priority: TicketPriority.MEDIUM,
      assigned_admin_id: null,
      assigned_admin_name: null,
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Demo ticket 4: Distribution issue from Sneha Kulkarni (AUTH007) about BK011
    const t4Id = uuidv4();
    const t4Ref = 'BL-0004';
    tickets.push({
      id: t4Id,
      reference: t4Ref,
      author_id: 'AUTH007',
      book_id: 'BK011',
      subject: 'Book showing out of stock on Flipkart',
      description:
        'The Algorithm of Love has been showing as "out of stock" on Flipkart for the past 2 weeks, even though it is available on Amazon India. This is impacting my sales. Can you please look into the Flipkart listing and re-sync the stock?',
      status: TicketStatus.RESOLVED,
      ai_classification: {
        suggested_category: TicketCategory.DISTRIBUTION_AVAILABILITY,
        suggested_priority: TicketPriority.MEDIUM,
        reasoning:
          'Stock/availability issue on a distribution platform. Distribution keywords detected.',
        provider: 'mock',
        classified_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        confidence: 'high',
      },
      final_category: TicketCategory.DISTRIBUTION_AVAILABILITY,
      final_priority: TicketPriority.MEDIUM,
      assigned_admin_id: adminUser.id,
      assigned_admin_name: adminUser.display_name,
      created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    messages.push({
      id: uuidv4(),
      ticket_id: t4Id,
      sender_id: adminUser.id,
      sender_name: adminUser.display_name,
      sender_role: UserRole.ADMIN,
      visibility: MessageVisibility.PUBLIC,
      content:
        'Hi Sneha, we identified a stock synchronization issue with Flipkart. We have triggered a re-sync which typically takes 24-48 hours. The listing should be active again shortly. We will follow up to confirm.',
      is_ai_draft: false,
      created_at: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    });
    messages.push({
      id: uuidv4(),
      ticket_id: t4Id,
      sender_id: adminUser.id,
      sender_name: adminUser.display_name,
      sender_role: UserRole.ADMIN,
      visibility: MessageVisibility.PUBLIC,
      content:
        'The Flipkart listing for The Algorithm of Love is now back in stock. Please verify from your end and let us know if the issue persists.',
      is_ai_draft: false,
      created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Demo ticket 5: Production query from Kavita Deshmukh (AUTH009) about BK015
    const t5Id = uuidv4();
    const t5Ref = 'BL-0005';
    tickets.push({
      id: t5Id,
      reference: t5Ref,
      author_id: 'AUTH009',
      book_id: 'BK015',
      subject: 'When will Raising Roots move to proofreading stage?',
      description:
        'My book Raising Roots has been in the Typesetting stage for over 3 weeks now. I was told it would take about 5-7 business days. Can you please provide an update on when it will move to the proofreading stage?',
      status: TicketStatus.OPEN,
      ai_classification: {
        suggested_category: TicketCategory.BOOK_STATUS_PRODUCTION,
        suggested_priority: TicketPriority.MEDIUM,
        reasoning:
          'Author inquiring about production stage progress. Production/typesetting keywords detected.',
        provider: 'mock',
        classified_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        confidence: 'high',
      },
      final_category: TicketCategory.BOOK_STATUS_PRODUCTION,
      final_priority: TicketPriority.MEDIUM,
      assigned_admin_id: null,
      assigned_admin_name: null,
      created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Demo ticket 6: General inquiry from Diya Chatterjee (AUTH010)
    const t6Id = uuidv4();
    const t6Ref = 'BL-0006';
    tickets.push({
      id: t6Id,
      reference: t6Ref,
      author_id: 'AUTH010',
      book_id: null,
      subject: 'How can I update my book description on Amazon?',
      description:
        'I would like to update the book description for Durga\'s Daughters on Amazon India. The current description has a typo and I want to add a new review quote. What is the process for updating metadata on distribution platforms?',
      status: TicketStatus.CLOSED,
      ai_classification: {
        suggested_category: TicketCategory.GENERAL_INQUIRY,
        suggested_priority: TicketPriority.LOW,
        reasoning:
          'General question about metadata update process. No urgent issue detected.',
        provider: 'mock',
        classified_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        confidence: 'medium',
      },
      final_category: TicketCategory.GENERAL_INQUIRY,
      final_priority: TicketPriority.LOW,
      assigned_admin_id: adminUser.id,
      assigned_admin_name: adminUser.display_name,
      created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString(),
    });
    messages.push({
      id: uuidv4(),
      ticket_id: t6Id,
      sender_id: adminUser.id,
      sender_name: adminUser.display_name,
      sender_role: UserRole.ADMIN,
      visibility: MessageVisibility.PUBLIC,
      content:
        'Hi Diya! You can update your book description by submitting the revised text through your BookLeaf dashboard or by emailing it to our team at support@bookleaf.in. Changes typically reflect on distribution platforms within 3-5 business days. Let us know if you need any help with the wording!',
      is_ai_draft: false,
      created_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Set ticket counter
    this.store.getData().meta.ticket_counter = 6;

    // Store all demo data
    for (const ticket of tickets) {
      await this.ticketRepo.create(ticket);
    }
    await this.messageRepo.createMany(messages);

    this.logger.log(`Seeded ${tickets.length} demo tickets with ${messages.length} messages`);
  }
}
