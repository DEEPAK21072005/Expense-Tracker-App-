# Architectural & Technical Decisions (ADR)

## Decision 1: Next.js App Router (v15/v16) with TypeScript over Vanilla JS or Pure SPA

- **Context**: The legacy project is a vanilla HTML/JS static page. The research PDF specifies a transition to a modern React ecosystem.
- **Options Considered**:
  1. Plain Vite + React SPA
  2. Next.js App Router (Full-stack SSR/SSG + Route Handlers)
  3. Remix / React Router v7
- **Decision**: **Next.js App Router with TypeScript**.
- **Rationale**: Next.js combines client components with server-side route handlers (`/api/...`) in a single deployable unit. It eliminates CORS complexity, provides built-in SEO and fast SSR hydration, and offers first-class serverless deployment on Vercel or Node. TypeScript guarantees financial calculations and API contracts are type-safe.

---

## Decision 2: Minor-Unit Integer Money Math over Floating-Point Numbers

- **Context**: In JavaScript, `0.1 + 0.2 === 0.30000000000000004`. The legacy code used `parseFloat` directly on currency amounts, which accumulates rounding discrepancies over time.
- **Options Considered**:
  1. Standard JavaScript `number` with `toFixed(2)`
  2. Heavy third-party library (`decimal.js` or `dinero.js`)
  3. Internal Integer Minor-Unit Math (`amountMinor: integer cents/paise`)
- **Decision**: **Internal Integer Minor-Unit Math** with a dedicated `Money` abstraction.
- **Rationale**:
  - Eliminates floating-point errors entirely by storing e.g. ₹150.50 as `15050` (integer).
  - Keeps the dependency graph lightweight without sacrificing precision.
  - Guarantees exact split rounding by allocating residual indivisible minor units deterministically.

---

## Decision 3: PDF Generation via `pdf-lib` over `jsPDF` or `Puppeteer`

- **Context**: The legacy app used `jspdf` from a CDN to render unstyled text lines, which clipped on more than 10 entries and could not format tables or pages. The PDF spec calls for high-quality monthly reports.
- **Options Considered**:
  1. `jspdf` + `html2canvas` (Screen capture hack)
  2. `Puppeteer` (Headless Chromium HTML-to-PDF)
  3. `pdf-lib` (Pure TypeScript/JavaScript vector PDF generator)
- **Decision**: **pdf-lib**.
- **Rationale**:
  - `Puppeteer` requires downloading a 300MB+ Chromium binary, which frequently fails or times out in serverless/edge environments and introduces significant memory overhead.
  - `html2canvas` produces blurry raster images that are not selectable or printable at high resolution.
  - `pdf-lib` is 100% pure TypeScript, operates with zero native binaries, executes in milliseconds, works in both browser and server environments, and generates crisp vector text, headers, footers, and tables.

---

## Decision 4: Relational Persistence with Prisma ORM (SQLite / PostgreSQL)

- **Context**: The legacy app relied on unindexed `localStorage`, losing all data if browser cache was cleared and offering zero relational capabilities.
- **Options Considered**:
  1. Supabase Postgres with Direct REST
  2. Prisma ORM with SQLite (Local) / PostgreSQL (Cloud)
  3. Raw SQL queries
- **Decision**: **Prisma ORM with SQLite for local development and PostgreSQL compatibility for production**.
- **Rationale**:
  - Prisma provides complete type safety, automated migrations, and schema validation.
  - SQLite enables immediate local execution without requiring the user to provision a cloud database or run local Docker containers.
  - The schema is designed for seamless switching to PostgreSQL (e.g. Supabase) by simply changing the `provider` in `prisma/schema.prisma` and updating `DATABASE_URL`.

---

## Decision 5: Design Philosophy — "Asian Apple" Minimalism with Soft Warmth

- **Context**: The user specified an Apple-like clarity + Japanese/Asian minimalism + soft premium warmth ("pookie") + serious financial usability, strictly avoiding generic Bootstrap or neon crypto SaaS designs.
- **Palette**:
  - Light mode: Crisp chalk/alabaster canvas (`#F8F9FA`), soft warm surfaces (`#FFFFFF`), subtle stone borders (`#E5E7EB`), deep obsidian text (`#111827`), slate secondary (`#6B7280`).
  - Dark mode: Matte obsidian canvas (`#0C0E12`), card surface (`#161920`), hairline border (`#262A34`), clean silver text (`#F3F4F6`).
  - Semantics: Primary Slate/Indigo (`#3B82F6`), Income Emerald (`#10B981`), Expense Warm Coral (`#EF4444`), Warning Amber (`#F59E0B`).
- **Typography & Layout**:
  - Inter / system sans-serif with `tabular-nums` for precise monetary alignment.
  - Generous whitespace, refined micro-shadows, 44px minimum touch targets, WCAG 2.2 AA contrast compliance.

---

## Decision 6: Natural Language Transaction Quick-Add

- **Context**: Users want rapid expense entry (e.g. "₹450 dinner at Seoul Kitchen yesterday").
- **Options Considered**:
  1. Cloud LLM API call on every keystroke (latency, cost, privacy, requires external API key)
  2. Heuristic rule-based token extractor with immediate structured preview
- **Decision**: **Assistive rule-based token extractor with transparent user confirmation**.
- **Rationale**:
  - Zero external API key dependencies or privacy leaks for sensitive financial data.
  - Zero latency (instant client-side parsing).
  - Ensures the user visually reviews and confirms the extracted amount, date, payee, and category before saving, upholding the strict rule: *AI must assist the user, not silently create incorrect financial records*.
