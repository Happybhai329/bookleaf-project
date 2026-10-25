import { Injectable, Optional } from '@nestjs/common';
import { JsonDataStore } from '../json-data-store';
import { PrismaService } from '../prisma.service';
import type { User } from '@bookleaf/shared';
import { UserRole } from '@bookleaf/shared';

@Injectable()
export class UserRepository {
  constructor(
    private readonly store: JsonDataStore,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  private get usePostgres(): boolean {
    return process.env.DATA_PROVIDER !== 'json' && !!this.prisma;
  }

  async findAll(): Promise<User[]> {
    if (this.usePostgres && this.prisma) {
      const records = await this.prisma.user.findMany();
      return records.map((u) => ({
        id: u.id,
        email: u.email,
        password_hash: u.password_hash,
        role: u.role as UserRole,
        author_id: u.author_id,
        display_name: u.display_name,
        created_at: u.created_at.toISOString(),
      }));
    }
    return this.store.getData().users;
  }

  async findById(id: string): Promise<User | undefined> {
    if (this.usePostgres && this.prisma) {
      const record = await this.prisma.user.findUnique({ where: { id } });
      if (!record) return undefined;
      return {
        id: record.id,
        email: record.email,
        password_hash: record.password_hash,
        role: record.role as UserRole,
        author_id: record.author_id,
        display_name: record.display_name,
        created_at: record.created_at.toISOString(),
      };
    }
    return this.store.getData().users.find((u) => u.id === id);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    if (this.usePostgres && this.prisma) {
      const record = await this.prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
      });
      if (!record) return undefined;
      return {
        id: record.id,
        email: record.email,
        password_hash: record.password_hash,
        role: record.role as UserRole,
        author_id: record.author_id,
        display_name: record.display_name,
        created_at: record.created_at.toISOString(),
      };
    }
    return this.store.getData().users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async create(user: User): Promise<User> {
    if (this.usePostgres && this.prisma) {
      const record = await this.prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          password_hash: user.password_hash,
          role: user.role,
          author_id: user.author_id,
          display_name: user.display_name,
          created_at: user.created_at ? new Date(user.created_at) : undefined,
        },
      });
      return {
        id: record.id,
        email: record.email,
        password_hash: record.password_hash,
        role: record.role as UserRole,
        author_id: record.author_id,
        display_name: record.display_name,
        created_at: record.created_at.toISOString(),
      };
    }
    this.store.getData().users.push(user);
    await this.store.persist();
    return user;
  }

  async createMany(users: User[]): Promise<void> {
    if (this.usePostgres && this.prisma) {
      for (const user of users) {
        await this.prisma.user.upsert({
          where: { email: user.email },
          update: {
            password_hash: user.password_hash,
            display_name: user.display_name,
            role: user.role,
            author_id: user.author_id,
          },
          create: {
            id: user.id,
            email: user.email,
            password_hash: user.password_hash,
            role: user.role,
            author_id: user.author_id,
            display_name: user.display_name,
            created_at: user.created_at ? new Date(user.created_at) : undefined,
          },
        });
      }
      return;
    }
    this.store.getData().users.push(...users);
    await this.store.persist();
  }

  async exists(email: string): Promise<boolean> {
    if (this.usePostgres && this.prisma) {
      const count = await this.prisma.user.count({
        where: { email: { equals: email, mode: 'insensitive' } },
      });
      return count > 0;
    }
    return this.store
      .getData()
      .users.some((u) => u.email.toLowerCase() === email.toLowerCase());
  }
}
