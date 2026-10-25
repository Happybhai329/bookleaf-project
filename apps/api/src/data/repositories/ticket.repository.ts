import { Injectable, Optional } from '@nestjs/common';
import { JsonDataStore } from '../json-data-store';
import { PrismaService } from '../prisma.service';
import type { Ticket, TicketFilters } from '@bookleaf/shared';
import { TicketCategory, TicketPriority, TicketStatus } from '@bookleaf/shared';

function toTicket(t: any): Ticket {
  return {
    id: t.id,
    reference: t.reference,
    author_id: t.author_id,
    book_id: t.book_id,
    subject: t.subject,
    description: t.description,
    status: t.status as TicketStatus,
    ai_classification: t.suggested_category
      ? {
          suggested_category: t.suggested_category as TicketCategory,
          suggested_priority: t.suggested_priority as TicketPriority,
          reasoning: t.ai_reasoning || '',
          provider: t.ai_provider || 'gemini',
          classified_at: t.ai_classified_at
            ? t.ai_classified_at.toISOString()
            : t.created_at.toISOString(),
          confidence: (t.ai_confidence as any) || 'medium',
        }
      : null,
    final_category: t.final_category as TicketCategory,
    final_priority: t.final_priority as TicketPriority,
    assigned_admin_id: t.assigned_admin_id,
    assigned_admin_name: t.assigned_admin_name,
    created_at: t.created_at.toISOString(),
    updated_at: t.updated_at.toISOString(),
  };
}

