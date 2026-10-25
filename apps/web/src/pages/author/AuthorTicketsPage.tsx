import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import type { Ticket, TicketStatus, TicketCategory } from '@bookleaf/shared';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge, PriorityBadge, CategoryBadge } from '@/components/common/StatusBadge';
import {
  Ticket as TicketIcon,
  PlusCircle,
  Search,
  Filter,
  Calendar,
  ChevronRight,
} from 'lucide-react';

export function AuthorTicketsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data: tickets, isLoading, error } = useQuery<Ticket[]>({
    queryKey: ['author', 'tickets'],
    queryFn: () => apiRequest<Ticket[]>('/author/tickets'),
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading your support tickets..." />;
  }

  if (error || !tickets) {
    return (
      <EmptyState
        title="Could not load tickets"
        description="There was an error fetching your tickets. Please try again."
      />
    );
  }

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.reference.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter !== 'ALL' && t.status !== statusFilter) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">
            My Support Queries ({tickets.length})
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track communication and resolutions for your publishing, distribution, and royalty inquiries.
          </p>
        </div>

        <Link to="/author/tickets/new" className="btn-primary self-start sm:self-auto text-xs sm:text-sm">
          <PlusCircle className="w-4 h-4 mr-2" />
          Submit New Query
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border-gray-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by reference or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 py-1.5 text-xs w-full"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field text-xs py-1.5 px-2 bg-slate-50 w-full sm:w-auto"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Ticket List */}
      {filteredTickets.length === 0 ? (
        <EmptyState
          title="No support tickets found"
          description={
            search || statusFilter !== 'ALL'
              ? 'No tickets match your filter criteria.'
              : 'You have not submitted any queries yet.'
          }
          icon={TicketIcon}
          action={{
            label: 'Submit a Query',
            onClick: () => (window.location.href = '/author/tickets/new'),
          }}
        />
      ) : (
        <div className="card divide-y divide-gray-100 overflow-hidden border-gray-200">
          {filteredTickets.map((ticket) => (
            <Link
              key={ticket.id}
              to={`/author/tickets/${ticket.id}`}
              className="p-5 block hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-navy-800 bg-navy-50 px-2 py-0.5 rounded border border-navy-100">
                      {ticket.reference}
                    </span>
                    <CategoryBadge category={ticket.final_category} />
                    <PriorityBadge priority={ticket.final_priority} />
                  </div>

                  <h3 className="text-base font-semibold text-gray-900 truncate">
                    {ticket.subject}
                  </h3>

                  <p className="text-xs text-gray-500 line-clamp-1">
                    {ticket.description}
                  </p>

                  <div className="flex items-center space-x-4 text-xs text-gray-400 pt-1">
                    <span className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1" />
                      Created {new Date(ticket.created_at).toLocaleString()}
                    </span>
                    {ticket.book_id && (
                      <span className="text-navy-600 font-medium">
                        Book: {ticket.book_id}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <StatusBadge status={ticket.status} />
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
