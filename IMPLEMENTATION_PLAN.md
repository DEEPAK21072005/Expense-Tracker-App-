# Production Hardening Plan

1. Replace anonymous/default-user access and demo seeding with account creation, sign-in/out, secure sessions, route protection, and user ownership checks.
2. Move the Prisma model to durable PostgreSQL and minor-unit money fields; remove deploy-time schema mutation and seed behavior.
3. Rework transaction, account, budget, recurring, split, backup, and report endpoints around authenticated user data and transaction-safe balances.
4. Deliver a clean first-run experience: a welcome dashboard and guided account/category creation instead of fabricated data.
5. Repair theme initialization/toggling and refine the warm, restrained light/dark visual system across desktop and mobile.
6. Add tests for money parsing, authentication/session behavior, ownership enforcement, transaction balance reversal, report totals, empty states, and critical API failures.
7. Run type checking, tests, production build, local browser journeys, accessibility checks, and a mobile viewport pass. Update `FINAL_AUDIT.md`, `README.md`, and deployment configuration from verified results.
