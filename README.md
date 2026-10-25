# BookLeaf Publishing — Author Support & Communication Portal

A full-stack, enterprise-grade publishing operations portal for **BookLeaf Publishing**, purpose-built for author support, book catalog transparency, royalty tracking, and ticket management.

Upgraded to **Phase 2** with:
- **Google Gemini API** (via Google AI Studio) for genuine ticket classification and policy-grounded draft response generation.
- **Supabase PostgreSQL** database with Prisma ORM for relational persistence.
- **Dual-mode flexibility**: Toggle between live production services (`AI_PROVIDER=gemini`, `DATA_PROVIDER=postgres`) and local offline development (`AI_PROVIDER=mock`, `DATA_PROVIDER=json`).

---

## Architecture Diagram

```mermaid
flowchart TD
    subgraph Browser ["Frontend (apps/web — React + Vite + Tailwind)"]
        UI_AUTH["Author Portal\n(Dashboard, My Books, Tickets, New Query)"]
        UI_ADMIN["Admin Portal\n(Queue, Operations, Detail, Gemini Drafter)"]
        AUTH_CTX["AuthContext & TanStack Query Polling (6s)"]
    end

    subgraph REST_API ["NestJS REST API (apps/api — /api/v1)"]
        AUTH_GUARD["Session Auth & Role Guards\n(AUTHOR vs ADMIN)"]
        AUTH_CTRL["Auth Controller\n(/auth/login, /logout, /me)"]
        AUTHOR_CTRL["Author Controller\n(/author/books, /tickets, /dashboard)"]
        ADMIN_CTRL["Admin Controller\n(/admin/tickets, /draft, /replies, /notes)"]
    end

    subgraph Services ["Application Services Layer"]
        AI_SVC["AiService\n(Structured output & fallback safety)"]
        KB_SVC["KnowledgeBaseService\n(BookLeaf Royalty, ISBN, Print, & SLA Policies)"]
        AUTHOR_SVC["AuthorService (Validates ownership & saves ticket first)"]
        ADMIN_SVC["AdminService (Queue sorting, audit trail & reply isolation)"]
    end

    subgraph Extensibility ["AI Layer"]
        AI_PROVIDER["<< interface >> AiProvider"]
        GEMINI_AI["GeminiAiProvider\n(Google AI Studio REST API — gemini-2.5-flash)"]
        MOCK_AI["MockAiProvider\n(Deterministic keyword rules for offline dev)"]
    end

    subgraph Repositories ["Repository Abstraction Layer"]
        USER_REPO["UserRepository"]
        AUTHOR_REPO["AuthorRepository"]
        BOOK_REPO["BookRepository"]
        TICKET_REPO["TicketRepository"]
        MSG_REPO["TicketMessageRepository"]
        AUDIT_REPO["AuditRepository"]
    end

    subgraph Persistence ["Persistence Layer"]
        PRISMA_SVC["PrismaService (Supabase PostgreSQL Client)"]
        JSON_STORE["JsonDataStore (dev-store.json for offline testing)"]
    end

    UI_AUTH -->|HTTP + Cookies| AUTH_GUARD
    UI_ADMIN -->|HTTP + Cookies| AUTH_GUARD
    AUTH_GUARD --> AUTH_CTRL & AUTHOR_CTRL & ADMIN_CTRL
    AUTHOR_CTRL --> AUTHOR_SVC
    ADMIN_CTRL --> ADMIN_SVC
    AUTHOR_SVC --> AI_SVC
    ADMIN_SVC --> AI_SVC
    AI_SVC --> AI_PROVIDER
    AI_PROVIDER -.-> GEMINI_AI & MOCK_AI
    AUTHOR_SVC & ADMIN_SVC --> Repositories
    Repositories --> PRISMA_SVC
    Repositories -.-> JSON_STORE
```

---

## Monorepo Project Structure

