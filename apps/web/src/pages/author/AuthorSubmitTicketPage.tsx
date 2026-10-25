import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import type { Book, Ticket } from '@bookleaf/shared';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Send, Upload, AlertCircle, Info, BookOpen, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function AuthorSubmitTicketPage() {
  const navigate = useNavigate();

  const [bookId, setBookId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [simulatedFileName, setSimulatedFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch author's books for the dropdown
  const { data: books, isLoading: loadingBooks } = useQuery<Book[]>({
    queryKey: ['author', 'books'],
    queryFn: () => apiRequest<Book[]>('/author/books'),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (subject.trim().length < 5) {
      toast.error('Subject must be at least 5 characters');
      return;
    }
    if (description.trim().length < 10) {
      toast.error('Description must be at least 10 characters');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        book_id: bookId ? bookId : null,
        subject: subject.trim(),
        description: description.trim(),
      };

      const newTicket = await apiRequest<Ticket>('/author/tickets', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      toast.success(`Ticket ${newTicket.reference} submitted successfully!`);
      navigate(`/author/tickets/${newTicket.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-950">
          Submit a Support Query
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Have a question about royalties, ISBNs, printing, or distribution? Our publishing support team will assist you.
        </p>
      </div>

      <div className="card p-6 sm:p-8 border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Associated Book */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1.5 flex items-center">
              <BookOpen className="w-4 h-4 mr-1.5 text-navy-600" />
              Related Book
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Select the book this query relates to, or choose General / Account Level for non-book inquiries.
            </p>

            {loadingBooks ? (
              <div className="text-xs text-gray-400 py-2">Loading your catalog...</div>
            ) : (
              <select
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
                className="input-field text-sm"
              >
                <option value="">-- General / Account Level Query (No Specific Book) --</option>
                {books?.map((b) => (
                  <option key={b.book_id} value={b.book_id}>
                    {b.title} (ISBN: {b.isbn}) — [{b.status}]
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Subject */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-semibold text-gray-900">
                Subject <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-gray-400">
                {subject.length}/200 characters
              </span>
            </div>
            <input
              type="text"
              required
              minLength={5}
              maxLength={200}
              placeholder="e.g., Question regarding Q3 royalty payout amount"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-semibold text-gray-900">
                Detailed Description <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-gray-400">
                {description.length}/5000 characters
              </span>
            </div>
            <textarea
              required
              rows={6}
              minLength={10}
              maxLength={5000}
              placeholder="Please provide complete details about your inquiry or the issue you are encountering..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field resize-y"
            />
          </div>

          {/* Attachment (Simulated UI) */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1.5 flex items-center">
              <Upload className="w-4 h-4 mr-1.5 text-navy-600" />
              Attach Photographs or Supporting Documents (Optional)
            </label>

            <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSimulatedFileName(file.name);
                    toast('Attachment simulated in preview mode', { icon: '📎' });
                  }
                }}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <span className="text-xs font-semibold text-navy-700 hover:text-navy-900">
                  Click to select a file
                </span>
                <span className="text-xs text-gray-400 block mt-1">
                  PNG, JPG, PDF up to 10MB
                </span>
              </label>

              {simulatedFileName && (
                <div className="mt-3 inline-flex items-center text-xs bg-navy-50 text-navy-800 px-3 py-1 rounded-full font-medium border border-navy-100">
                  <span>Selected: {simulatedFileName}</span>
                </div>
              )}
            </div>

            {/* Clear specification disclaimer */}
            <div className="mt-2 flex items-start space-x-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                <strong>Note on file attachments:</strong> Attachment selection is simulated in this local preview phase. Actual cloud file storage will be enabled in the upcoming cloud storage integration.
              </span>
            </div>
          </div>

          {/* Submit CTA */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/author/tickets')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? (
                <span>Submitting ticket...</span>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Support Query
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
