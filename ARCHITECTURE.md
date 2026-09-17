# Architecture

## Purpose

Expense Tracker Pro is a multi-user personal-finance application. Every financial record belongs to an authenticated user; a new account begins with an empty ledger.

## Runtime boundaries

```text
Next.js App Router UI
        |
        v
Route handlers (authentication, validation, ownership checks)
        |
        v
Financial domain services (minor-unit arithmetic and date rules)
        |
        v
Prisma + PostgreSQL
```

- **UI:** Next.js 15, React 19, TypeScript, Tailwind CSS. Pages own presentation and temporary form state only.
- **API:** route handlers validate all input with Zod, obtain the current server-side session, then scope every query and mutation by `userId`.
- **Auth:** password hashes use `bcryptjs`; random session tokens are stored only as SHA-256 hashes and sent in a secure, HTTP-only, SameSite=Lax cookie.
- **Database:** PostgreSQL is the required hosted production store. `DATABASE_URL` is the pooled connection URL and `DIRECT_URL` is used for migration/administration. SQLite and filesystem databases are not production deployment options.
- **Financial model:** all stored monetary values are integer minor units (`amountMinor`, `balanceMinor`). Amount strings are parsed once at the HTTP boundary. Transfers are atomically posted to both owned accounts and excluded from income/expense reporting.
- **Reports:** PDF generation runs server-side from the same transaction queries and minor-unit aggregations used by the dashboard. It is never generated from a screen capture.

## Data ownership and integrity

`User` owns `Session`, `Account`, `Category`, `Transaction`, `Budget`, `RecurringPayment`, split groups, and generated report history. IDs supplied by clients are never trusted without an ownership-scoped lookup. Transaction creation, amendment, and deletion run in database transactions so the corresponding account balances stay consistent.

## UI system

The interface uses semantic color tokens for light and dark modes, compact Apple-inspired spacing, warm neutral surfaces, clear focus rings, and reduced-motion support. Theme choice is applied before hydration to prevent a flash and is stored per user when signed in.

## Environment

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
SESSION_SECRET=a-long-random-secret
```

See `.env.example` and `README.md` for setup and deployment instructions.