```text
bookleaf-project/
├── apps/
│   ├── api/                       # NestJS Backend API
│   │   ├── prisma/
│   │   │   └── schema.prisma      # Supabase PostgreSQL relational schema
│   │   ├── src/
│   │   │   ├── admin/             # Admin ticket queue, audit, and operations
│   │   │   ├── ai/                # GeminiAiProvider, MockAiProvider, AiService
│   │   │   ├── auth/              # Bcrypt auth, session management, and role guards
│   │   │   ├── author/            # Author dashboard, book catalog, ticket creation
│   │   │   ├── data/              # PrismaService, Repositories, JsonDataStore, Seed
│   │   │   ├── knowledge-base/    # BookLeaf corporate, royalty, ISBN, and print policies
│   │   │   ├── app.module.ts
│   │   │   └── main.ts            # Entrypoint, CORS, Swagger, dotenv
│   │   └── package.json
│   │
│   └── web/                       # React Frontend Application
│       ├── src/
│       │   ├── components/
│       │   │   ├── common/        # StatusBadge, LoadingSpinner, EmptyState
│       │   │   └── layout/        # AppLayout, responsive sidebar & user menu
│       │   ├── contexts/          # AuthContext (session restoration & credentials)
│       │   ├── lib/               # Typed apiRequest client
│       │   ├── pages/
│       │   │   ├── admin/         # Dashboard, Global Ticket Queue, Ticket Detail
│       │   │   ├── author/        # Dashboard, My Books, Tickets, Submit Query
│       │   │   └── LoginPage.tsx  # Interactive login with 1-click demo switcher
│       │   ├── App.tsx            # Protected routes with role checks
│       │   └── main.tsx           # QueryClientProvider, Toaster bootstrap
│       └── package.json
│
├── packages/
│   └── shared/                    # Shared types, interfaces, enums, and constants
│       ├── src/index.ts
│       └── package.json
│
├── data/
│   └── dev-store.json             # File-backed development database (auto-seeded)
├── bookleaf_sample_data.json      # Original immutable source dataset (10 authors, 18 books)
├── README.md                      # Complete documentation & setup instructions
├── TECHNICAL_APPROACH.md          # Architectural decisions & write-up
└── package.json                   # Root monorepo workspace configuration
```

---

## Key Features

### 1. Robust Role-Based Access Control
- Two distinct roles: `AUTHOR` and `ADMIN`.
- Server-side role enforcement via `AuthGuard` and `RolesGuard` (`@Roles(UserRole.ADMIN)` / `@Roles(UserRole.AUTHOR)`).
- Session cookies with `HttpOnly` flags and SameSite protection.
- Authors can **never** access another author's profile, books, tickets, or internal notes (verified server-side).

### 2. High-Fidelity Dataset Import
- **10 Authors & 18 Books** imported faithfully from `bookleaf_sample_data.json`.
- Missing fields displayed gracefully per specifications:
  - Missing publication dates &rarr; `Not available`
  - Missing MRP &rarr; `Not set`
  - Missing royalty per copy &rarr; `Not available`
  - Zero royalties &rarr; `₹0`
  - Empty platforms &rarr; Helpful placeholder notice
  - Production books &rarr; Actual production stage displayed
  - Missing last payout date &rarr; `No payout recorded`
- Idempotent seeding prevents duplicate data upon restart.

### 3. Author Portal
- **Dashboard**: Greeting, aggregate royalty metrics, copies sold, recent books, recent tickets, and pending royalty alerts (noting the ₹1,000 threshold policy).
- **My Books**: Comprehensive catalog view with search and filter by live/in-production status, complete with royalty balances and distribution platforms.
- **Submit Query**: Form with client & server validation, author book selector, General/Account level option, character counters, and attachment dropzone.
- **My Tickets**: Filterable list of tickets with status and category badges.
- **Ticket Detail**: Chronological conversation history with **near-real-time polling (6-second intervals via TanStack Query)**.

### 4. Administrator Operations Portal
- **Dashboard**: Operational health metrics, urgent unresolved counts (Critical & High), unassigned queue size, category volume bars, and oldest unresolved tickets.
- **Global Ticket Queue**: Multi-filter queue (status, category, priority, assignment, search term) sorted by severity (`Critical > High > Medium > Low`), then oldest wait time.
- **Ticket Detail Console**:
  - Author identity & contact details.
  - Associated book metadata (sales, royalties, print partner, platforms).
  - AI Suggested Classification breakdown (category, priority, confidence, rule reasoning, provider).
  - Admin overrides for Category, Priority, and Status with persistent storage.
  - Assignment to self or unassignment.
  - **Strict message separation**:
    - **Official Public Responses**: Dispatched to author view.
    - **Staff Internal Notes**: Distinctive amber styling, strictly hidden from author endpoints.
  - **Audit Trail**: Tracking status transitions, assignments, and property modifications.

