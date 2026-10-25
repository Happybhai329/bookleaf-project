import { Module, Global, OnModuleInit } from '@nestjs/common';
import { JsonDataStore } from './json-data-store';
import { PrismaService } from './prisma.service';
import { UserRepository } from './repositories/user.repository';
import { AuthorRepository } from './repositories/author.repository';
import { BookRepository } from './repositories/book.repository';
import { TicketRepository } from './repositories/ticket.repository';
import { TicketMessageRepository } from './repositories/ticket-message.repository';
import { AuditRepository } from './repositories/audit.repository';
import { SeedService } from './seed.service';

@Global()
@Module({
  providers: [
    PrismaService,
    JsonDataStore,
    UserRepository,
    AuthorRepository,
    BookRepository,
    TicketRepository,
    TicketMessageRepository,
    AuditRepository,
    SeedService,
  ],
  exports: [
    PrismaService,
    UserRepository,
    AuthorRepository,
    BookRepository,
    TicketRepository,
    TicketMessageRepository,
    AuditRepository,
  ],
})
export class DataModule implements OnModuleInit {
  constructor(private readonly seedService: SeedService) {}

  async onModuleInit() {
    await this.seedService.seed();
  }
}
