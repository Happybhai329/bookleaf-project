import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    if (process.env.DATA_PROVIDER !== 'json') {
      try {
        await this.$connect();
        this.logger.log('Connected to Supabase PostgreSQL database successfully');
      } catch (err: any) {
        this.logger.error('Failed to connect to PostgreSQL database:', err.message);
        throw err;
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from PostgreSQL database');
  }
}
