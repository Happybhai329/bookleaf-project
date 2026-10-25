import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import type { Ticket, TicketMessage, Book } from '@bookleaf/shared';
import { TicketStatus } from '@bookleaf/shared';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge, CategoryBadge, BookStatusBadge } from '@/components/common/StatusBadge';
import {
  ArrowLeft,
  Calendar,
  BookOpen,
  MessageSquare,
  ShieldCheck,
  User,
  Radio,
  Clock,
  Send,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AuthorTicketDetailResponse {
  ticket: Ticket;
  messages: TicketMessage[];
  book: Book | null;
}

export function AuthorTicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [resolvingTicket, setResolvingTicket] = useState(false);

  // Poll every 5 seconds as required by the technical assignment
  const { data, isLoading, error, refetch } = useQuery<AuthorTicketDetailResponse>({
    queryKey: ['author', 'ticket', ticketId],
    queryFn: () => apiRequest<AuthorTicketDetailResponse>(`/author/tickets/${ticketId}`),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    enabled: !!ticketId,
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading conversation details..." />;
  }

  if (error || !data) {
    return (
      <EmptyState
        title="Ticket not found"
        description="Could not locate this ticket, or you do not have permission to view it."
        action={{
          label: 'Back to My Tickets',
          onClick: () => (window.location.href = '/author/tickets'),
        }}
      />
    );
  }

  const { ticket, messages, book } = data;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navigation & Live Polling Indicator */}
      <div className="flex items-center justify-between">
        <Link
          to="/author/tickets"
          className="inline-flex items-center text-xs font-semibold text-navy-600 hover:text-navy-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to My Support Queries
        </Link>

        {/* Live sync pill */}
        <div className="flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span className="font-medium">Live sync active (5s)</span>
        </div>
      </div>

      {/* Ticket Header Card */}
      <div className="card p-6 border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold text-navy-800 bg-navy-50 px-2.5 py-0.5 rounded border border-navy-100">
                {ticket.reference}
              </span>
              <CategoryBadge category={ticket.final_category} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              {ticket.subject}
            </h1>
          </div>
          <div className="shrink-0">
            <StatusBadge status={ticket.status} />
          </div>
        </div>

        {/* Timestamps & Book reference */}
        <div className="mt-4 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-gray-500">
          <span className="flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Submitted on {new Date(ticket.created_at).toLocaleString()}
          </span>

          <span className="flex items-center">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Last updated {new Date(ticket.updated_at).toLocaleString()}
          </span>
        </div>

        {/* Book Information Banner (if ticket linked to a book) */}
        {book && (
          <div className="mt-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5">
              <BookOpen className="w-4 h-4 text-navy-600 shrink-0" />
              <div>
                <span className="text-gray-400">Related Title: </span>
                <strong className="text-gray-900 font-semibold">{book.title}</strong>
                <span className="text-gray-500 ml-2">ISBN: {book.isbn}</span>
              </div>
            </div>
            <div className="shrink-0">
              <BookStatusBadge status={book.status} />
            </div>
          </div>
        )}
      </div>

      {/* Conversation Thread */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center">
          <MessageSquare className="w-4 h-4 mr-2 text-navy-600" />
          Conversation History
        </h2>

        {/* Original Description (Author query) */}
        <div className="card p-5 border-l-4 border-l-navy-600 bg-white">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-navy-100 text-navy-800 flex items-center justify-center text-xs font-bold">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-gray-900">You (Author)</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                Original Query
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {new Date(ticket.created_at).toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {ticket.description}
          </p>
        </div>

        {/* Replies List */}
        {messages.map((message) => {
          const isAdmin = message.sender_role === 'ADMIN';

          return (
            <div
              key={message.id}
              className={`card p-5 ${
                isAdmin
                  ? 'border-l-4 border-l-emerald-600 bg-emerald-50/20 shadow-sm'
                  : 'border-l-4 border-l-navy-600 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isAdmin
                        ? 'bg-emerald-600 text-white'
                        : 'bg-navy-100 text-navy-800'
                    }`}
                  >
                    {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-xs font-bold text-gray-900">
                    {isAdmin ? 'BookLeaf Publishing Support' : message.sender_name}
                  </span>
                  {isAdmin && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                      Official Response
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(message.created_at).toLocaleString()}
                </span>
              </div>

              <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {message.content}
              </div>
            </div>
          );
        })}

        {/* If no responses yet */}
        {messages.length === 0 && (
          <div className="card p-6 text-center border-dashed border-gray-300 bg-slate-50/50">
            <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-gray-700">Awaiting Support Response</h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
              Your inquiry has been logged with our team. Our support representatives investigate author queries within 24 to 48 hours according to publishing policy.
            </p>
          </div>
        )}

        {/* Author Reply Composer & Actions */}
        <div className="card p-6 border-navy-200 bg-white shadow-sm mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center">
              <MessageSquare className="w-4 h-4 mr-2 text-navy-700" />
              Send a Follow-up Message
            </h3>
            {ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED && (
              <button
                type="button"
                disabled={resolvingTicket}
                onClick={async () => {
                  setResolvingTicket(true);
                  try {
                    await apiRequest(`/author/tickets/${ticketId}/resolve`, { method: 'POST' });
                    toast.success('Ticket marked as resolved');
                    refetch();
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to update ticket');
                  } finally {
                    setResolvingTicket(false);
                  }
                }}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                {resolvingTicket ? 'Resolving...' : 'Mark Issue as Resolved'}
              </button>
            )}
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!replyText.trim()) return;

              setSubmittingReply(true);
              try {
                await apiRequest(`/author/tickets/${ticketId}/replies`, {
                  method: 'POST',
                  body: JSON.stringify({ content: replyText.trim() }),
                });
                setReplyText('');
                toast.success('Your message has been sent to BookLeaf support');
                refetch();
              } catch (err: any) {
                toast.error(err.message || 'Failed to send reply');
              } finally {
                setSubmittingReply(false);
              }
            }}
            className="space-y-3"
          >
            <textarea
              rows={4}
              required
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your response or provide additional details for the support team..."
              className="input-field text-sm font-sans"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingReply || !replyText.trim()}
                className="btn-primary py-2.5 px-5 text-xs font-semibold flex items-center"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {submittingReply ? 'Sending Message...' : 'Send Message'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
