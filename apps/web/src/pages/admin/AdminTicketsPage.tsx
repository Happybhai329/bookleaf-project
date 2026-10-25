import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from '@bookleaf/shared';
import type { PaginatedResponse } from '@bookleaf/shared';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge, PriorityBadge, CategoryBadge } from '@/components/common/StatusBadge';
import {
  Search,
  Filter,
  User,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';

export function AdminTicketsPage() {
  const { user } = useAuth();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [assignment, setAssignment] = useState<string>('');

  // Build query string
  const queryParams = new URLSearchParams();
  queryParams.set('page', page.toString());
  queryParams.set('limit', '15');
  if (search.trim()) queryParams.set('search', search.trim());
  if (status) queryParams.set('status', status);
  if (category) queryParams.set('category', category);
  if (priority) queryParams.set('priority', priority);
  if (assignment === 'unassigned') queryParams.set('assigned_admin_id', 'unassigned');
  if (assignment === 'mine' && user?.id) queryParams.set('assigned_admin_id', user.id);

  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<any>>({
    queryKey: ['admin', 'tickets', queryParams.toString()],
    queryFn: () => apiRequest<PaginatedResponse<any>>(`/admin/tickets?${queryParams.toString()}`),
    refetchInterval: 10000,
  });

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setCategory('');
    setPriority('');
    setAssignment('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">
            Global Ticket Queue
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Author support inquiries prioritized by severity (Critical &gt; High &gt; Medium &gt; Low) and wait time.
          </p>
        </div>

        {data && (
          <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200 self-start sm:self-auto">
            {data.total} Total Matching Tickets
          </span>
        )}
      </div>

      {/* Filter Bar */}
      <div className="card p-4 space-y-3 bg-white border-gray-200">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search reference, subject, or description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input-field pl-9 py-1.5 text-xs w-full"
            />
          </div>

          {/* Quick Clear */}
          {(search || status || category || priority || assignment) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1.5 shrink-0"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-gray-100">
          {/* Status */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="input-field text-xs py-1.5 bg-slate-50"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="input-field text-xs py-1.5 bg-slate-50"
            >
              <option value="">All Priorities</option>
              {Object.entries(PRIORITY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="input-field text-xs py-1.5 bg-slate-50"
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>

          {/* Assignment */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Assignment</label>
            <select
              value={assignment}
              onChange={(e) => {
                setAssignment(e.target.value);
                setPage(1);
              }}
              className="input-field text-xs py-1.5 bg-slate-50"
            >
              <option value="">All Tickets</option>
              <option value="unassigned">Unassigned Only</option>
              <option value="mine">Assigned to Me</option>
            </select>
          </div>
        </div>
      </div>

      {/* Queue Table */}
      {isLoading ? (
        <LoadingSpinner message="Loading queue records..." />
      ) : error || !data || data.data.length === 0 ? (
        <EmptyState
          title="No tickets found"
          description="There are no tickets matching your specified filter criteria."
          action={{
            label: 'Clear Filters',
            onClick: handleResetFilters,
          }}
        />
      ) : (
        <div className="card overflow-hidden border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Ref</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4">Subject & Book</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned</th>
                  <th className="py-3 px-4">Wait Time</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {data.data.map((ticket: any) => {
                  const isCritical = ticket.final_priority === TicketPriority.CRITICAL;
                  const isHigh = ticket.final_priority === TicketPriority.HIGH;

                  return (
                    <tr
                      key={ticket.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCritical ? 'bg-red-50/30' : isHigh ? 'bg-orange-50/20' : ''
                      }`}
                    >
                      {/* Ref */}
                      <td className="py-3.5 px-4 font-mono font-bold text-navy-800">
                        {ticket.reference}
                      </td>

                      {/* Author */}
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <p className="font-semibold text-gray-900">{ticket.author_name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{ticket.author_email}</p>
                      </td>

                      {/* Subject & Book */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <Link
                          to={`/admin/tickets/${ticket.id}`}
                          className="font-medium text-gray-900 hover:text-navy-700 block truncate"
                        >
                          {ticket.subject}
                        </Link>
                        {ticket.book_title && (
                          <p className="text-[11px] text-gray-500 truncate mt-0.5 flex items-center">
                            <BookOpen className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                            {ticket.book_title}
                          </p>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 shrink-0">
                        <CategoryBadge category={ticket.final_category} />
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 shrink-0">
                        <PriorityBadge priority={ticket.final_priority} />
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 shrink-0">
                        <StatusBadge status={ticket.status} />
                      </td>

                      {/* Assigned Admin */}
                      <td className="py-3.5 px-4 text-gray-600">
                        {ticket.assigned_admin_name ? (
                          <span className="inline-flex items-center text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            <UserCheck className="w-3 h-3 mr-1 text-emerald-600" />
                            {ticket.assigned_admin_name}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-700 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Wait Time / Age */}
                      <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/admin/tickets/${ticket.id}`}
                          className="btn-secondary py-1 px-2.5 text-xs font-semibold"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {data.total_pages > 1 && (
            <div className="p-4 bg-slate-50 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Page {data.page} of {data.total_pages}
              </span>
              <div className="flex space-x-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="btn-secondary py-1 px-2 text-xs"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </button>
                <button
                  disabled={page >= data.total_pages}
                  onClick={() => setPage(page + 1)}
                  className="btn-secondary py-1 px-2 text-xs"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