### 5. Google Gemini AI Integration
- Powered by `gemini-2.5-flash` via Google AI Studio REST API.
- **Structured JSON Classification**:
  - Strictly maps to `TicketCategory` and `TicketPriority` enums using `responseSchema`.
  - Detailed reasoning and confidence scoring.
  - Retries on HTTP 429/503 with exponential backoff.
  - Timeout protection (`AbortSignal.timeout(15000)`).
  - **Zero ticket loss**: The ticket is saved to PostgreSQL *before* calling AI; if Gemini times out or fails, the ticket is safely retained with fallback status for human review.
- **Policy-Grounded Reply Draft Generation**:
  - Grounded directly in BookLeaf Knowledge Base policies (80/20 net profit split, ₹1,000 threshold, 45-day quarterly cycle, 5-7 day print SLA, photo defect verification).
  - References the author's real book metrics (sales, royalties earned/paid/pending).
  - Strictly forbidden from hallucinating promises or unconfirmed dates.
  - Draft is returned to an editable textarea; **never auto-published** until an admin reviews and clicks "Send Official Reply".

### 6. Supabase PostgreSQL Persistence
- Managed via Prisma ORM (`apps/api/prisma/schema.prisma`).
- Full relational foreign keys:
  - `Author` &harr; `Book`
  - `Author` &harr; `Ticket`
  - `Ticket` &harr; `TicketMessage` (with `visibility: 'PUBLIC' | 'INTERNAL_NOTE'`)
  - `Ticket` &harr; `AuditLog`
- Decimal precision for monetary amounts (`mrp`, royalties).
- Automated seed service populates all 10 authors, 18 books, and initial demo tickets on first launch.

---

## Getting Started

### Prerequisites
- Node.js `>= 18.0.0` (tested on Node v22.14.0)
- npm `>= 9.0.0` (tested on npm 10.9.2)

### 1. Installation

From the project root:

```bash
# On Windows PowerShell (if execution policy restrictions apply)
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Install dependencies across all workspaces
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `apps/api/.env` and update the values:

```bash
cp .env.example apps/api/.env
```

Configuration options:

```dotenv
NODE_ENV=development
PORT=3000

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
AI_PROVIDER=gemini        # 'gemini' or 'mock'

# Supabase PostgreSQL
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres?sslmode=require
DIRECT_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres?sslmode=require

# Data Provider Adapter
DATA_PROVIDER=postgres    # 'postgres' or 'json'

# Authentication
SESSION_SECRET=a_strong_random_secret_string
COOKIE_SECURE=false
DEMO_PASSWORD=BookLeaf2024!
ADMIN_EMAIL=admin@bookleaf.in
FRONTEND_URL=http://localhost:5173
```

### 3. Database Schema Push (Prisma)

If using Supabase PostgreSQL:

```bash
npx prisma db push --schema apps/api/prisma/schema.prisma
```

### 4. Build

Build all packages and applications:

```bash
npm run build
```

---

## Running the Application

### Option A: Run Both Concurrently (Recommended)

```bash
npm run dev
```

This runs:
- Backend NestJS API on **`http://localhost:3000`**
- Frontend Vite React App on **`http://localhost:5173`**

### Option B: Run Individually

**Terminal 1 (Backend):**
```bash
node apps/api/dist/main.js
# Or in watch mode: npm run dev:api
```

**Terminal 2 (Frontend):**
```bash
npm run dev:web
```

---

## Demo Credentials & Fast Switcher

Every author in `bookleaf_sample_data.json` has a pre-seeded account, in addition to the Administrator account.

| Role | Name | Email | Password | Details |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | BookLeaf Admin | `admin@bookleaf.in` | `BookLeaf2024!` | Full queue & operations access |
| **AUTHOR** | Priya Sharma | `priya.sharma@email.com` | `BookLeaf2024!` | 2 books, pending royalties (AUTH001) |
| **AUTHOR** | Rohit Kapoor | `rohit.kapoor@email.com` | `BookLeaf2024!` | 2 books, bestseller (AUTH002) |
| **AUTHOR** | Ananya Reddy | `ananya.reddy@email.com` | `BookLeaf2024!` | 1 book, first payout pending (AUTH003) |
| **AUTHOR** | Vikram Joshi | `vikram.joshi@email.com` | `BookLeaf2024!` | 2 books, print quality issue (AUTH004) |
| **AUTHOR** | Meera Nair | `meera.nair@email.com` | `BookLeaf2024!` | 2 books, zero pending (AUTH005) |
| **AUTHOR** | Arjun Malhotra | `arjun.malhotra@email.com` | `BookLeaf2024!` | 1 book, new author (AUTH006) |
| **AUTHOR** | Sneha Kulkarni | `sneha.kulkarni@email.com` | `BookLeaf2024!` | 3 books, 1 in production (AUTH007) |
| **AUTHOR** | Farhan Sheikh | `farhan.sheikh@email.com` | `BookLeaf2024!` | 1 book, poetry (AUTH008) |
| **AUTHOR** | Kavita Deshmukh | `kavita.deshmukh@email.com` | `BookLeaf2024!` | 2 books, 1 in production (AUTH009) |
| **AUTHOR** | Diya Chatterjee | `diya.chatterjee@email.com` | `BookLeaf2024!` | 2 books, recent publication (AUTH010) |

