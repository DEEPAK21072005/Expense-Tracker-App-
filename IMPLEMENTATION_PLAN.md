# Phased Implementation Roadmap & Engineering Plan

This roadmap governs the end-to-end transformation of the legacy Expense Tracker into a production-grade personal finance application.

---

## Phase 0: Repository & PDF Specification Audit (Completed)
- **Status**: Completed
- **Deliverables**: Comprehensive audit of `index.html`, `script.js`, `style.css`, and the 14-page architectural research specification. Created `ARCHITECTURE.md`, `MIGRATION.md`, and `DECISIONS.md`.
- **Verification**: Zero blind tech choices; clear boundaries established for data migration, security, and precision math.

---

## Phase 1: Modern Next.js Foundation & Tooling Setup
- **Deliverables**:
  - Initialize Next.js 15+ App Router application with TypeScript and Tailwind CSS.
  - Setup ESLint, Prettier, and TypeScript configuration with strict typing.
  - Setup Vitest testing environment.
  - Define folder architecture (`app/`, `components/`, `lib/`, `prisma/`, `tests/`).
- **Verification**: `npm run build`, `npm test`, and `npm run lint` execute cleanly with 0 errors.

---

## Phase 2: Design System & "Asian Apple" Minimalist UI Tokens
- **Deliverables**:
  - Configure Tailwind CSS tokens (color palette, warm slate backgrounds, hairline borders, soft shadows, WCAG 2.2 AA contrast).
  - Build UI primitives: `Button`, `Input`, `Select`, `Modal / Dialog`, `Card`, `Badge`, `Tabs`, `Table`, `Toast / Notification`.
  - Implement Light / Dark / System theme provider with no flash of unstyled content.
  - Implement global responsive navigation layout (Header, navigation links, mobile drawer).
- **Verification**: Component visual review, accessibility contrast check (≥ 4.5:1), responsive layout from 320px to 4K displays.

---

## Phase 3: Database & Domain Model with Prisma ORM
- **Deliverables**:
  - Implement `prisma/schema.prisma` covering: `User`, `Account`, `Category`, `Transaction`, `Budget`, `RecurringPayment`, `ExpenseSplitGroup`, `SplitMember`, `SplitExpense`, and `Report`.
  - Implement core `Money` minor-unit mathematical abstraction (`amountMinor`, formatting, ISO currency codes).
  - Seed script (`prisma/seed.ts`) with realistic financial categories (Housing, Food, Transit, Utilities, Entertainment, Healthcare, Income, Investments) and default demo data.
  - In-memory/SQLite database initialization for instant zero-config local run.
- **Verification**: Run Prisma migrations/db push and verify database seed script inserts clean relational records.

---

## Phase 4: Core Transaction Engine & Legacy Data Migration
- **Deliverables**:
  - Transaction CRUD API (`/api/transactions`) with Zod validation.
  - Fast Transaction Entry UI with smart keyboard shortcuts (`Cmd/Ctrl+K`, quick-add modal).
  - Natural Language Quick Entry parser with visual preview and verification before saving.
  - Legacy `localStorage` automatic migration adapter to preserve legacy data without loss.
- **Verification**: Unit tests for minor-unit transaction calculations; verify legacy localStorage data is migrated correctly.

---

## Phase 5: Multi-Account, Categories & Tags
- **Deliverables**:
  - Account management (Checking, Savings, Credit Card, Cash, Wallet) with live balance recalculation.
  - Category manager (Income vs Expense, custom icons, color tokens).
  - Transfer transaction workflow (with dual-account reconciliation preventing double counting).
- **Verification**: Balance integrity test suite verifying transfer debits/credits remain in zero-sum balance.

---

## Phase 6: Executive Dashboard & Interactive Analytics
- **Deliverables**:
  - Executive Financial Summary cards (Total Balance, Monthly Income, Monthly Expenses, Net Savings Rate).
  - Cash flow visualization and spending trends over time.
  - Category spending breakdown with interactive distribution charts.
  - Recent transactions list with fast inline filtering.
- **Verification**: Cross-check dashboard aggregates against database records with 100% precision.

---

## Phase 7: Budgets, Recurring Payments & Subscriptions
- **Deliverables**:
  - Monthly category budget planner with visual progress bars, remaining amounts, and overspend warnings.
  - Recurring transactions / subscription manager (frequency: Daily, Weekly, Monthly, Yearly).
  - Automated next-date projection and upcoming bill alerts.
- **Verification**: Date edge-case tests (month-end rollover, leap years) for recurring schedules.

---

## Phase 8: Search, Multi-Facet Filtering & URL State Persistence
- **Deliverables**:
  - Real-time search by payee, category, account, tags, and notes.
  - Advanced filter bar: Date range picker, min/max amount, transaction type.
  - URL query parameter synchronization (`?search=...&type=EXPENSE&category=...`) for shareable, bookmarkable views.
- **Verification**: Filter unit tests and URL state synchronization tests.

---

## Phase 9: Executive-Grade Monthly PDF Reporting Engine (`pdf-lib`)
- **Deliverables**:
  - Serverless / client-compatible vector PDF generator built with `pdf-lib`.
  - Header: Period, generated timestamp, organization/user branding, currency indicator.
  - Key financial metrics: Total Income, Total Expense, Net Cash Flow, Savings Rate.
  - Budget performance table with variance calculation.
  - Category spending distribution table.
  - Paginated transaction ledger with repeated table headers, alternating row colors, and `Page X of Y` footers.
  - Monthly Report View page with instant preview and download.
- **Verification**: PDF generation stress test with 50+ transactions ensuring layout math and page breaks are flawless.

---

## Phase 10: Group Expense Splitting (Modernized Legacy Mode)
- **Deliverables**:
  - Modernized dedicated `/split` module preserving and upgrading the legacy "Expense Mode".
  - Multi-member expense management with equal and unequal share splits.
  - Automated debt simplification algorithm ("who owes whom" with minimal settlement transactions).
- **Verification**: Algorithmic unit tests for multi-member split mathematics and zero-remainder invariant.

---

## Phase 11: Data Import / Export & Backup System
- **Deliverables**:
  - CSV Export for all transactions and accounts.
  - CSV Import with schema mapping, preview, and duplicate transaction detection.
  - Full JSON backup and restore utility.
- **Verification**: Roundtrip import/export test: Export JSON -> Wipe database -> Import JSON -> Verify ledger matches 100%.

---

## Phase 12: Offline Resilience & Security Hardening
- **Deliverables**:
  - IndexedDB cache integration via TanStack Query persistence.
  - Security review: OWASP Top 10 hardening, Zod input sanitization, security headers, parameterized DB queries.
  - WCAG 2.2 AA accessibility audit: Keyboard navigation, focus rings, ARIA roles, screen-reader text.
- **Verification**: Run security scans and keyboard navigation testing.

---

## Phase 13: Final Visual Quality Audit & Production Build
- **Deliverables**:
  - Visual polish pass across all screens in Light and Dark modes.
  - Responsive verification on Mobile (375px), Tablet (768px), and Desktop (1440px+).
  - Full production build (`npm run build`).
  - Update `README.md` with modern documentation, architecture diagrams, and run commands.
- **Verification**: Clean build, 0 TypeScript errors, 100% test pass rate, fully responsive.
