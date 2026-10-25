import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import type { AuthorDashboard } from '@bookleaf/shared';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBadge, PriorityBadge, CategoryBadge, BookStatusBadge } from '@/components/common/StatusBadge';
import {
  BookOpen,
  DollarSign,
  TrendingUp,
  Clock,
  PlusCircle,
  AlertCircle,
  ExternalLink,
  ShoppingBag,
} from 'lucide-react';

export function AuthorDashboardPage() {
  const { data, isLoading, error, refetch } = useQuery<AuthorDashboard>({
    queryKey: ['author', 'dashboard'],
    queryFn: () => apiRequest<AuthorDashboard>('/author/dashboard'),
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading your author dashboard..." />;
  }

  if (error || !data) {
    return (
      <div className="card p-8 text-center border-red-200 bg-red-50/50">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-red-900 mb-1">Failed to load dashboard</h3>
        <p className="text-sm text-red-700 mb-4">
          {(error as any)?.message || 'Could not retrieve author information'}
        </p>
        <button onClick={() => refetch()} className="btn-secondary text-sm">
          Try Again
        </button>
      </div>
    );
  }

  const { author } = data;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="card bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 text-white p-6 sm:p-8 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-navy-700 text-slate-200 mb-3 border border-navy-600">
            Author ID: {author.author_id} • Member since {author.joined_date}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {author.name}
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Track your book publications, monitored sales royalties, and get fast support from the BookLeaf team.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/author/tickets/new" className="btn-primary bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm">
              <PlusCircle className="w-4 h-4 mr-2" />
              Submit a Support Query
            </Link>
            <Link to="/author/books" className="btn-secondary bg-navy-800/80 text-white border-navy-700 hover:bg-navy-700 text-xs sm:text-sm">
              <BookOpen className="w-4 h-4 mr-2" />
              View My Books
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Books */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase">My Books</span>
            <BookOpen className="w-4 h-4 text-navy-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">{data.total_books}</span>
            <div className="text-xs text-gray-500 space-x-2">
              <span className="text-emerald-600 font-semibold">{data.published_books} Live</span>
              {data.in_production_books > 0 && (
                <span className="text-amber-600 font-semibold">{data.in_production_books} Prod</span>
              )}
            </div>
          </div>
        </div>

        {/* Total Copies Sold */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase">Copies Sold</span>
            <ShoppingBag className="w-4 h-4 text-navy-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">
              {data.total_copies_sold.toLocaleString('en-IN')}
            </span>
            <p className="text-xs text-gray-400 mt-1">Across all retail channels</p>
          </div>
        </div>

        {/* Total Royalties Earned */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase">Total Royalties</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">
              ₹{data.total_royalties_earned.toLocaleString('en-IN')}
            </span>
            <p className="text-xs text-emerald-600 mt-1">
              ₹{data.total_royalties_paid.toLocaleString('en-IN')} paid out to date
            </p>
          </div>
        </div>

        {/* Pending Royalties */}
        <div className={`card p-5 ${data.total_pending_royalties > 0 ? 'bg-amber-50/40 border-amber-200' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-800 uppercase">Pending Royalty</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-amber-900">
              ₹{data.total_pending_royalties.toLocaleString('en-IN')}
            </span>
            <p className="text-xs text-amber-700 mt-1">
              {data.total_pending_royalties >= 1000
                ? 'Eligible for next quarterly payout'
                : 'Rolls over (min threshold ₹1,000)'}
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Books & Recent Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Books */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900 flex items-center">
              <BookOpen className="w-4 h-4 mr-2 text-navy-600" />
              Books in Catalog
            </h2>
            <Link to="/author/books" className="text-xs font-semibold text-navy-600 hover:text-navy-800 flex items-center">
              View All ({data.total_books}) <ExternalLink className="w-3 h-3 ml-1" />
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {data.recent_books.map((book) => (
              <div key={book.book_id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{book.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    ISBN: {book.isbn} • {book.genre}
                  </p>
                  <div className="mt-2 flex items-center space-x-3 text-xs text-gray-600">
                    <span>Sold: <strong>{book.total_copies_sold}</strong></span>
                    <span>Earned: <strong>₹{book.total_royalty_earned.toLocaleString('en-IN')}</strong></span>
                    {book.royalty_pending > 0 && (
                      <span className="text-amber-700 font-semibold">Pending: ₹{book.royalty_pending.toLocaleString('en-IN')}</span>
                    )}
                  </div>
                </div>
                <div className="ml-4 shrink-0">
                  <BookStatusBadge status={book.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-navy-600" />
              Recent Support Queries
            </h2>
            <Link to="/author/tickets" className="text-xs font-semibold text-navy-600 hover:text-navy-800 flex items-center">
              View All <ExternalLink className="w-3 h-3 ml-1" />
            </Link>
          </div>

          {data.recent_tickets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 mb-3">You haven't submitted any support tickets yet.</p>
              <Link to="/author/tickets/new" className="btn-primary text-xs">
                Submit First Query
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.recent_tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/author/tickets/${ticket.id}`}
                  className="py-3.5 first:pt-0 last:pb-0 block hover:bg-slate-50 rounded-lg p-2 transition-colors -mx-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-semibold text-navy-700 bg-navy-50 px-2 py-0.5 rounded">
                          {ticket.reference}
                        </span>
                        <CategoryBadge category={ticket.final_category} />
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 mt-1">{ticket.subject}</h4>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(ticket.created_at).toLocaleDateString()}
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
