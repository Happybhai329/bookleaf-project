import { Injectable, Optional } from '@nestjs/common';
import { JsonDataStore } from '../json-data-store';
import { PrismaService } from '../prisma.service';
import type { AuditEntry } from '@bookleaf/shared';
import { v4 as uuidv4 } from 'uuid';

function toAudit(a: any): AuditEntry {
  return {
    id: a.id,
    ticket_id: a.ticket_id,
    user_id: a.user_id,
    user_name: a.user_name,
    action: a.action,
    details: a.details as Record<string, unknown>,
    created_at: a.created_at.toISOString(),
  };
}

@Injectable()
export class AuditRepository {
  constructor(
    private readonly store: JsonDataStore,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  private get usePostgres(): boolean {
    return process.env.DATA_PROVIDER !== 'json' && !!this.prisma;
  }

  async findByTicketId(ticketId: string): Promise<AuditEntry[]> {
    if (this.usePostgres && this.prisma) {
      const records = await this.prisma.auditLog.findMany({
        where: { ticket_id: ticketId },
        orderBy: { created_at: 'asc' },
      });
      return records.map(toAudit);
    }

    return this.store
      .getData()
      .audit.filter((a) => a.ticket_id === ticketId)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
  }

  async create(
    ticketId: string,
    userId: string,
    userName: string,
    action: string,
    details: Record<string, unknown> = {},
  ): Promise<AuditEntry> {
    const id = uuidv4();
    const now = new Date();

    if (this.usePostgres && this.prisma) {
      const record = await this.prisma.auditLog.create({
        data: {
          id,
          ticket_id: ticketId,
          user_id: userId,
          user_name: userName,
          action,
          details: details as any,
          created_at: now,
        },
      });
      return toAudit(record);
    }

    const entry: AuditEntry = {
      id,
      ticket_id: ticketId,
      user_id: userId,
      user_name: userName,
      action,
      details,
      created_at: now.toISOString(),
    };
    this.store.getData().audit.push(entry);
    await this.store.persist();
    return entry;
  }
}
