import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { BookStatusBadge } from '@/components/common/StatusBadge';
import toast from 'react-hot-toast';
import {
  BookOpen,
  Search,
  Printer,
  Globe,
  IndianRupee,
  ShoppingBag,
  Layers,
  Filter,
  Edit3,
  X,
  CheckCircle2,
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

const PRODUCTION_STAGES = [
  'Manuscript Submitted',
  'Editing & Typesetting',
  'Cover Design & Proof Approval',
  'Author Proof Review',
  'ISBN Assignment',
  'Sample Proof Printing',
  'Distribution Propagation',
  'Published & Live',
];

const ALL_CHANNELS = [
  'Amazon India',
  'Flipkart',
  'BookLeaf Bookstore',
  'Amazon US',
  'Amazon UK',
  'IngramSpark',
];

const PRINT_PARTNERS = [
  { value: 'Repro Books India', label: 'Repro Books India (National On-Demand POD)' },
  { value: 'In-house Delhi facility', label: 'In-house Delhi facility (Direct Warehouse & Short Run)' },
  { value: 'Epitome Books', label: 'Epitome Books (Special Bindings / Hardcovers)' },
  { value: 'Ingram Content Group', label: 'Ingram Content Group (International Print & Distribution)' },
];

export function AdminBooksPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'PRODUCTION'>('ALL');

  // Edit Modal State
  const [editingBook, setEditingBook] = useState<MasterBook | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editMrp, setEditMrp] = useState<number>(0);
  const [editCopiesSold, setEditCopiesSold] = useState<number>(0);
  const [editPrintPartner, setEditPrintPartner] = useState('');
  const [editAvailableOn, setEditAvailableOn] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: books, isLoading, error, refetch } = useQuery<MasterBook[]>({
    queryKey: ['admin', 'books'],
    queryFn: () => apiRequest<MasterBook[]>('/admin/books'),
  });

  const handleOpenEdit = (b: MasterBook) => {
    setEditingBook(b);
    setEditStatus(b.status);
    setEditMrp(b.mrp || 399);
    setEditCopiesSold(b.total_copies_sold || 0);
    setEditPrintPartner(b.print_partner || 'Repro Books India');
    setEditAvailableOn(b.available_on && b.available_on.length > 0 ? [...b.available_on] : ['Amazon India', 'Flipkart', 'BookLeaf Bookstore']);
  };

  const handleToggleChannel = (channel: string) => {
    if (editAvailableOn.includes(channel)) {
      setEditAvailableOn(editAvailableOn.filter((c) => c !== channel));
    } else {
      setEditAvailableOn([...editAvailableOn, channel]);
    }
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;

    setSaving(true);
    try {
      await apiRequest(`/admin/books/${editingBook.book_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: editStatus,
          mrp: Number(editMrp),
          total_copies_sold: Number(editCopiesSold),
          print_partner: editPrintPartner,
          available_on: editAvailableOn,
        }),
      });
      toast.success(`Updated "${editingBook.title}" successfully!`);
      setEditingBook(null);
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update book');
    } finally {
      setSaving(false);
    }
  };

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
            Complete publishing database across all BookLeaf author contracts, production stages, distribution channels, and print runs.
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
                <th className="py-3 px-4">Status / Stage</th>
                <th className="py-3 px-4 text-right">MRP</th>
                <th className="py-3 px-4 text-right">Copies Sold</th>
                <th className="py-3 px-4">Print Partner</th>
                <th className="py-3 px-4">Channels</th>
                <th className="py-3 px-4 text-right">Action</th>
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
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(b)}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-navy-50 hover:text-navy-700 shadow-xs transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1" />
                      Edit Book
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Book Modal */}
      {editingBook && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-navy-950 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Edit Book Details & Stage</h3>
                <p className="text-xs text-navy-200 mt-0.5 font-mono">{editingBook.title} ({editingBook.book_id})</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingBook(null)}
                className="text-gray-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBook} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Production Stage / Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="input-field text-xs py-2 w-full font-medium"
                >
                  {PRODUCTION_STAGES.map((stg) => (
                    <option key={stg} value={stg}>
                      {stg}
                    </option>
                  ))}
                  {!PRODUCTION_STAGES.includes(editStatus) && (
                    <option value={editStatus}>{editStatus}</option>
                  )}
                </select>
                <span className="text-[11px] text-gray-500 mt-1 block">
                  Setting to <strong>Published & Live</strong> enables public sales tracking and author royalty payouts.
                </span>
              </div>

              {/* Print Partner Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Print Partner Facility
                </label>
                <select
                  value={editPrintPartner}
                  onChange={(e) => setEditPrintPartner(e.target.value)}
                  className="input-field text-xs py-2 w-full font-medium"
                >
                  {PRINT_PARTNERS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                  {!PRINT_PARTNERS.some((p) => p.value === editPrintPartner) && (
                    <option value={editPrintPartner}>{editPrintPartner}</option>
                  )}
                </select>
                <span className="text-[11px] text-gray-500 mt-1 block">
                  BookLeaf operations allocates printing based on book trim size, paper quality, and geographical order fulfillment.
                </span>
              </div>

              {/* Distribution Channels Multi-Select Checkboxes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Distribution Channels (Marketplaces)
                </label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-gray-200 rounded-lg">
                  {ALL_CHANNELS.map((channel) => {
                    const isChecked = editAvailableOn.includes(channel);
                    return (
                      <label
                        key={channel}
                        className="flex items-center space-x-2 text-xs text-gray-700 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleChannel(channel)}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                        />
                        <span className={isChecked ? 'font-semibold text-gray-900' : 'text-gray-500'}>
                          {channel}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <span className="text-[11px] text-gray-500 mt-1 block">
                  Check each platform where BookLeaf pushes retail catalog feeds and syncs inventory.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Retail Price (MRP ₹)
                  </label>
                  <input
                    type="number"
                    min="99"
                    max="9999"
                    value={editMrp}
                    onChange={(e) => setEditMrp(Number(e.target.value))}
                    className="input-field text-xs py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Copies Sold
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editCopiesSold}
                    onChange={(e) => setEditCopiesSold(Number(e.target.value))}
                    className="input-field text-xs py-2"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary py-1.5 px-4 text-xs font-semibold flex items-center"
                >
                  {saving ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
