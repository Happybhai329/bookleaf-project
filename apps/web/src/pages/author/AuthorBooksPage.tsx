import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import type { Book } from '@bookleaf/shared';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { BookStatusBadge } from '@/components/common/StatusBadge';
import {
  BookOpen,
  Search,
  DollarSign,
  Printer,
  Globe,
  Calendar,
  Layers,
  ShoppingBag,
  PlusCircle,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function AuthorBooksPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'PRODUCTION'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // New book form state
  const [newTitle, setNewTitle] = useState('');
  const [newGenre, setNewGenre] = useState('Literary Fiction');
  const [newMrp, setNewMrp] = useState('399');
  const [newFormat, setNewFormat] = useState('Paperback');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([
    'Amazon India',
    'Flipkart',
    'BookLeaf Bookstore',
  ]);
  const [submittingBook, setSubmittingBook] = useState(false);

  const { data: books, isLoading, error, refetch } = useQuery<Book[]>({
    queryKey: ['author', 'books'],
    queryFn: () => apiRequest<Book[]>('/author/books'),
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading your catalog..." />;
  }

  if (error || !books) {
    return (
      <EmptyState
        title="Could not load books"
        description="There was an issue fetching your catalog. Please try again."
      />
    );
  }

  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.isbn.toLowerCase().includes(search.toLowerCase()) ||
      b.genre.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'LIVE') {
      return b.status === 'Published & Live';
    }
    if (statusFilter === 'PRODUCTION') {
      return b.status !== 'Published & Live';
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">
            My Books ({books.length})
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete records of all titles published and currently in production with BookLeaf.
          </p>
        </div>

        {/* Filter controls & Action */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn-primary py-2 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 flex items-center shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
            Register New Title
          </button>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by title, ISBN, genre..."
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
                  ? 'bg-navy-900 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({books.length})
            </button>
            <button
              onClick={() => setStatusFilter('LIVE')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === 'LIVE'
                  ? 'bg-navy-900 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Live ({books.filter((b) => b.status === 'Published & Live').length})
            </button>
            <button
              onClick={() => setStatusFilter('PRODUCTION')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === 'PRODUCTION'
                  ? 'bg-navy-900 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              In Production ({books.filter((b) => b.status !== 'Published & Live').length})
            </button>
          </div>
        </div>
      </div>

      {/* Book Cards Grid */}
      {filteredBooks.length === 0 ? (
        <EmptyState
          title="No books found"
          description="Try adjusting your search terms or filters to find what you're looking for."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredBooks.map((book) => {
            const hasRoyaltyPending = (book.royalty_pending ?? 0) > 0;

            return (
              <div
                key={book.book_id}
                className="card p-6 flex flex-col justify-between hover:shadow-md transition-shadow border-gray-200"
              >
                <div>
                  {/* Title & Status */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="font-mono text-[11px] font-semibold text-navy-600 bg-navy-50 px-2 py-0.5 rounded">
                        {book.book_id}
                      </span>
                      <h3 className="text-base font-bold text-gray-900 mt-1 leading-snug">
                        {book.title}
                      </h3>
                    </div>
                    <BookStatusBadge status={book.status} />
                  </div>

                  <p className="text-xs text-gray-500 font-medium mb-4">
                    ISBN: {book.isbn} • {book.genre}
                  </p>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-100 mb-4">
                    <div>
                      <span className="text-gray-400 block mb-0.5">Publication Date</span>
                      <span className="font-semibold text-gray-800 flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {book.publication_date || 'Not available'}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block mb-0.5">Retail Price (MRP)</span>
                      <span className="font-semibold text-gray-800">
                        {book.mrp !== null ? `₹${book.mrp}` : 'Not set'}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block mb-0.5">Royalty Per Copy</span>
                      <span className="font-semibold text-gray-800">
                        {book.author_royalty_per_copy !== null
                          ? `₹${book.author_royalty_per_copy}`
                          : 'Not available'}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block mb-0.5">Print Partner</span>
                      <span className="font-semibold text-gray-800 flex items-center">
                        <Printer className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {book.print_partner || 'Not assigned'}
                      </span>
                    </div>
                  </div>

                  {/* Sales & Royalties Row */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-white border border-gray-200 rounded-lg text-center mb-4">
                    <div>
                      <span className="text-[11px] text-gray-400 uppercase font-semibold block">
                        Copies Sold
                      </span>
                      <span className="text-base font-bold text-navy-950 mt-0.5 block">
                        {book.total_copies_sold ?? 0}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-gray-400 uppercase font-semibold block">
                        Earned
                      </span>
                      <span className="text-base font-bold text-emerald-700 mt-0.5 block">
                        ₹{(book.total_royalty_earned ?? 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-gray-400 uppercase font-semibold block">
                        Pending
                      </span>
                      <span
                        className={`text-base font-bold mt-0.5 block ${
                          hasRoyaltyPending ? 'text-amber-700' : 'text-gray-600'
                        }`}
                      >
                        ₹{(book.royalty_pending ?? 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Payout Information */}
                  <div className="text-xs text-gray-500 mb-4 flex items-center justify-between px-1">
                    <span>
                      Paid to Date: <strong>₹{(book.royalty_paid ?? 0).toLocaleString('en-IN')}</strong>
                    </span>
                    <span>
                      Last Payout:{' '}
                      <strong>{book.last_royalty_payout_date || 'No payout recorded'}</strong>
                    </span>
                  </div>
                </div>

                {/* Available On Platforms */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center text-xs text-gray-500 mb-2">
                    <Globe className="w-3.5 h-3.5 mr-1.5 text-navy-600" />
                    <span className="font-semibold text-gray-700">Distribution Channels:</span>
                  </div>
                  {book.available_on && book.available_on.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {book.available_on.map((platform) => (
                        <span
                          key={platform}
                          className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      No distribution platforms configured yet (in production stage)
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Register Title Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-gray-900">Register New Book Title</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newTitle.trim()) {
                  toast.error('Title is required');
                  return;
                }

                setSubmittingBook(true);
                try {
                  await apiRequest('/author/books', {
                    method: 'POST',
                    body: JSON.stringify({
                      title: newTitle.trim(),
                      genre: newGenre,
                      mrp: parseFloat(newMrp) || 299,
                      status: 'Manuscript Submitted',
                      available_on: selectedChannels.length > 0 ? selectedChannels : ['BookLeaf Bookstore'],
                    }),
                  });
                  toast.success('Title registered successfully!');
                  setShowAddModal(false);
                  setNewTitle('');
                  refetch();
                } catch (err: any) {
                  toast.error(err.message || 'Failed to register title');
                } finally {
                  setSubmittingBook(false);
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Book Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Echoes of the Silent Valley"
                  className="input-field text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Genre / Category
                  </label>
                  <select
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    className="input-field text-xs py-2"
                  >
                    <option value="Literary Fiction">Literary Fiction</option>
                    <option value="Poetry">Poetry</option>
                    <option value="Non-Fiction / Memoir">Non-Fiction / Memoir</option>
                    <option value="Thriller / Mystery">Thriller / Mystery</option>
                    <option value="Self-Help / Motivation">Self-Help / Motivation</option>
                    <option value="Sci-Fi / Fantasy">Sci-Fi / Fantasy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Planned Retail Price (₹)
                  </label>
                  <input
                    type="number"
                    min="99"
                    max="4999"
                    value={newMrp}
                    onChange={(e) => setNewMrp(e.target.value)}
                    className="input-field text-xs py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Requested Distribution Channels
                </label>
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 border border-gray-200 rounded-lg">
                  {['Amazon India', 'Flipkart', 'BookLeaf Bookstore', 'Amazon US / Global'].map((ch) => {
                    const isChecked = selectedChannels.includes(ch);
                    return (
                      <label
                        key={ch}
                        className="flex items-center space-x-2 text-xs text-gray-700 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedChannels([...selectedChannels, ch]);
                            } else {
                              setSelectedChannels(selectedChannels.filter((c) => c !== ch));
                            }
                          }}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                        />
                        <span className={isChecked ? 'font-semibold text-gray-900' : 'text-gray-500'}>
                          {ch}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800">
                💡 <strong>Standard BookLeaf Royalties:</strong> 15% royalty per sold copy (₹{Math.round((parseFloat(newMrp) || 299) * 0.15)} / copy). Production staff will assign the optimal print facility based on order volume and destination.
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary py-2 px-4 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBook}
                  className="btn-primary py-2 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500"
                >
                  {submittingBook ? 'Registering...' : 'Register Title'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
