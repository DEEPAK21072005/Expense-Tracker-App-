-- Clean multi-user production launch. Generated from prisma/schema.prisma.
CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "User" (
  "id" TEXT NOT NULL, "email" TEXT NOT NULL, "name" TEXT NOT NULL, "passwordHash" TEXT NOT NULL,
  "baseCurrency" TEXT NOT NULL DEFAULT 'INR', "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata', "theme" TEXT NOT NULL DEFAULT 'system',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Session" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Account" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "name" TEXT NOT NULL, "type" TEXT NOT NULL DEFAULT 'BANK', "currency" TEXT NOT NULL DEFAULT 'INR',
  "balanceMinor" INTEGER NOT NULL DEFAULT 0, "isArchived" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Category" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "name" TEXT NOT NULL, "type" TEXT NOT NULL DEFAULT 'EXPENSE', "icon" TEXT NOT NULL DEFAULT 'tag',
  "color" TEXT NOT NULL DEFAULT '#64748B', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Transaction" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "accountId" TEXT NOT NULL, "toAccountId" TEXT, "categoryId" TEXT, "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR', "type" TEXT NOT NULL DEFAULT 'EXPENSE', "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payee" TEXT, "notes" TEXT, "tags" TEXT, "isRecurring" BOOLEAN NOT NULL DEFAULT false, "recurringPaymentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Budget" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "categoryId" TEXT, "amountMinor" INTEGER NOT NULL, "period" TEXT NOT NULL DEFAULT 'MONTHLY',
  "month" INTEGER, "year" INTEGER, "alertThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.85, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RecurringPayment" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "accountId" TEXT NOT NULL, "categoryId" TEXT, "description" TEXT NOT NULL, "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR', "frequency" TEXT NOT NULL DEFAULT 'MONTHLY', "nextDate" TIMESTAMP(3) NOT NULL, "lastProcessedDate" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecurringPayment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ExpenseSplitGroup" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ExpenseSplitGroup_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SplitMember" (
  "id" TEXT NOT NULL, "groupId" TEXT NOT NULL, "name" TEXT NOT NULL, "email" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SplitMember_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SplitExpense" (
  "id" TEXT NOT NULL, "groupId" TEXT NOT NULL, "paidById" TEXT NOT NULL, "description" TEXT NOT NULL, "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR', "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "splitType" TEXT NOT NULL DEFAULT 'EQUAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "SplitExpense_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SplitShare" (
  "id" TEXT NOT NULL, "splitExpenseId" TEXT NOT NULL, "memberId" TEXT NOT NULL, "shareMinor" INTEGER NOT NULL, "isSettled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "SplitShare_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Report" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "month" INTEGER NOT NULL, "year" INTEGER NOT NULL, "title" TEXT NOT NULL,
  "totalIncomeMinor" INTEGER NOT NULL DEFAULT 0, "totalExpenseMinor" INTEGER NOT NULL DEFAULT 0, "netSavingsMinor" INTEGER NOT NULL DEFAULT 0,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
CREATE INDEX "Account_userId_isArchived_idx" ON "Account"("userId", "isArchived");
CREATE UNIQUE INDEX "Account_userId_name_key" ON "Account"("userId", "name");
CREATE INDEX "Category_userId_type_idx" ON "Category"("userId", "type");
CREATE UNIQUE INDEX "Category_userId_name_type_key" ON "Category"("userId", "name", "type");
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");
CREATE INDEX "Transaction_userId_accountId_idx" ON "Transaction"("userId", "accountId");
CREATE INDEX "Transaction_userId_categoryId_idx" ON "Transaction"("userId", "categoryId");
CREATE INDEX "Budget_userId_year_month_idx" ON "Budget"("userId", "year", "month");
CREATE UNIQUE INDEX "Budget_userId_categoryId_month_year_key" ON "Budget"("userId", "categoryId", "month", "year");
CREATE INDEX "RecurringPayment_userId_nextDate_idx" ON "RecurringPayment"("userId", "nextDate");
CREATE INDEX "ExpenseSplitGroup_userId_idx" ON "ExpenseSplitGroup"("userId");
CREATE UNIQUE INDEX "ExpenseSplitGroup_userId_name_key" ON "ExpenseSplitGroup"("userId", "name");
CREATE INDEX "SplitMember_groupId_idx" ON "SplitMember"("groupId");
CREATE UNIQUE INDEX "SplitMember_groupId_name_key" ON "SplitMember"("groupId", "name");
CREATE INDEX "SplitExpense_groupId_date_idx" ON "SplitExpense"("groupId", "date");
CREATE INDEX "SplitShare_memberId_idx" ON "SplitShare"("memberId");
CREATE UNIQUE INDEX "SplitShare_splitExpenseId_memberId_key" ON "SplitShare"("splitExpenseId", "memberId");
CREATE INDEX "Report_userId_year_month_idx" ON "Report"("userId", "year", "month");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recurringPaymentId_fkey" FOREIGN KEY ("recurringPaymentId") REFERENCES "RecurringPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecurringPayment" ADD CONSTRAINT "RecurringPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringPayment" ADD CONSTRAINT "RecurringPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecurringPayment" ADD CONSTRAINT "RecurringPayment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExpenseSplitGroup" ADD CONSTRAINT "ExpenseSplitGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SplitMember" ADD CONSTRAINT "SplitMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ExpenseSplitGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SplitExpense" ADD CONSTRAINT "SplitExpense_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ExpenseSplitGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SplitExpense" ADD CONSTRAINT "SplitExpense_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "SplitMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SplitShare" ADD CONSTRAINT "SplitShare_splitExpenseId_fkey" FOREIGN KEY ("splitExpenseId") REFERENCES "SplitExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SplitShare" ADD CONSTRAINT "SplitShare_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "SplitMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
