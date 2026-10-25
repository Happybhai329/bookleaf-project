import { Injectable, Optional } from '@nestjs/common';
import { JsonDataStore } from '../json-data-store';
import { PrismaService } from '../prisma.service';
import type { Book } from '@bookleaf/shared';

function toBook(b: any): Book {
  return {
    book_id: b.book_id,
    author_id: b.author_id,
    title: b.title,
    isbn: b.isbn,
    genre: b.genre,
    publication_date: b.publication_date,
    status: b.status,
    mrp: b.mrp !== null && b.mrp !== undefined ? Number(b.mrp) : null,
    author_royalty_per_copy:
      b.author_royalty_per_copy !== null && b.author_royalty_per_copy !== undefined
        ? Number(b.author_royalty_per_copy)
        : null,
    total_copies_sold: b.total_copies_sold,
    total_royalty_earned: Number(b.total_royalty_earned),
    royalty_paid: Number(b.royalty_paid),
    royalty_pending: Number(b.royalty_pending),
    last_royalty_payout_date: b.last_royalty_payout_date,
    print_partner: b.print_partner,
    available_on: b.available_on || [],
  };
}

@Injectable()
export class BookRepository {
  constructor(
    private readonly store: JsonDataStore,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  private get usePostgres(): boolean {
    return process.env.DATA_PROVIDER !== 'json' && !!this.prisma;
  }

  async findAll(): Promise<Book[]> {
    if (this.usePostgres && this.prisma) {
      const records = await this.prisma.book.findMany({
        orderBy: { book_id: 'asc' },
      });
      return records.map(toBook);
    }
    return this.store.getData().books;
  }

  async findById(bookId: string): Promise<Book | undefined> {
    if (this.usePostgres && this.prisma) {
      const record = await this.prisma.book.findUnique({
        where: { book_id: bookId },
      });
      if (!record) return undefined;
      return toBook(record);
    }
    return this.store.getData().books.find((b) => b.book_id === bookId);
  }

  async findByAuthorId(authorId: string): Promise<Book[]> {
    if (this.usePostgres && this.prisma) {
      const records = await this.prisma.book.findMany({
        where: { author_id: authorId },
        orderBy: { title: 'asc' },
      });
      return records.map(toBook);
    }
    return this.store.getData().books.filter((b) => b.author_id === authorId);
  }

  async findByIsbn(isbn: string): Promise<Book | undefined> {
    if (this.usePostgres && this.prisma) {
      const record = await this.prisma.book.findFirst({
        where: { isbn },
      });
      if (!record) return undefined;
      return toBook(record);
    }
    return this.store.getData().books.find((b) => b.isbn === isbn);
  }

  async createMany(books: Book[]): Promise<void> {
    if (this.usePostgres && this.prisma) {
      for (const book of books) {
        await this.prisma.book.upsert({
          where: { book_id: book.book_id },
          update: {
            author_id: book.author_id,
            title: book.title,
            isbn: book.isbn,
            genre: book.genre,
            publication_date: book.publication_date,
            status: book.status,
            mrp: book.mrp !== null ? book.mrp : undefined,
            author_royalty_per_copy:
              book.author_royalty_per_copy !== null
                ? book.author_royalty_per_copy
                : undefined,
            total_copies_sold: book.total_copies_sold,
            total_royalty_earned: book.total_royalty_earned,
            royalty_paid: book.royalty_paid,
            royalty_pending: book.royalty_pending,
            last_royalty_payout_date: book.last_royalty_payout_date,
            print_partner: book.print_partner,
            available_on: book.available_on,
          },
          create: {
            book_id: book.book_id,
            author_id: book.author_id,
            title: book.title,
            isbn: book.isbn,
            genre: book.genre,
            publication_date: book.publication_date,
            status: book.status,
            mrp: book.mrp !== null ? book.mrp : undefined,
            author_royalty_per_copy:
              book.author_royalty_per_copy !== null
                ? book.author_royalty_per_copy
                : undefined,
            total_copies_sold: book.total_copies_sold,
            total_royalty_earned: book.total_royalty_earned,
            royalty_paid: book.royalty_paid,
            royalty_pending: book.royalty_pending,
            last_royalty_payout_date: book.last_royalty_payout_date,
            print_partner: book.print_partner,
            available_on: book.available_on,
          },
        });
      }
      return;
    }
    this.store.getData().books.push(...books);
    await this.store.persist();
  }

  async create(book: Book): Promise<Book> {
    if (this.usePostgres && this.prisma) {
      const record = await this.prisma.book.create({
        data: {
          book_id: book.book_id,
          author_id: book.author_id,
          title: book.title,
          isbn: book.isbn,
          genre: book.genre,
          publication_date: book.publication_date,
          status: book.status,
          mrp: book.mrp !== null ? book.mrp : undefined,
          author_royalty_per_copy:
            book.author_royalty_per_copy !== null
              ? book.author_royalty_per_copy
              : undefined,
          total_copies_sold: book.total_copies_sold || 0,
          total_royalty_earned: book.total_royalty_earned || 0,
          royalty_paid: book.royalty_paid || 0,
          royalty_pending: book.royalty_pending || 0,
          last_royalty_payout_date: book.last_royalty_payout_date,
          print_partner: book.print_partner,
          available_on: book.available_on || [],
        },
      });
      return toBook(record);
    }
    this.store.getData().books.push(book);
    await this.store.persist();
    return book;
  }

  async count(): Promise<number> {
    if (this.usePostgres && this.prisma) {
      return this.prisma.book.count();
    }
    return this.store.getData().books.length;
  }
}