> 💡 **Tip:** The Login Page features an interactive **Demo Accounts Quick-Fill** toolbar with 1-click buttons and a dropdown containing all 10 authors for instant testing.

---

## REST API Reference

Interactive OpenAPI documentation is live at **`http://localhost:3000/api/docs`**.

### Authentication
- `POST /api/v1/auth/login` — Authenticate and establish session
- `POST /api/v1/auth/logout` — Invalidate session
- `GET /api/v1/auth/me` — Retrieve active session user

### Author Endpoints (Requires `AUTHOR` role)
- `GET /api/v1/author/profile` — Get author profile
- `GET /api/v1/author/dashboard` — Get dashboard metrics (books, royalties, tickets)
- `GET /api/v1/author/books` — List all books owned by the logged-in author
- `GET /api/v1/author/books/:bookId` — Inspect a specific book (enforces ownership)
- `GET /api/v1/author/tickets` — List tickets submitted by author
- `POST /api/v1/author/tickets` — Submit a new support ticket (classified by Gemini)
- `GET /api/v1/author/tickets/:ticketId` — Get ticket details & public messages

### Administrator Endpoints (Requires `ADMIN` role)
- `GET /api/v1/admin/dashboard` — Queue metrics, category counts, urgent ticket alerts
- `GET /api/v1/admin/tickets` — Filterable, paginated global ticket queue
- `GET /api/v1/admin/tickets/:ticketId` — Detailed view with author, book, notes & audit trail
- `PATCH /api/v1/admin/tickets/:ticketId` — Update status, override category or priority
- `POST /api/v1/admin/tickets/:ticketId/draft` — Generate policy-grounded draft reply via Gemini
- `POST /api/v1/admin/tickets/:ticketId/replies` — Send official public response to author
- `POST /api/v1/admin/tickets/:ticketId/notes` — Create private internal staff note
- `PATCH /api/v1/admin/tickets/:ticketId/assignment` — Assign ticket to admin or unassign

---

## Automated Test Suites

The backend includes **42 automated unit and integration tests across 6 test suites**:

```bash
npm test -w apps/api
```

### Test Coverage Summary:
- **`src/ai/gemini-ai.spec.ts` (12 tests)**: Valid structured output, enum normalization, broken JSON fallback, missing API key, HTTP 503 retry/fallback, HTTP 429 backoff, timeout aborts, ticket preservation before classification, policy-grounded drafting, author/book context injection, anti-hallucination constraint enforcement, draft no-auto-publish verification.
- **`src/data/postgres-data.spec.ts` (12 tests)**: Authors query, books relational query, ticket creation with foreign keys, ticket updates, public reply vs internal note visibility, note isolation from authors, cross-author ticket isolation, cross-author book isolation, queue filtering and pagination, unassigned ticket counts, audit logging, and monetary Decimal preservation.
- **`src/auth/auth-and-security.spec.ts` (5 tests)**: Author authentication, invalid credential rejection, cross-author isolation, internal note filtering, global admin queue access.
- **`src/admin/ticket-lifecycle.spec.ts` (5 tests)**: Cross-author book attachment rejection, invalid book ID handling, ticket creation and classification, admin overrides persistence, admin reply persistence in author thread.
- **`src/data/seed-and-data.spec.ts` (4 tests)**: Import of all 10 authors and 18 books, idempotent seeding, preservation of null dates and zero balances, dev-store persistence.
- **`src/ai/ai-service.spec.ts` (4 tests)**: Category and priority validation, provider fallback safety, draft coordination.