@Injectable()
export class TicketRepository {
  constructor(
    private readonly store: JsonDataStore,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  private get usePostgres(): boolean {
    return process.env.DATA_PROVIDER !== 'json' && !!this.prisma;
  }

  async findAll(): Promise<Ticket[]> {
    if (this.usePostgres && this.prisma) {
      const records = await this.prisma.ticket.findMany({
        orderBy: { created_at: 'desc' },
      });
      return records.map(toTicket);
    }
    return this.store.getData().tickets;
  }

  async findById(id: string): Promise<Ticket | undefined> {
    if (this.usePostgres && this.prisma) {
      const record = await this.prisma.ticket.findUnique({ where: { id } });
      return record ? toTicket(record) : undefined;
    }
    return this.store.getData().tickets.find((t) => t.id === id);
  }

  async findByReference(reference: string): Promise<Ticket | undefined> {
    if (this.usePostgres && this.prisma) {
      const record = await this.prisma.ticket.findUnique({ where: { reference } });
      return record ? toTicket(record) : undefined;
    }
    return this.store.getData().tickets.find((t) => t.reference === reference);
  }

  async findByAuthorId(authorId: string): Promise<Ticket[]> {
    if (this.usePostgres && this.prisma) {
      const records = await this.prisma.ticket.findMany({
        where: { author_id: authorId },
        orderBy: { created_at: 'desc' },
      });
      return records.map(toTicket);
    }
    return this.store
      .getData()
      .tickets.filter((t) => t.author_id === authorId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }

  async findFiltered(
    filters: TicketFilters,
  ): Promise<{ data: Ticket[]; total: number }> {
    if (this.usePostgres && this.prisma) {
      const where: any = {};
      if (filters.status) where.status = filters.status;
      if (filters.category) where.final_category = filters.category;
      if (filters.priority) where.final_priority = filters.priority;
      if (filters.assigned_admin_id !== undefined) {
        if (filters.assigned_admin_id === null || filters.assigned_admin_id === '') {
          where.assigned_admin_id = null;
        } else {
          where.assigned_admin_id = filters.assigned_admin_id;
        }
      }
      if (filters.search) {
        where.OR = [
          { subject: { contains: filters.search, mode: 'insensitive' } },
          { reference: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }
      if (filters.date_from) {
        where.created_at = { ...where.created_at, gte: new Date(filters.date_from) };
      }
      if (filters.date_to) {
        where.created_at = {
          ...where.created_at,
          lte: new Date(filters.date_to + 'T23:59:59.999Z'),
        };
      }

      const allMatching = await this.prisma.ticket.findMany({ where });
      const tickets = allMatching.map(toTicket);

      // Custom prioritization sort:
      // Status: Unresolved (OPEN, IN_PROGRESS) before (RESOLVED, CLOSED)
      // Severity: CRITICAL > HIGH > MEDIUM > LOW
      // Wait time: Oldest first within same severity
      const priorityOrder: Record<string, number> = {
        CRITICAL: 0,
        HIGH: 1,
        MEDIUM: 2,
        LOW: 3,
      };
      const statusOrder: Record<string, number> = {
        OPEN: 0,
        IN_PROGRESS: 1,
        RESOLVED: 2,
        CLOSED: 3,
      };

      tickets.sort((a, b) => {
        const sA = statusOrder[a.status] ?? 4;
        const sB = statusOrder[b.status] ?? 4;
        if (sA !== sB) return sA - sB;

        const pA = priorityOrder[a.final_priority] ?? 4;
        const pB = priorityOrder[b.final_priority] ?? 4;
        if (pA !== pB) return pA - pB;

        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      const total = tickets.length;
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const data = tickets.slice((page - 1) * limit, page * limit);
      return { data, total };
    }

    let results = [...this.store.getData().tickets];
    if (filters.status) results = results.filter((t) => t.status === filters.status);
    if (filters.category) results = results.filter((t) => t.final_category === filters.category);
    if (filters.priority) results = results.filter((t) => t.final_priority === filters.priority);
    if (filters.assigned_admin_id !== undefined) {
      if (filters.assigned_admin_id === null || filters.assigned_admin_id === '') {
        results = results.filter((t) => !t.assigned_admin_id);
      } else {
        results = results.filter((t) => t.assigned_admin_id === filters.assigned_admin_id);
      }
    }
    if (filters.search) {
      const term = filters.search.toLowerCase();
      results = results.filter(
        (t) =>
          t.subject.toLowerCase().includes(term) ||
          t.reference.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term),
      );
    }
    if (filters.date_from) results = results.filter((t) => t.created_at >= filters.date_from!);
    if (filters.date_to) results = results.filter((t) => t.created_at <= filters.date_to + 'T23:59:59.999Z');

    const priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const statusOrder: Record<string, number> = { OPEN: 0, IN_PROGRESS: 1, RESOLVED: 2, CLOSED: 3 };
    results.sort((a, b) => {
      const sA = statusOrder[a.status] ?? 4;
      const sB = statusOrder[b.status] ?? 4;
      if (sA !== sB) return sA - sB;
      const pA = priorityOrder[a.final_priority] ?? 4;
      const pB = priorityOrder[b.final_priority] ?? 4;
      if (pA !== pB) return pA - pB;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    const total = results.length;
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const data = results.slice((page - 1) * limit, page * limit);
    return { data, total };
  }

  async create(ticket: Ticket): Promise<Ticket> {
    if (this.usePostgres && this.prisma) {
      const record = await this.prisma.ticket.create({
        data: {
          id: ticket.id,
          reference: ticket.reference,
          author_id: ticket.author_id,
          book_id: ticket.book_id,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          final_category: ticket.final_category,
          final_priority: ticket.final_priority,
          suggested_category: ticket.ai_classification?.suggested_category || null,
          suggested_priority: ticket.ai_classification?.suggested_priority || null,
          ai_reasoning: ticket.ai_classification?.reasoning || null,
          ai_provider: ticket.ai_classification?.provider || null,
          ai_confidence: ticket.ai_classification?.confidence || null,
          ai_classified_at: ticket.ai_classification?.classified_at
            ? new Date(ticket.ai_classification.classified_at)
            : null,
          assigned_admin_id: ticket.assigned_admin_id,
          assigned_admin_name: ticket.assigned_admin_name,
          created_at: ticket.created_at ? new Date(ticket.created_at) : undefined,
          updated_at: ticket.updated_at ? new Date(ticket.updated_at) : undefined,
        },
      });
      return toTicket(record);
    }
    this.store.getData().tickets.push(ticket);
    await this.store.persist();
    return ticket;
  }

  async update(
    id: string,
    updates: Partial<Ticket>,
  ): Promise<Ticket | undefined> {
    if (this.usePostgres && this.prisma) {
      const data: any = { ...updates };
      delete data.id;
      delete data.ai_classification;
      if (updates.ai_classification) {
        data.suggested_category = updates.ai_classification.suggested_category;
        data.suggested_priority = updates.ai_classification.suggested_priority;
        data.ai_reasoning = updates.ai_classification.reasoning;
        data.ai_provider = updates.ai_classification.provider;
        data.ai_confidence = updates.ai_classification.confidence;
        data.ai_classified_at = updates.ai_classification.classified_at
          ? new Date(updates.ai_classification.classified_at)
          : null;
      }
      if (data.created_at) data.created_at = new Date(data.created_at);
      data.updated_at = new Date();

      const record = await this.prisma.ticket.update({
        where: { id },
        data,
      });
      return toTicket(record);
    }

    const tickets = this.store.getData().tickets;
    const idx = tickets.findIndex((t) => t.id === id);
    if (idx === -1) return undefined;
    tickets[idx] = { ...tickets[idx], ...updates, updated_at: new Date().toISOString() };
    await this.store.persist();
    return tickets[idx];
  }

  async getNextTicketNumber(): Promise<number> {
    if (this.usePostgres && this.prisma) {
      const count = await this.prisma.ticket.count();
      return count + 1;
    }
    return this.store.getNextTicketNumber();
  }

  async countByStatus(status: TicketStatus): Promise<number> {
    if (this.usePostgres && this.prisma) {
      return this.prisma.ticket.count({ where: { status } });
    }
    return this.store.getData().tickets.filter((t) => t.status === status).length;
  }

  async countUnresolvedByPriority(priority: TicketPriority): Promise<number> {
    if (this.usePostgres && this.prisma) {
      return this.prisma.ticket.count({
        where: {
          final_priority: priority,
          status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
        },
      });
    }
    return this.store.getData().tickets.filter(
      (t) =>
        t.final_priority === priority &&
        t.status !== 'RESOLVED' &&
        t.status !== 'CLOSED',
    ).length;
  }

  async countUnassigned(): Promise<number> {
    if (this.usePostgres && this.prisma) {
      return this.prisma.ticket.count({
        where: {
          assigned_admin_id: null,
          status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
        },
      });
    }
    return this.store.getData().tickets.filter(
      (t) =>
        !t.assigned_admin_id && t.status !== 'RESOLVED' && t.status !== 'CLOSED',
    ).length;
  }

  async count(): Promise<number> {
    if (this.usePostgres && this.prisma) {
      return this.prisma.ticket.count();
    }
    return this.store.getData().tickets.length;
  }
}
