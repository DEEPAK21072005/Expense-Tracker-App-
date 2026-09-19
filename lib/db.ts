import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

function ensureSqliteTables(filePath: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(filePath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT PRIMARY KEY,
        "email" TEXT UNIQUE NOT NULL,
        "name" TEXT NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "baseCurrency" TEXT NOT NULL DEFAULT 'INR',
        "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
        "theme" TEXT NOT NULL DEFAULT 'system',
        "passwordResetToken" TEXT,
        "passwordResetExpiry" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "tokenHash" TEXT UNIQUE NOT NULL,
        "expiresAt" DATETIME NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS "Account" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'BANK',
        "currency" TEXT NOT NULL DEFAULT 'INR',
        "balanceMinor" INTEGER NOT NULL DEFAULT 0,
        "isArchived" BOOLEAN NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS "Category" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'EXPENSE',
        "icon" TEXT NOT NULL DEFAULT 'tag',
        "color" TEXT NOT NULL DEFAULT '#64748B',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS "Transaction" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "accountId" TEXT NOT NULL,
        "toAccountId" TEXT,
        "categoryId" TEXT,
        "amountMinor" INTEGER NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'INR',
        "type" TEXT NOT NULL DEFAULT 'EXPENSE',
        "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "payee" TEXT,
        "notes" TEXT,
        "tags" TEXT,
        "isRecurring" BOOLEAN NOT NULL DEFAULT 0,
        "recurringPaymentId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
        FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT,
        FOREIGN KEY ("toAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT,
        FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL,
        FOREIGN KEY ("recurringPaymentId") REFERENCES "RecurringPayment"("id") ON DELETE SET NULL
      );
      CREATE TABLE IF NOT EXISTS "Budget" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "categoryId" TEXT,
        "amountMinor" INTEGER NOT NULL,
        "period" TEXT NOT NULL DEFAULT 'MONTHLY',
        "month" INTEGER,
        "year" INTEGER,
        "alertThreshold" REAL NOT NULL DEFAULT 0.85,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
        FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL
      );
      CREATE TABLE IF NOT EXISTS "RecurringPayment" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "accountId" TEXT NOT NULL,
        "categoryId" TEXT,
        "description" TEXT NOT NULL,
        "amountMinor" INTEGER NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'INR',
        "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
        "nextDate" DATETIME NOT NULL,
        "lastProcessedDate" DATETIME,
        "isActive" BOOLEAN NOT NULL DEFAULT 1,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
        FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT,
        FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL
      );
      CREATE TABLE IF NOT EXISTS "ExpenseSplitGroup" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS "SplitMember" (
        "id" TEXT PRIMARY KEY,
        "groupId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "email" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("groupId") REFERENCES "ExpenseSplitGroup"("id") ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS "SplitExpense" (
        "id" TEXT PRIMARY KEY,
        "groupId" TEXT NOT NULL,
        "paidById" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "amountMinor" INTEGER NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'INR',
        "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "splitType" TEXT NOT NULL DEFAULT 'EQUAL',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("groupId") REFERENCES "ExpenseSplitGroup"("id") ON DELETE CASCADE,
        FOREIGN KEY ("paidById") REFERENCES "SplitMember"("id") ON DELETE RESTRICT
      );
      CREATE TABLE IF NOT EXISTS "SplitShare" (
        "id" TEXT PRIMARY KEY,
        "splitExpenseId" TEXT NOT NULL,
        "memberId" TEXT NOT NULL,
        "shareMinor" INTEGER NOT NULL,
        "isSettled" BOOLEAN NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("splitExpenseId") REFERENCES "SplitExpense"("id") ON DELETE CASCADE,
        FOREIGN KEY ("memberId") REFERENCES "SplitMember"("id") ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS "Report" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "month" INTEGER NOT NULL,
        "year" INTEGER NOT NULL,
        "title" TEXT NOT NULL,
        "totalIncomeMinor" INTEGER NOT NULL DEFAULT 0,
        "totalExpenseMinor" INTEGER NOT NULL DEFAULT 0,
        "netSavingsMinor" INTEGER NOT NULL DEFAULT 0,
        "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
      CREATE UNIQUE INDEX IF NOT EXISTS "Session_tokenHash_key" ON "Session"("tokenHash");
      CREATE UNIQUE INDEX IF NOT EXISTS "Account_userId_name_key" ON "Account"("userId", "name");
      CREATE UNIQUE INDEX IF NOT EXISTS "Category_userId_name_type_key" ON "Category"("userId", "name", "type");
      CREATE UNIQUE INDEX IF NOT EXISTS "Budget_userId_categoryId_month_year_key" ON "Budget"("userId", "categoryId", "month", "year");
      CREATE UNIQUE INDEX IF NOT EXISTS "ExpenseSplitGroup_userId_name_key" ON "ExpenseSplitGroup"("userId", "name");
      CREATE UNIQUE INDEX IF NOT EXISTS "SplitMember_groupId_name_key" ON "SplitMember"("groupId", "name");
      CREATE UNIQUE INDEX IF NOT EXISTS "SplitShare_splitExpenseId_memberId_key" ON "SplitShare"("splitExpenseId", "memberId");
    `);
    db.close();
    console.log(`[Database] Initialized SQLite tables in ${filePath}`);
  } catch (err) {
    console.error('[Database] Failed running SQLite DDL:', err);
  }
}

function prepareDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (url && (url.startsWith('postgres://') || url.startsWith('postgresql://'))) {
    // Hosted PostgreSQL (Neon, Supabase, Vercel Postgres) — use connection string directly
    return;
  }

  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);

  if (isServerless) {
    // Vercel serverless /var/task is read-only; SQLite must be in /tmp
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:')) {
      process.env.DATABASE_URL = 'file:/tmp/dev.db';
    }
  } else if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = process.env.NODE_ENV === 'production' ? 'file:/tmp/dev.db' : 'file:./dev.db';
  }

  const fileUrl = process.env.DATABASE_URL;
  if (fileUrl && fileUrl.startsWith('file:')) {
    const rawPath = fileUrl.replace(/^file:/, '');
    const isTmp = rawPath.startsWith('/tmp') || rawPath.startsWith('\\tmp');
    if (isTmp) {
      try {
        const dir = path.dirname(rawPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(rawPath) || fs.statSync(rawPath).size === 0) {
          const candidates = [
            path.join(process.cwd(), 'prisma', 'template.db'),
            path.join(process.cwd(), 'prisma', 'dev.db'),
            path.resolve('prisma/template.db'),
            path.resolve('prisma/dev.db'),
            path.join(__dirname, '..', '..', 'prisma', 'template.db'),
            path.join(__dirname, '..', 'prisma', 'template.db'),
          ];
          let copied = false;
          for (const candidate of candidates) {
            try {
              if (fs.existsSync(candidate) && fs.statSync(candidate).size > 0) {
                fs.copyFileSync(candidate, rawPath);
                console.log(`[Database] Initialized SQLite at ${rawPath} from template (${candidate})`);
                copied = true;
                break;
              }
            } catch {
              // try next candidate
            }
          }
          if (!copied) {
            // Fallback: create fresh database file and run full schema DDL
            ensureSqliteTables(rawPath);
          }
        }
      } catch (err) {
        console.error('[Database] Failed preparing SQLite in /tmp:', err);
      }
    }
  }
}

prepareDatabaseUrl();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
