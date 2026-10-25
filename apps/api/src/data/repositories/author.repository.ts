import { Injectable, Optional } from '@nestjs/common';
import { JsonDataStore } from '../json-data-store';
import { PrismaService } from '../prisma.service';
import type { Author } from '@bookleaf/shared';

@Injectable()
export class AuthorRepository {
  constructor(
    private readonly store: JsonDataStore,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  private get usePostgres(): boolean {
    return process.env.DATA_PROVIDER !== 'json' && !!this.prisma;
  }

  async findAll(): Promise<Author[]> {
    if (this.usePostgres && this.prisma) {
      const records = await this.prisma.author.findMany({
        orderBy: { author_id: 'asc' },
      });
      return records.map((a) => ({
        author_id: a.author_id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        city: a.city,
        joined_date: a.joined_date,
      }));
    }
    return this.store.getData().authors;
  }

  async findById(authorId: string): Promise<Author | undefined> {
    if (this.usePostgres && this.prisma) {
      const record = await this.prisma.author.findUnique({
        where: { author_id: authorId },
      });
      if (!record) return undefined;
      return {
        author_id: record.author_id,
        name: record.name,
        email: record.email,
        phone: record.phone,
        city: record.city,
        joined_date: record.joined_date,
      };
    }
    return this.store.getData().authors.find((a) => a.author_id === authorId);
  }

  async findByEmail(email: string): Promise<Author | undefined> {
    if (this.usePostgres && this.prisma) {
      const record = await this.prisma.author.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
      });
      if (!record) return undefined;
      return {
        author_id: record.author_id,
        name: record.name,
        email: record.email,
        phone: record.phone,
        city: record.city,
        joined_date: record.joined_date,
      };
    }
    return this.store.getData().authors.find(
      (a) => a.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async createMany(authors: Author[]): Promise<void> {
    if (this.usePostgres && this.prisma) {
      for (const author of authors) {
        await this.prisma.author.upsert({
          where: { author_id: author.author_id },
          update: {
            name: author.name,
            email: author.email,
            phone: author.phone,
            city: author.city,
            joined_date: author.joined_date,
          },
          create: {
            author_id: author.author_id,
            name: author.name,
            email: author.email,
            phone: author.phone,
            city: author.city,
            joined_date: author.joined_date,
          },
        });
      }
      return;
    }
    this.store.getData().authors.push(...authors);
    await this.store.persist();
  }

  async create(author: Author): Promise<Author> {
    if (this.usePostgres && this.prisma) {
      const record = await this.prisma.author.create({
        data: {
          author_id: author.author_id,
          name: author.name,
          email: author.email,
          phone: author.phone,
          city: author.city,
          joined_date: author.joined_date,
        },
      });
      return {
        author_id: record.author_id,
        name: record.name,
        email: record.email,
        phone: record.phone,
        city: record.city,
        joined_date: record.joined_date,
      };
    }
    this.store.getData().authors.push(author);
    await this.store.persist();
    return author;
  }

  async count(): Promise<number> {
    if (this.usePostgres && this.prisma) {
      return this.prisma.author.count();
    }
    return this.store.getData().authors.length;
  }
}
