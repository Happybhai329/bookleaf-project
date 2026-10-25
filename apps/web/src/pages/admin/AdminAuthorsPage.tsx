import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import {
  Users,
  Search,
  BookOpen,
  ShoppingBag,
  IndianRupee,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Ticket,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface AuthorWithStats {
  author_id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  joined_date: string;
  books_count: number;
  live_books_count: number;
  total_copies_sold: number;
  total_royalty_earned: number;
  royalty_pending: number;
  open_tickets_count: number;
  books: any[];
}

export function AdminAuthorsPage() {
  const [search, setSearch] = useState('');

  const { data: authors, isLoading, error } = useQuery<AuthorWithStats[]>({
    queryKey: ['admin', 'authors'],
    queryFn: () => apiRequest<AuthorWithStats[]>('/admin/authors'),
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading authors directory..." />;
  }

  if (error || !authors) {
    return (
      <EmptyState
        title="Could not load authors"
        description="Failed to fetch author directory records."
      />
    );
  }

  const filteredAuthors = authors.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.author_id.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q)
    );
  });

  const totalAuthors = authors.length;
  const totalBooks = authors.reduce((sum, a) => sum + a.books_count, 0);
  const totalSales = authors.reduce((sum, a) => sum + a.total_copies_sold, 0);
  const totalPendingRoyalties = authors.reduce((sum, a) => sum + Number(a.royalty_pending), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950 flex items-center">
            <Users className="w-6 h-6 mr-2 text-navy-700" />
            Authors Directory ({totalAuthors})
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete records of all registered publishing authors, contract dates, and royalties.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search author, email, ID, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 py-1.5 text-xs w-72"
          />
        </div>
      </div>

      {/* Top Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <span className="text-xs font-semibold text-gray-500 uppercase">Active Authors</span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalAuthors}</p>
        </div>
        <div className="card p-4">
          <span className="text-xs font-semibold text-gray-500 uppercase">Total Catalog Titles</span>
          <p className="text-2xl font-bold text-navy-800 mt-1">{totalBooks}</p>
        </div>
        <div className="card p-4">
          <span className="text-xs font-semibold text-gray-500 uppercase">Total Copies Sold</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{totalSales.toLocaleString('en-IN')}</p>
        </div>
        <div className="card p-4">
          <span className="text-xs font-semibold text-gray-500 uppercase">Pending Royalties</span>
          <p className="text-2xl font-bold text-amber-700 mt-1">₹{totalPendingRoyalties.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Authors List Table */}
      <div className="card overflow-hidden border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Author</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-center">Titles</th>
                <th className="py-3 px-4 text-right">Copies Sold</th>
                <th className="py-3 px-4 text-right">Pending Royalty</th>
                <th className="py-3 px-4 text-center">Active Queries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAuthors.map((a) => (
                <tr key={a.author_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-gray-900 text-sm">{a.name}</div>
                    <div className="font-mono text-[10px] text-gray-400 font-semibold">{a.author_id}</div>
                  </td>
                  <td className="py-3.5 px-4 text-gray-600">
                    <div className="flex items-center text-xs">
                      <Mail className="w-3 h-3 mr-1 text-gray-400" />
                      {a.email}
                    </div>
                    <div className="flex items-center text-[11px] text-gray-400 mt-0.5">
                      <Phone className="w-3 h-3 mr-1 text-gray-400" />
                      {a.phone}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-gray-600">
                    <div className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                      {a.city}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      Since {a.joined_date}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="font-bold text-gray-900">{a.books_count}</span>
                    <span className="text-[10px] text-gray-400 block">({a.live_books_count} live)</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-gray-800">
                    {a.total_copies_sold.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className={`font-bold ${Number(a.royalty_pending) > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                      ₹{Number(a.royalty_pending).toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {a.open_tickets_count > 0 ? (
                      <Link
                        to={`/admin/tickets?search=${encodeURIComponent(a.name)}`}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200"
                      >
                        <Ticket className="w-3 h-3 mr-1" />
                        {a.open_tickets_count} Open
                      </Link>
                    ) : (
                      <span className="text-gray-400 text-[11px]">None</span>
                    )}
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
