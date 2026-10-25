import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { BookStatusBadge } from '@/components/common/StatusBadge';
import {
  BookOpen,
  Search,
  Printer,
  Globe,
  IndianRupee,
  ShoppingBag,
  Layers,
  Filter,
} from 'lucide-react';

interface MasterBook {
  book_id: string;
  author_id: string;
  author_name: string;
  author_email: string;
  title: string;
  isbn: string;
  genre: string;
  status: string;
  mrp: number | null;
  author_royalty_per_copy: number | null;
  total_copies_sold: number;
  total_royalty_earned: number;
  royalty_pending: number;
  print_partner: string | null;
  available_on: string[];
}

export function AdminBooksPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'PRODUCTION'>('ALL');

  const { data: books, isLoading, error } = useQuery<MasterBook[]>({
    queryKey: ['admin', 'books'],
    queryFn: () => apiRequest<MasterBook[]>('/admin/books'),
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading master book catalog..." />;
  }

  if (error || !books) {
    return (
      <EmptyState
        title="Could not load books"
        description="Failed to fetch master catalog records."
      />
    );
  }

  const filteredBooks = books.filter((b) => {
    const q = search.toLowerCase();
    const matchesSearch =
      b.title.toLowerCase().includes(q) ||
      b.isbn.toLowerCase().includes(q) ||
      b.genre.toLowerCase().includes(q) ||
      b.author_name.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === 'LIVE') return b.status === 'Published & Live';
    if (statusFilter === 'PRODUCTION') return b.status !== 'Published & Live';
    return true;
  });

  const totalTitles = books.length;
  const liveTitles = books.filter((b) => b.status === 'Published & Live').length;
  const inProdTitles = totalTitles - liveTitles;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950 flex items-center">
            <BookOpen className="w-6 h-6 mr-2 text-navy-700" />
            Master Book Catalog ({totalTitles})
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete publishing database across all BookLeaf author contracts and print runs.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search title, ISBN, author, genre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 py-1.5 text-xs w-64"
            />
          </div>

          {/* Status selector */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-navy-900 text-white font-semibold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({totalTitles})
            </button>
            <button
              onClick={() => setStatusFilter('LIVE')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === 'LIVE'
                  ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Live ({liveTitles})
            </button>
            <button
              onClick={() => setStatusFilter('PRODUCTION')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === 'PRODUCTION'
                  ? 'bg-amber-600 text-white font-semibold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              In Production ({inProdTitles})
            </button>
          </div>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="card overflow-hidden border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Title & ISBN</th>
                <th className="py-3 px-4">Author</th>
                <th className="py-3 px-4">Genre</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">MRP</th>
                <th className="py-3 px-4 text-right">Copies Sold</th>
                <th className="py-3 px-4">Print Partner</th>
                <th className="py-3 px-4">Channels</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBooks.map((b) => (
                <tr key={b.book_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-gray-900 text-sm">{b.title}</div>
                    <div className="font-mono text-[11px] text-gray-400">{b.isbn}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-gray-800">{b.author_name}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{b.author_id}</div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{b.genre}</td>
                  <td className="py-3 px-4">
                    <BookStatusBadge status={b.status} />
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-gray-800">
                    {b.mrp ? `₹${b.mrp}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-700">
                    {b.total_copies_sold ? b.total_copies_sold.toLocaleString('en-IN') : '0'}
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-[11px]">
                    {b.print_partner || 'Pending allocation'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {b.available_on && b.available_on.length > 0 ? (
                        b.available_on.map((channel) => (
                          <span
                            key={channel}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {channel}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-400">None</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
