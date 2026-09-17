# Engineering Decisions

| Decision | Rationale |
| --- | --- |
| PostgreSQL for production | Durable, concurrent serverless-safe storage; local SQLite copied to a function's temporary filesystem loses data. |
| Custom credential sessions | Provides a small, auditable email/password flow without an OAuth dependency; session cookies are HTTP-only and token hashes are persisted. |
| Integer minor units | Prevents floating-point drift in balances, budgets, reports, and equal expense splits. |
| No automatic seed | Personal financial software must never present invented balances or transactions as a user's records. |
| Server-side PDF | The report uses authenticated, ownership-scoped source data and vector PDF output, not a client-side screenshot. |
| System/light/dark themes | Respect OS preference while allowing an explicit accessible preference with no hydration flash. |

Deferred: password-reset email and OAuth require a configured mail or identity provider. They are deliberately not faked in the product.
