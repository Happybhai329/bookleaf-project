// ─── Enums ─────────────────────────────────────────────────────────

export enum UserRole {
  AUTHOR = 'AUTHOR',
  ADMIN = 'ADMIN',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketCategory {
  ROYALTY_PAYMENTS = 'ROYALTY_PAYMENTS',
  ISBN_METADATA = 'ISBN_METADATA',
  PRINTING_QUALITY = 'PRINTING_QUALITY',
  DISTRIBUTION_AVAILABILITY = 'DISTRIBUTION_AVAILABILITY',
  BOOK_STATUS_PRODUCTION = 'BOOK_STATUS_PRODUCTION',
  GENERAL_INQUIRY = 'GENERAL_INQUIRY',
}

export enum TicketPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum MessageVisibility {
  PUBLIC = 'PUBLIC',
  INTERNAL_NOTE = 'INTERNAL_NOTE',
}

// ─── Display Labels ────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.ROYALTY_PAYMENTS]: 'Royalty & Payments',
  [TicketCategory.ISBN_METADATA]: 'ISBN & Metadata Issues',
  [TicketCategory.PRINTING_QUALITY]: 'Printing & Quality',
  [TicketCategory.DISTRIBUTION_AVAILABILITY]: 'Distribution & Availability',
  [TicketCategory.BOOK_STATUS_PRODUCTION]: 'Book Status & Production Updates',
  [TicketCategory.GENERAL_INQUIRY]: 'General Inquiry',
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  [TicketPriority.CRITICAL]: 'Critical',
  [TicketPriority.HIGH]: 'High',
  [TicketPriority.MEDIUM]: 'Medium',
  [TicketPriority.LOW]: 'Low',
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'Open',
  [TicketStatus.IN_PROGRESS]: 'In Progress',
  [TicketStatus.RESOLVED]: 'Resolved',
  [TicketStatus.CLOSED]: 'Closed',
};

// ─── Priority sort order (lower = more urgent) ────────────────────

export const PRIORITY_ORDER: Record<TicketPriority, number> = {
  [TicketPriority.CRITICAL]: 0,
  [TicketPriority.HIGH]: 1,
  [TicketPriority.MEDIUM]: 2,
  [TicketPriority.LOW]: 3,
};

// ─── Interfaces ────────────────────────────────────────────────────

export interface Author {
  author_id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  joined_date: string;
}

export interface Book {
  book_id: string;
  author_id: string;
  title: string;
  isbn: string;
  genre: string;
  publication_date: string | null;
  status: string;
  mrp: number | null;
  author_royalty_per_copy: number | null;
  total_copies_sold: number;
  total_royalty_earned: number;
  royalty_paid: number;
  royalty_pending: number;
  last_royalty_payout_date: string | null;
  print_partner: string | null;
  available_on: string[];
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  author_id: string | null;
  display_name: string;
  created_at: string;
}

export interface AiClassification {
  suggested_category: TicketCategory;
  suggested_priority: TicketPriority;
  reasoning: string;
  provider: string;
  classified_at: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface Ticket {
  id: string;
  reference: string;
  author_id: string;
  book_id: string | null;
  subject: string;
  description: string;
  status: TicketStatus;
  ai_classification: AiClassification | null;
  final_category: TicketCategory;
  final_priority: TicketPriority;
  assigned_admin_id: string | null;
  assigned_admin_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: UserRole;
  visibility: MessageVisibility;
  content: string;
  is_ai_draft: boolean;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  ticket_id: string;
  user_id: string;
  user_name: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

// ─── API DTOs ──────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  author_id: string | null;
  display_name: string;
}

export interface CreateTicketRequest {
  book_id: string | null;
  subject: string;
  description: string;
}

export interface UpdateTicketRequest {
  final_category?: TicketCategory;
  final_priority?: TicketPriority;
  status?: TicketStatus;
}

export interface AssignTicketRequest {
  admin_id: string | null;
}

export interface CreateReplyRequest {
  content: string;
}

export interface CreateNoteRequest {
  content: string;
}

export interface GenerateDraftRequest {
  additional_context?: string;
}

// ─── Dashboard types ───────────────────────────────────────────────

export interface AuthorDashboard {
  author: Author;
  total_books: number;
  published_books: number;
  in_production_books: number;
  total_copies_sold: number;
  total_royalties_earned: number;
  total_royalties_paid: number;
  total_pending_royalties: number;
  recent_books: Book[];
  recent_tickets: Ticket[];
}

export interface AdminDashboard {
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  resolved_tickets: number;
  closed_tickets: number;
  critical_unresolved: number;
  high_unresolved: number;
  unassigned_tickets: number;
  tickets_by_category: Record<TicketCategory, number>;
  oldest_unresolved: Ticket[];
}

// ─── Ticket query params ───────────────────────────────────────────

export interface TicketFilters {
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  assigned_admin_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ─── AI Provider types ─────────────────────────────────────────────

export interface ClassificationResult {
  category: TicketCategory;
  priority: TicketPriority;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  provider: string;
}

export interface DraftResult {
  content: string;
  provider: string;
  generated_at: string;
}

export interface TicketContext {
  subject: string;
  description: string;
  book: Book | null;
  author: Author;
  category: TicketCategory;
  priority: TicketPriority;
  existing_messages: Array<{
    sender_role: UserRole;
    content: string;
    created_at: string;
  }>;
}
