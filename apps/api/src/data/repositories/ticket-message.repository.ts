import { Injectable, Optional } from '@nestjs/common';
import { JsonDataStore } from '../json-data-store';
import { PrismaService } from '../prisma.service';
import type { TicketMessage } from '@bookleaf/shared';
import { MessageVisibility, UserRole } from '@bookleaf/shared';

function toMessage(m: any): TicketMessage {
  return {
    id: m.id,
    ticket_id: m.ticket_id,
    sender_id: m.sender_id,
    sender_name: m.sender_name,
    sender_role: m.sender_role as UserRole,
    visibility: m.visibility as MessageVisibility,
    content: m.content,
    is_ai_draft: m.is_ai_draft,
    created_at: m.created_at.toISOString(),
  };
}

@Injectable()
export class TicketMessageRepository {
  constructor(
    private readonly store: JsonDataStore,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  private get usePostgres(): boolean {
    return process.env.DATA_PROVIDER !== 'json' && !!this.prisma;
  }

  async findByTicketId(
    ticketId: string,
    visibility?: MessageVisibility,
  ): Promise<TicketMessage[]> {
    if (this.usePostgres && this.prisma) {
      const where: any = { ticket_id: ticketId };
      if (visibility) {
        where.visibility = visibility;
      }
      const records = await this.prisma.ticketMessage.findMany({
        where,
        orderBy: { created_at: 'asc' },
      });
      return records.map(toMessage);
    }

    let messages = this.store
      .getData()
      .messages.filter((m) => m.ticket_id === ticketId);
    if (visibility) {
      messages = messages.filter((m) => m.visibility === visibility);
    }
    return messages.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }

  async findPublicByTicketId(ticketId: string): Promise<TicketMessage[]> {
    return this.findByTicketId(ticketId, MessageVisibility.PUBLIC);
  }

  async create(message: TicketMessage): Promise<TicketMessage> {
    if (this.usePostgres && this.prisma) {
      const record = await this.prisma.ticketMessage.create({
        data: {
          id: message.id,
          ticket_id: message.ticket_id,
          sender_id: message.sender_id,
          sender_name: message.sender_name,
          sender_role: message.sender_role,
          visibility: message.visibility,
          content: message.content,
          is_ai_draft: message.is_ai_draft,
          created_at: message.created_at ? new Date(message.created_at) : undefined,
        },
      });
      return toMessage(record);
    }
    this.store.getData().messages.push(message);
    await this.store.persist();
    return message;
  }

  async createMany(messages: TicketMessage[]): Promise<void> {
    if (this.usePostgres && this.prisma) {
      for (const message of messages) {
        await this.prisma.ticketMessage.create({
          data: {
            id: message.id,
            ticket_id: message.ticket_id,
            sender_id: message.sender_id,
            sender_name: message.sender_name,
            sender_role: message.sender_role,
            visibility: message.visibility,
            content: message.content,
            is_ai_draft: message.is_ai_draft,
            created_at: message.created_at ? new Date(message.created_at) : undefined,
          },
        });
      }
      return;
    }
    this.store.getData().messages.push(...messages);
    await this.store.persist();
  }
}
