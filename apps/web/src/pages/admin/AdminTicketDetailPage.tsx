import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
  MessageVisibility,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from '@bookleaf/shared';
import type { Ticket, TicketMessage, Author, Book, AuditEntry } from '@bookleaf/shared';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge, PriorityBadge, CategoryBadge, BookStatusBadge } from '@/components/common/StatusBadge';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  BookOpen,
  Sparkles,
  Send,
  Lock,
  MessageSquare,
  ShieldAlert,
  CheckCircle,
  FileText,
  Clock,
  History,
  AlertCircle,
  Bot,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AdminTicketDetailResponse {
  ticket: Ticket;
  author: Author;
  book: Book | null;
  messages: TicketMessage[];
  audit: AuditEntry[];
}

export function AdminTicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Reply & Note composer state
  const [replyContent, setReplyContent] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);

  // Status & Priority form state
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | ''>('');
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | ''>('');
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority | ''>('');
  const [updatingTicket, setUpdatingTicket] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<AdminTicketDetailResponse>({
    queryKey: ['admin', 'ticket', ticketId],
    queryFn: () => apiRequest<AdminTicketDetailResponse>(`/admin/tickets/${ticketId}`),
    refetchInterval: 6000,
  });

  // Sync state once data loads
  React.useEffect(() => {
    if (data) {
      setSelectedStatus(data.ticket.status);
      setSelectedCategory(data.ticket.final_category);
      setSelectedPriority(data.ticket.final_priority);
    }
  }, [data]);

  if (isLoading) {
    return <LoadingSpinner message="Loading ticket operations console..." />;
  }

  if (error || !data) {
    return (
      <EmptyState
        title="Ticket not found"
        description="Could not locate this ticket record in the repository."
        action={{
          label: 'Back to Global Queue',
          onClick: () => (window.location.href = '/admin/tickets'),
        }}
      />
    );
  }

  const { ticket, author, book, messages, audit } = data;

  // ─── Actions ──────────────────────────────────────────────────

  const handleGenerateDraft = async () => {
    setGeneratingDraft(true);
    try {
      const res = await apiRequest<{ content: string; provider: string }>(
        `/admin/tickets/${ticketId}/draft`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      );
      setReplyContent(res.content);
      const providerLabel = res.provider === 'gemini' ? 'Google Gemini AI' : 'AI Assistant';
      toast.success(`${providerLabel} draft generated! Review before sending.`, { icon: '✨' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate draft');
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) {
      toast.error('Reply content cannot be empty');
      return;
    }

    setSubmittingReply(true);
    try {
      await apiRequest(`/admin/tickets/${ticketId}/replies`, {
        method: 'POST',
        body: JSON.stringify({ content: replyContent.trim() }),
      });
      setReplyContent('');
      toast.success('Official public response sent to author');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) {
      toast.error('Note content cannot be empty');
      return;
    }

    setSubmittingNote(true);
    try {
      await apiRequest(`/admin/tickets/${ticketId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content: noteContent.trim() }),
      });
      setNoteContent('');
      toast.success('Internal note saved (staff only)');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save note');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleUpdateTicketProperties = async () => {
    setUpdatingTicket(true);
    try {
      await apiRequest(`/admin/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: selectedStatus || undefined,
          final_category: selectedCategory || undefined,
          final_priority: selectedPriority || undefined,
        }),
      });
      toast.success('Ticket properties updated');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update ticket');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const handleToggleAssignment = async () => {
    const isAssignedToMe = ticket.assigned_admin_id === user?.id;
    const newAdminId = isAssignedToMe ? null : user?.id;

    try {
      await apiRequest(`/admin/tickets/${ticketId}/assignment`, {
        method: 'PATCH',
        body: JSON.stringify({ admin_id: newAdminId }),
      });
      toast.success(isAssignedToMe ? 'Ticket unassigned' : 'Ticket assigned to you');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update assignment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/tickets"
          className="inline-flex items-center text-xs font-semibold text-navy-600 hover:text-navy-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Global Queue
        </Link>
        <span className="font-mono text-xs font-bold text-navy-900 bg-navy-50 px-2.5 py-1 rounded border border-navy-200">
          Ticket Ref: {ticket.reference}
        </span>
      </div>

      {/* Main Grid: Left 2 Cols (Conversation & Reply), Right 1 Col (Author & Controls) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Main Ticket & Thread) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Header & Description */}
          <div className="card p-6 border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-gray-100">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-navy-800 bg-navy-50 px-2 py-0.5 rounded">
                    {ticket.reference}
                  </span>
                  <CategoryBadge category={ticket.final_category} />
                  <PriorityBadge priority={ticket.final_priority} />
                </div>
                <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
              </div>
              <div className="shrink-0">
                <StatusBadge status={ticket.status} />
              </div>
            </div>

            {/* Description box */}
            <div className="mt-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Author Inbound Description
              </span>
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {ticket.description}
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
              <span>Submitted: {new Date(ticket.created_at).toLocaleString()}</span>
              <span>Updated: {new Date(ticket.updated_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Unified Conversation & Internal Notes Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center">
                <MessageSquare className="w-4 h-4 mr-2 text-navy-600" />
                Conversation & Staff Activity ({messages.length})
              </h2>
              <span className="text-xs text-gray-400">
                Staff notes are highlighted in amber
              </span>
            </div>

            {messages.length === 0 ? (
              <div className="card p-6 text-center border-dashed border-gray-200 text-xs text-gray-400">
                No replies or internal notes logged yet.
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isInternal = msg.visibility === MessageVisibility.INTERNAL_NOTE;

                  return (
                    <div
                      key={msg.id}
                      className={`card p-4 transition-all ${
                        isInternal
                          ? 'border-2 border-amber-300 bg-amber-50/40 shadow-sm'
                          : 'border border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-xs font-bold ${
                              isInternal ? 'text-amber-900' : 'text-gray-900'
                            }`}
                          >
                            {msg.sender_name}
                          </span>

                          {/* Distinctive Visibility Pill */}
                          {isInternal ? (
                            <span className="inline-flex items-center text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                              <Lock className="w-3 h-3 mr-1" />
                              STAFF INTERNAL NOTE (HIDDEN FROM AUTHOR)
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                              PUBLIC RESPONSE (VISIBLE TO AUTHOR)
                            </span>
                          )}
                        </div>

                        <span className="text-xs text-gray-400">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Response Composers Tabbed / Stacked */}
          <div className="space-y-6 pt-2">
            {/* 1. Public Reply Composer with AI Draft Generator */}
            <div className="card p-6 border-blue-200 bg-blue-50/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Send className="w-4 h-4 text-navy-700" />
                  <h3 className="text-sm font-bold text-gray-900">
                    Official Public Response
                  </h3>
                  <span className="text-xs text-gray-500">(Will be sent to author)</span>
                </div>

                {/* AI Draft Button */}
                <button
                  type="button"
                  disabled={generatingDraft}
                  onClick={handleGenerateDraft}
                  className="btn-secondary py-1 px-3 text-xs bg-white text-navy-800 border-navy-300 hover:bg-navy-50 flex items-center shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-navy-600" />
                  {generatingDraft ? 'Generating Draft with Gemini...' : '✨ Generate AI Draft (Gemini)'}
                </button>
              </div>

              <form onSubmit={handleSendReply} className="space-y-3">
                <textarea
                  rows={6}
                  required
                  placeholder="Compose official response to author, or click 'Generate AI Draft' to draft from BookLeaf Knowledge Base policies..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="input-field text-sm font-sans"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-gray-500 flex items-center">
                    <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600 inline" />
                    Draft is private & editable. Never auto-published until you click Send Official Reply.
                  </span>
                  <button
                    type="submit"
                    disabled={submittingReply || !replyContent.trim()}
                    className="btn-primary py-2 px-4 text-xs font-semibold"
                  >
                    {submittingReply ? 'Sending Reply...' : 'Send Official Reply'}
                  </button>
                </div>
              </form>
            </div>

            {/* 2. Staff Internal Note Composer */}
            <div className="card p-6 border-amber-300 bg-amber-50/30">
              <div className="flex items-center space-x-2 mb-3">
                <Lock className="w-4 h-4 text-amber-700" />
                <h3 className="text-sm font-bold text-amber-900">
                  Add Staff Internal Note
                </h3>
                <span className="text-xs text-amber-700 font-medium">
                  (Strictly hidden from the author)
                </span>
              </div>

              <form onSubmit={handleAddNote} className="space-y-3">
                <textarea
                  rows={3}
                  required
                  placeholder="Record internal findings, printing plant inquiries, or private notes for other staff members..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="input-field text-sm border-amber-200 focus:border-amber-400"
                />

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={submittingNote || !noteContent.trim()}
                    className="btn-secondary text-xs bg-amber-700 hover:bg-amber-800 text-white border-amber-700 font-semibold"
                  >
                    {submittingNote ? 'Saving Note...' : 'Add Private Staff Note'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Author Info, Associated Book & Management Controls */}
        <div className="space-y-6">
          {/* AI Suggested Classification (Inspection Card) */}
          {ticket.ai_classification && (
            <div
              className={`card p-5 border ${
                ticket.ai_classification.provider === 'fallback'
                  ? 'border-amber-300 bg-amber-50/50'
                  : 'border-navy-200 bg-navy-50/40'
              }`}
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-navy-100">
                <span className="text-xs font-bold text-navy-900 flex items-center">
                  <Bot className="w-3.5 h-3.5 mr-1.5 text-navy-700" />
                  AI Classification Analysis
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                    ticket.ai_classification.provider === 'gemini'
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : ticket.ai_classification.provider === 'fallback'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {ticket.ai_classification.provider === 'gemini'
                    ? '⚡ Google Gemini 2.5 Flash'
                    : ticket.ai_classification.provider === 'fallback'
                    ? 'Review Required'
                    : 'BookLeaf AI Engine'}
                </span>
              </div>

              {ticket.ai_classification.provider === 'fallback' && (
                <div className="mb-3 p-2.5 bg-amber-100/70 border border-amber-300 rounded text-xs text-amber-900 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Human Review Flagged:</strong> AI classification was unavailable or low-confidence. Please verify the category and priority manually below.
                  </span>
                </div>
              )}

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-gray-500 block">Suggested Category:</span>
                  <span className="font-semibold text-gray-800">
                    {CATEGORY_LABELS[ticket.ai_classification.suggested_category]}
                  </span>
                </div>

                <div>
                  <span className="text-gray-500 block">Suggested Priority:</span>
                  <span className="font-semibold text-gray-800">
                    {PRIORITY_LABELS[ticket.ai_classification.suggested_priority]} (
                    <span
                      className={
                        ticket.ai_classification.confidence === 'high'
                          ? 'text-green-700 font-bold'
                          : ticket.ai_classification.confidence === 'medium'
                          ? 'text-navy-700 font-semibold'
                          : 'text-amber-700 font-bold'
                      }
                    >
                      {ticket.ai_classification.confidence} confidence
                    </span>
                    )
                  </span>
                </div>

                <div className="pt-2 border-t border-navy-100/60 text-[11px] text-gray-600 italic">
                  <strong>Reasoning:</strong> {ticket.ai_classification.reasoning}
                </div>
              </div>
            </div>
          )}

          {/* Ticket Management & Overrides */}
          <div className="card p-5 border-gray-200">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">
              Ticket Operations & Overrides
            </h3>

            <div className="space-y-3.5 text-xs">
              {/* Assignment */}
              <div>
                <label className="block text-gray-500 mb-1 font-semibold">Assigned Admin</label>
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="font-medium text-gray-800">
                    {ticket.assigned_admin_name || 'Unassigned'}
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleAssignment}
                    className="text-[11px] font-semibold text-navy-700 hover:text-navy-900"
                  >
                    {ticket.assigned_admin_id === user?.id ? 'Unassign Me' : 'Assign to Me'}
                  </button>
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-gray-500 mb-1 font-semibold">Ticket Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as TicketStatus)}
                  className="input-field text-xs py-1.5"
                >
                  {Object.entries(STATUS_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Final Category (Override) */}
              <div>
                <label className="block text-gray-500 mb-1 font-semibold">Final Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as TicketCategory)}
                  className="input-field text-xs py-1.5"
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Final Priority (Override) */}
              <div>
                <label className="block text-gray-500 mb-1 font-semibold">Final Priority</label>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value as TicketPriority)}
                  className="input-field text-xs py-1.5"
                >
                  {Object.entries(PRIORITY_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                disabled={updatingTicket}
                onClick={handleUpdateTicketProperties}
                className="btn-primary w-full py-2 text-xs font-semibold mt-2"
              >
                {updatingTicket ? 'Saving...' : 'Save Property Changes'}
              </button>
            </div>
          </div>

          {/* Author Details Card */}
          <div className="card p-5 border-gray-200">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100 flex items-center">
              <User className="w-3.5 h-3.5 mr-1.5 text-navy-600" />
              Author Contact & Account
            </h3>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-gray-400 block">Name</span>
                <span className="font-semibold text-gray-900">{author.name}</span>
                <span className="font-mono text-[10px] text-gray-400 ml-1">({author.author_id})</span>
              </div>

              <div>
                <span className="text-gray-400 block">Email</span>
                <span className="font-medium text-gray-800 flex items-center">
                  <Mail className="w-3 h-3 mr-1 text-slate-400" />
                  {author.email}
                </span>
              </div>

              <div>
                <span className="text-gray-400 block">Phone</span>
                <span className="font-medium text-gray-800 flex items-center">
                  <Phone className="w-3 h-3 mr-1 text-slate-400" />
                  {author.phone}
                </span>
              </div>

              <div>
                <span className="text-gray-400 block">Location</span>
                <span className="font-medium text-gray-800 flex items-center">
                  <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                  {author.city}
                </span>
              </div>

              <div>
                <span className="text-gray-400 block">Joined</span>
                <span className="font-medium text-gray-800 flex items-center">
                  <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                  {author.joined_date}
                </span>
              </div>
            </div>
          </div>

          {/* Associated Book Details Card */}
          {book && (
            <div className="card p-5 border-gray-200">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100 flex items-center">
                <BookOpen className="w-3.5 h-3.5 mr-1.5 text-navy-600" />
                Associated Book Details
              </h3>

              <div className="space-y-2 text-xs">
                <div>
                  <h4 className="font-bold text-gray-900">{book.title}</h4>
                  <p className="text-[11px] text-gray-500 font-mono">ISBN: {book.isbn}</p>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-gray-400">Status:</span>
                  <BookStatusBadge status={book.status} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">MRP / Royalty:</span>
                  <span className="font-semibold text-gray-800">
                    {book.mrp !== null ? `₹${book.mrp}` : 'Not set'} (₹{book.author_royalty_per_copy ?? 0}/copy)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Copies Sold:</span>
                  <span className="font-semibold text-gray-800">{book.total_copies_sold}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Pending Royalty:</span>
                  <span className="font-bold text-amber-700">₹{book.royalty_pending.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Print Partner:</span>
                  <span className="font-medium text-gray-800">{book.print_partner || 'In-House'}</span>
                </div>

                {book.available_on && (
                  <div className="pt-2">
                    <span className="text-gray-400 block mb-1">Available On:</span>
                    <div className="flex flex-wrap gap-1">
                      {book.available_on.map((p) => (
                        <span key={p} className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Audit History Drawer */}
          {audit && audit.length > 0 && (
            <div className="card p-5 border-gray-200">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100 flex items-center">
                <History className="w-3.5 h-3.5 mr-1.5 text-navy-600" />
                Audit Trail ({audit.length})
              </h3>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {audit.map((entry) => (
                  <div key={entry.id} className="text-[11px] p-2 bg-slate-50 rounded border border-slate-100">
                    <div className="flex items-center justify-between font-semibold text-gray-800">
                      <span>{entry.action}</span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-gray-500 text-[10px]">By {entry.user_name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
