import * as fs from 'fs';
import * as path from 'path';
import { JsonDataStore } from './json-data-store';
import { UserRepository } from './repositories/user.repository';
import { AuthorRepository } from './repositories/author.repository';
import { BookRepository } from './repositories/book.repository';
import { TicketRepository } from './repositories/ticket.repository';
import { TicketMessageRepository } from './repositories/ticket-message.repository';
import { SeedService } from './seed.service';

describe('Seed and Data Integrity', () => {
  let store: JsonDataStore;
  let userRepo: UserRepository;
  let authorRepo: AuthorRepository;
  let bookRepo: BookRepository;
  let ticketRepo: TicketRepository;
  let messageRepo: TicketMessageRepository;
  let seedService: SeedService;

  beforeAll(async () => {
    // Set explicit json mode for this test suite
    process.env.DATA_PROVIDER = 'json';
    store = new JsonDataStore();
    userRepo = new UserRepository(store);
    authorRepo = new AuthorRepository(store);
    bookRepo = new BookRepository(store);
    ticketRepo = new TicketRepository(store);
    messageRepo = new TicketMessageRepository(store);
    seedService = new SeedService(
      store,
      userRepo,
      authorRepo,
      bookRepo,
      ticketRepo,
      messageRepo,
    );
    await seedService.seed();
  });

  it('Requirement 1: All 10 supplied authors and 18 books are imported correctly', async () => {
    const authors = await authorRepo.findAll();
    const books = await bookRepo.findAll();

    expect(authors.length).toBe(10);
    expect(books.length).toBe(18);

    // Verify key authors
    const priya = await authorRepo.findById('AUTH001');
    expect(priya).toBeDefined();
    expect(priya?.name).toBe('Priya Sharma');
    expect(priya?.email).toBe('priya.sharma@email.com');

    const diya = await authorRepo.findById('AUTH010');
    expect(diya).toBeDefined();
    expect(diya?.name).toBe('Diya Chatterjee');
  });

  it('Requirement 2: Seed operations do not duplicate existing records (idempotent)', async () => {
    const authorsBefore = (await authorRepo.findAll()).length;
    const booksBefore = (await bookRepo.findAll()).length;

    // Running seed again should do nothing because store.isSeeded() is true
    await seedService.seed();

    expect((await authorRepo.findAll()).length).toBe(authorsBefore);
    expect((await bookRepo.findAll()).length).toBe(booksBefore);
  });

  it('Requirement 14: Missing dates and null amounts in books are preserved without fabrication', async () => {
    // BK013: "Midnight in Mysore" (Sneha Kulkarni) is in production
    const bk13 = await bookRepo.findById('BK013');
    expect(bk13).toBeDefined();
    expect(bk13?.publication_date).toBeNull();
    expect(bk13?.mrp).toBeNull();
    expect(bk13?.author_royalty_per_copy).toBeNull();
    expect(bk13?.total_copies_sold).toBe(0);
    expect(bk13?.total_royalty_earned).toBe(0);
    expect(bk13?.last_royalty_payout_date).toBeNull();
    expect(bk13?.status).toBe('In Production - Cover Design');

    // BK005: Ananya Reddy - royalty_paid is 0 and last_royalty_payout_date is null
    const bk05 = await bookRepo.findById('BK005');
    expect(bk05).toBeDefined();
    expect(bk05?.royalty_paid).toBe(0);
    expect(bk05?.royalty_pending).toBe(2546);
    expect(bk05?.last_royalty_payout_date).toBeNull();
  });

  it('Requirement 15: The local data store persists changes and reloads safely', async () => {
    const nextNum = await ticketRepo.getNextTicketNumber();
    expect(nextNum).toBeGreaterThan(0);
    await store.persist();

    // Verify dev-store.json file exists on disk
    const storePath = store.getStorePath();
    expect(fs.existsSync(storePath)).toBe(true);
    const diskContent = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    expect(diskContent.authors.length).toBe(10);
    expect(diskContent.books.length).toBe(18);
  });
});
