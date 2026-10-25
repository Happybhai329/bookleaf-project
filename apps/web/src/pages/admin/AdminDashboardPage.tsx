import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import type { AdminDashboard, TicketCategory } from '@bookleaf/shared';
import { CATEGORY_LABELS } from '@bookleaf/shared';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBadge, PriorityBadge, CategoryBadge } from '@/components/common/StatusBadge';
import {
  Inbox,
  AlertTriangle,
  Clock,
  CheckCircle2,
  UserX,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export function AdminDashboardPage() {
  const { data, isLoading, error, refetch } = useQuery<AdminDashboard>({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => apiRequest<AdminDashboard>('/admin/dashboard'),
    refetchInterval: 10000,
  });

  if (isLoading) {
    return <LoadingSpinner message="Calculating operational metrics..." />;
  }

  if (error || !data) {
    return (
      <div className="card p-8 text-center border-red-200 bg-red-50/50">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Dashboard</h3>
        <p className="text-sm text-red-700 mb-4">Could not retrieve queue metrics.</p>
        <button onClick={() => refetch()} className="btn-secondary text-sm">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">
            Operations & Ticket Queue Overview
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time status of author inquiries, priority escalations, and SLA health.
          </p>
        </div>

        <Link to="/admin/tickets" className="btn-primary self-start sm:self-auto text-xs sm:text-sm">
          <Inbox className="w-4 h-4 mr-2" />
          Open Global Ticket Queue
        </Link>
      </div>

      {/* Urgent Attention Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Critical Unresolved */}
        <div className={`card p-5 ${data.critical_unresolved > 0 ? 'bg-red-50 border-red-200' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-800 uppercase tracking-wide">
              Critical Unresolved
            </span>
            <AlertTriangle className={`w-4 h-4 ${data.critical_unresolved > 0 ? 'text-red-600' : 'text-gray-400'}`} />
          </div>
          <div className="mt-3">
            <span className={`text-3xl font-extrabold ${data.critical_unresolved > 0 ? 'text-red-700' : 'text-gray-900'}`}>
              {data.critical_unresolved}
            </span>
            <p className="text-xs text-gray-500 mt-1">Requires immediate human investigation</p>
          </div>
        </div>

        {/* High Priority Unresolved */}
        <div className={`card p-5 ${data.high_unresolved > 0 ? 'bg-orange-50 border-orange-200' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-800 uppercase tracking-wide">
              High Priority Unresolved
            </span>
            <AlertTriangle className={`w-4 h-4 ${data.high_unresolved > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
          </div>
          <div className="mt-3">
            <span className={`text-3xl font-extrabold ${data.high_unresolved > 0 ? 'text-orange-700' : 'text-gray-900'}`}>
              {data.high_unresolved}
            </span>
            <p className="text-xs text-gray-500 mt-1">Overdue royalties or ISBN discrepancies</p>
          </div>
        </div>

        {/* Unassigned Tickets */}
        <div className={`card p-5 ${data.unassigned_tickets > 0 ? 'bg-amber-50 border-amber-200' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
              Unassigned Unresolved
            </span>
            <UserX className={`w-4 h-4 ${data.unassigned_tickets > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
          </div>
          <div className="mt-3">
            <span className={`text-3xl font-extrabold ${data.unassigned_tickets > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
              {data.unassigned_tickets}
            </span>
            <p className="text-xs text-gray-500 mt-1">Awaiting admin handler assignment</p>
          </div>
        </div>
      </div>

      {/* Ticket Volume Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <span className="text-xs text-gray-500 font-medium">Total Tickets</span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data.total_tickets}</p>
        </div>

        <div className="card p-4">
          <span className="text-xs text-amber-700 font-medium">Open Status</span>
          <p className="text-2xl font-bold text-amber-800 mt-1">{data.open_tickets}</p>
        </div>

        <div className="card p-4">
          <span className="text-xs text-blue-700 font-medium">In Progress</span>
          <p className="text-2xl font-bold text-blue-800 mt-1">{data.in_progress_tickets}</p>
        </div>

        <div className="card p-4">
          <span className="text-xs text-emerald-700 font-medium">Resolved / Closed</span>
          <p className="text-2xl font-bold text-emerald-800 mt-1">
            {data.resolved_tickets + data.closed_tickets}
          </p>
        </div>
      </div>

      {/* Two Column Grid: Categories Breakdown & Oldest Unresolved */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Distribution */}
        <div className="card p-6 border-gray-200">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900 flex items-center">
              <Layers className="w-4 h-4 mr-2 text-navy-600" />
              Tickets by Policy Category
            </h2>
            <span className="text-xs text-gray-400">Total: {data.total_tickets}</span>
          </div>

          <div className="space-y-3.5">
            {Object.entries(data.tickets_by_category).map(([category, count]) => {
              const label = CATEGORY_LABELS[category as TicketCategory] || category;
              const percent = data.total_tickets > 0 ? Math.round((count / data.total_tickets) * 100) : 0;

              return (
                <div key={category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-gray-700">{label}</span>
                    <span className="text-navy-900 font-bold">
                      {count} <span className="text-gray-400 font-normal">({percent}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-navy-700 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Oldest Unresolved Tickets */}
        <div className="card p-6 border-gray-200">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-navy-600" />
              Oldest Unresolved Tickets
            </h2>
            <Link to="/admin/tickets" className="text-xs font-semibold text-navy-600 hover:text-navy-800 flex items-center">
              View Queue <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>

          {data.oldest_unresolved.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              All tickets are resolved or closed!
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.oldest_unresolved.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/admin/tickets/${ticket.id}`}
                  className="py-3 block hover:bg-slate-50 rounded-lg p-2 transition-colors -mx-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-navy-800 bg-navy-50 px-2 py-0.5 rounded">
                          {ticket.reference}
                        </span>
                        <PriorityBadge priority={ticket.final_priority} />
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 mt-1">{ticket.subject}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Author ID: {ticket.author_id} • Age:{' '}
                        {Math.floor(
                          (Date.now() - new Date(ticket.created_at).getTime()) /
                            (1000 * 60 * 60 * 24),
                        )}{' '}
                        days
                      </p>
                    </div>
                    <div className="ml-3 shrink-0">
                      <StatusBadge status={ticket.status} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
