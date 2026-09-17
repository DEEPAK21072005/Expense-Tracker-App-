# Migration Notes

## Legacy risks removed

- The legacy single-file app and its browser `localStorage` ledger are not a safe persistence model for a multi-user financial product.
- Demo accounts, categories, transactions, budgets, and split data are removed. Builds and deployments never seed user-facing financial data.
- Anonymous `findFirst()` users and unscoped API access are replaced by authenticated server-side sessions and ownership checks.
- Floating-point database amounts and balances are replaced by integer minor units.
- SQLite copied to `/tmp` is removed. A Vercel deployment requires a hosted PostgreSQL database so data survives serverless invocations and deployments.

## Data migration policy

This is a clean launch. Existing sample data is intentionally not migrated. A future import endpoint will accept only a validated, previewed backup for the signed-in owner; it will not silently merge malformed or duplicate records.

## Deployment migration

1. Provision a PostgreSQL database and add `DATABASE_URL` and `DIRECT_URL` to Vercel.
2. Add a unique `SESSION_SECRET` to Vercel.
3. Run `prisma migrate deploy` against the production database.
4. Deploy the application. The build performs no schema push and no seed operation.
