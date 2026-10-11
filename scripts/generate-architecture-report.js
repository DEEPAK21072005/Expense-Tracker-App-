// scripts/generate-architecture-report.js
// Generates a comprehensive, executive-grade Architecture & Project Info PDF using pdf-lib
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

async function createArchitectureReport() {
  const pdfDoc = await PDFDocument.create();
  
  // Embed standard typography fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Palette definitions
  const cPrimary = rgb(0.06, 0.09, 0.16);     // #0f172a (Deep Slate)
  const cAccent = rgb(0.15, 0.39, 0.92);      // #2563eb (Brand Blue)
  const cAccentLight = rgb(0.93, 0.96, 1.0);  // #eff6ff (Soft Blue Fill)
  const cTextDark = rgb(0.09, 0.12, 0.18);    // #171f2e
  const cTextMuted = rgb(0.39, 0.45, 0.55);   // #64748b
  const cBorder = rgb(0.85, 0.89, 0.93);      // #dbe2ea
  const cCardBg = rgb(0.97, 0.98, 0.99);      // #f8fafc
  const cSuccess = rgb(0.09, 0.64, 0.29);     // #16a34a
  const cWhite = rgb(1.0, 1.0, 1.0);

  const PAGE_WIDTH = 595.28;  // A4 Standard
  const PAGE_HEIGHT = 841.89;
  const MARGIN = 40;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  let currentPage;
  let cursorY;
  let pageNumber = 0;
  const pages = [];

  function addPage() {
    currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pageNumber++;
    pages.push(currentPage);
    cursorY = PAGE_HEIGHT - MARGIN;

    // Running Header (except page 1)
    if (pageNumber > 1) {
      currentPage.drawText('EXPENSE TRACKER PRO -- SYSTEM ARCHITECTURE SPECIFICATION', {
        x: MARGIN,
        y: PAGE_HEIGHT - 28,
        size: 8,
        font: helveticaBold,
        color: cTextMuted,
      });
      currentPage.drawLine({
        start: { x: MARGIN, y: PAGE_HEIGHT - 34 },
        end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 34 },
        thickness: 0.5,
        color: cBorder,
      });
      cursorY = PAGE_HEIGHT - 55;
    }
    return currentPage;
  }

  function checkPageBreak(neededSpace) {
    if (cursorY - neededSpace < MARGIN + 40) {
      addPage();
    }
  }

  function drawSectionHeader(title, subtitle) {
    checkPageBreak(50);
    currentPage.drawRectangle({
      x: MARGIN,
      y: cursorY - 2,
      width: 4,
      height: 18,
      color: cAccent,
    });
    currentPage.drawText(title, {
      x: MARGIN + 12,
      y: cursorY,
      size: 15,
      font: helveticaBold,
      color: cPrimary,
    });
    cursorY -= 20;

    if (subtitle) {
      currentPage.drawText(subtitle, {
        x: MARGIN + 12,
        y: cursorY,
        size: 9.5,
        font: helvetica,
        color: cTextMuted,
      });
      cursorY -= 16;
    }
  }

  function drawParagraph(text, options = {}) {
    const size = options.size || 9.5;
    const font = options.font || helvetica;
    const color = options.color || cTextDark;
    const lineSpacing = options.lineSpacing || 13;
    const maxWidth = options.maxWidth || CONTENT_WIDTH;

    // Simple word wrapping
    const words = text.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = font.widthOfTextAtSize(testLine, size);

      if (textWidth > maxWidth && currentLine) {
        checkPageBreak(lineSpacing);
        currentPage.drawText(currentLine, {
          x: options.x || MARGIN,
          y: cursorY,
          size,
          font,
          color,
        });
        cursorY -= lineSpacing;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      checkPageBreak(lineSpacing);
      currentPage.drawText(currentLine, {
        x: options.x || MARGIN,
        y: cursorY,
        size,
        font,
        color,
      });
      cursorY -= lineSpacing;
    }
  }

  function drawBullet(title, description) {
    checkPageBreak(28);
    const bulletX = MARGIN + 8;
    const textX = MARGIN + 22;

    currentPage.drawCircle({
      x: bulletX + 3,
      y: cursorY + 3,
      size: 2.5,
      color: cAccent,
    });

    const titleWidth = helveticaBold.widthOfTextAtSize(`${title}: `, 9.5);
    currentPage.drawText(`${title}: `, {
      x: textX,
      y: cursorY,
      size: 9.5,
      font: helveticaBold,
      color: cPrimary,
    });

    drawParagraph(description, {
      x: textX + titleWidth,
      maxWidth: CONTENT_WIDTH - (textX + titleWidth - MARGIN),
      lineSpacing: 12,
    });
    cursorY -= 4;
  }

  function drawCard(x, y, w, h, title, value, desc) {
    currentPage.drawRectangle({
      x,
      y: y - h,
      width: w,
      height: h,
      color: cCardBg,
      borderColor: cBorder,
      borderWidth: 1,
    });

    currentPage.drawText(title.toUpperCase(), {
      x: x + 12,
      y: y - 18,
      size: 7.5,
      font: helveticaBold,
      color: cTextMuted,
    });

    currentPage.drawText(value, {
      x: x + 12,
      y: y - 36,
      size: 13,
      font: helveticaBold,
      color: cPrimary,
    });

    currentPage.drawText(desc, {
      x: x + 12,
      y: y - 50,
      size: 8,
      font: helvetica,
      color: cTextMuted,
    });
  }

  // ==========================================
  // PAGE 1: TITLE, COVER & EXECUTIVE SUMMARY
  // ==========================================
  addPage();

  // Top banner bar
  currentPage.drawRectangle({
    x: MARGIN,
    y: cursorY - 100,
    width: CONTENT_WIDTH,
    height: 100,
    color: cPrimary,
  });

  currentPage.drawText('SYSTEM ARCHITECTURE & TECHNICAL SPECIFICATION', {
    x: MARGIN + 20,
    y: cursorY - 32,
    size: 9,
    font: helveticaBold,
    color: rgb(0.58, 0.77, 0.99),
  });

  currentPage.drawText('Expense Tracker Pro', {
    x: MARGIN + 20,
    y: cursorY - 62,
    size: 24,
    font: helveticaBold,
    color: cWhite,
  });

  currentPage.drawText('Production-Grade Personal Finance, Multi-Account Ledger & Analytics Platform', {
    x: MARGIN + 20,
    y: cursorY - 82,
    size: 10,
    font: helvetica,
    color: rgb(0.85, 0.91, 0.98),
  });

  cursorY -= 120;

  // Metadata Grid
  const metaY = cursorY;
  const colW = CONTENT_WIDTH / 4;
  drawCard(MARGIN, metaY, colW - 6, 60, 'Author', 'Deepak Polisetti', 'Lead Developer');
  drawCard(MARGIN + colW, metaY, colW - 6, 60, 'Release', 'Version 2.0.0', 'Production-Grade');
  drawCard(MARGIN + colW * 2, metaY, colW - 6, 60, 'Deployment', 'Render Cloud', 'Live & Persistent');
  drawCard(MARGIN + colW * 3, metaY, colW - 6, 60, 'Database', 'PostgreSQL', 'Managed Instance');

  cursorY -= 80;

  // Live URL Callout Box
  currentPage.drawRectangle({
    x: MARGIN,
    y: cursorY - 32,
    width: CONTENT_WIDTH,
    height: 32,
    color: cAccentLight,
    borderColor: cAccent,
    borderWidth: 1,
  });
  currentPage.drawText('LIVE PRODUCTION APP:', {
    x: MARGIN + 14,
    y: cursorY - 20,
    size: 8.5,
    font: helveticaBold,
    color: cAccent,
  });
  currentPage.drawText('https://expense-tracker-pro-3hon.onrender.com', {
    x: MARGIN + 140,
    y: cursorY - 20,
    size: 9.5,
    font: helveticaBold,
    color: cPrimary,
  });
  cursorY -= 50;

  // Executive Summary
  drawSectionHeader('1. Executive Summary & Transformation', 'Evolution from a legacy static prototype to an enterprise-grade web application');
  drawParagraph(
    'Expense Tracker Pro represents a comprehensive architectural modernization of personal finance management. Originally conceived as a single-page static HTML prototype relying on unstyled client-side localStorage and basic floating-point arithmetic, the platform has been systematically re-engineered into a full-stack, production-grade Next.js 15 application running React 19, TypeScript 5, and Prisma ORM.'
  );
  cursorY -= 6;
  drawParagraph(
    'The application solves foundational data integrity challenges inherent in personal finance software: floating-point currency drift, unauthenticated ephemeral storage, and naive bill-splitting logic. The modernized platform introduces integer minor-unit financial arithmetic, double-entry account balancing, a greedy debt minimization graph engine, and server-rendered vector PDF statements.'
  );

  cursorY -= 15;

  // Key Architectural Pillars
  drawSectionHeader('2. Core Architectural Pillars', 'Guiding engineering principles ensuring reliability, privacy, and precision');
  drawBullet('Integer Minor-Unit Math', 'Monetary amounts are stored exclusively as integer minor units (paise/cents in amountMinor). This completely eliminates JavaScript floating-point rounding discrepancies (e.g., 0.1 + 0.2 = 0.30000000000000004) across all aggregations, balance recalculations, and reporting.');
  drawBullet('Double-Entry Balance Integrity', 'Every transaction atomically adjusts the source account balance inside transactional database operations. Deleting, updating, or creating transactions recalculates account balances with zero race conditions.');
  drawBullet('Greedy Debt Minimization', 'The shared group split module computes an optimal debt settlement graph that reduces N-party shared expenses to the absolute minimum number of peer-to-peer transfers.');
  drawBullet('Client-Side & Server PDF Engine', 'Utilizes pure TypeScript pdf-lib for vector monthly financial statements with repeated table headers, KPI summary cards, and alternating row styling with zero native OS dependencies.');
  drawBullet('Clean Slate Guarantee', 'Strictly zero dummy transactions or artificial balances are seeded. New users start with a clean ledger and 11 standard expense categories.');

  // ==========================================
  // PAGE 2: SYSTEM ARCHITECTURE & COMPONENTS
  // ==========================================
  addPage();

  drawSectionHeader('3. High-Level System Architecture', 'Three-tier decoupled full-stack architecture');
  drawParagraph(
    'The platform is structured into three decoupled layers designed for high availability, low latency, and zero data loss on restart:'
  );
  cursorY -= 10;

  // Visual Architecture Diagram Box
  const diagH = 150;
  currentPage.drawRectangle({
    x: MARGIN,
    y: cursorY - diagH,
    width: CONTENT_WIDTH,
    height: diagH,
    color: cCardBg,
    borderColor: cBorder,
    borderWidth: 1,
  });

  // Layer 1: Client
  currentPage.drawRectangle({ x: MARGIN + 15, y: cursorY - 40, width: CONTENT_WIDTH - 30, height: 30, color: rgb(0.9, 0.94, 1.0) });
  currentPage.drawText('CLIENT TIER: Next.js 15 App Router | React 19 | Tailwind CSS v4 | PWA Standalone Manifest', {
    x: MARGIN + 25, y: cursorY - 28, size: 8.5, font: helveticaBold, color: cAccent,
  });

  // Down Arrow
  currentPage.drawText('| v  HTTPS / REST JSON API / HTTP-Only HMAC Cookies', {
    x: MARGIN + 130, y: cursorY - 50, size: 7.5, font: helveticaBold, color: cTextMuted,
  });

  // Layer 2: Server
  currentPage.drawRectangle({ x: MARGIN + 15, y: cursorY - 90, width: CONTENT_WIDTH - 30, height: 35, color: rgb(0.94, 0.97, 0.95) });
  currentPage.drawText('API & LOGIC TIER: Next.js Route Handlers | Zod Validation | Minor-Unit Money Engine | pdf-lib Generator', {
    x: MARGIN + 25, y: cursorY - 73, size: 8, font: helveticaBold, color: cSuccess,
  });
  currentPage.drawText('Session Middleware (Base64URL HMAC-SHA256) | Greedy Debt Minimizer | Assistive NLP Quick Entry', {
    x: MARGIN + 25, y: cursorY - 84, size: 7.5, font: helvetica, color: cTextDark,
  });

  // Down Arrow
  currentPage.drawText('| v  Prisma ORM (Connection Pool / Dynamic Provider Switcher)', {
    x: MARGIN + 120, y: cursorY - 100, size: 7.5, font: helveticaBold, color: cTextMuted,
  });

  // Layer 3: Storage
  currentPage.drawRectangle({ x: MARGIN + 15, y: cursorY - 140, width: CONTENT_WIDTH - 30, height: 32, color: rgb(0.98, 0.93, 0.93) });
  currentPage.drawText('PERSISTENCE TIER: Managed PostgreSQL (Render Production) / Local SQLite (Dev Fallback)', {
    x: MARGIN + 25, y: cursorY - 126, size: 8.5, font: helveticaBold, color: rgb(0.75, 0.15, 0.15),
  });
  currentPage.drawText('Persistent disk volume storage with zero cold-start data wipeout', {
    x: MARGIN + 25, y: cursorY - 136, size: 7.5, font: helvetica, color: cTextMuted,
  });

  cursorY -= (diagH + 20);

  drawSectionHeader('4. Functional Module Breakdown', 'Core modules delivering comprehensive personal wealth tracking');
  
  drawBullet('Dashboard (/)', 'Real-time financial summary displaying aggregated Net Worth across all accounts, Month-to-date Income, Expenses, Net Cash Flow, Savings Rate percentage, and category distribution charts.');
  drawBullet('Multi-Account Ledger (/accounts)', 'Support for Checking, Savings, Credit Cards, Cash, and Investment accounts. Provides individual account balances, currency assignment, and atomic recalculations.');
  drawBullet('Transaction Management (/transactions)', 'Full transactional ledger with real-time fuzzy search, multi-facet filtering (Type, Category, Account), and instant CSV data export.');
  drawBullet('Natural Language Quick-Add', 'Global hotkey (N or Cmd+K) allowing users to type freeform expressions like "INR 4,500 dinner yesterday" or "$45 groceries today" with instant entity extraction.');
  drawBullet('Monthly Budgets (/budgets)', 'Category spending limits with visual progress indicators and status badges (Healthy <80%, Warning 80-100%, Exceeded >100%) and automatic currency formatting.');
  drawBullet('Group Expense Splitter (/split)', 'Multi-party bill settlement engine for shared group events, trips, or roommates. Computes optimal debt cancellation to settle all debts with minimal transactions.');
  drawBullet('Subscriptions & Recurring (/recurring)', 'Monitors recurring subscriptions with upcoming renewal countdowns and projected monthly commitments.');
  drawBullet('Monthly Reports & Vector PDF (/reports)', 'Dynamic month/year report generator providing on-demand vector PDF statements with executive KPI summary cards and paginated transaction ledgers.');
  drawBullet('Settings & Themes (/settings)', 'Zero-flicker light and dark mode toggling, full JSON data export and import for complete data sovereignty.');

  // ==========================================
  // PAGE 3: DATA MODEL, SECURITY & DEPLOYMENT
  // ==========================================
  addPage();

  drawSectionHeader('5. Database Entity Relationship Model', 'Normalized relational schema managed via Prisma ORM');

  // Table of Entities
  const entities = [
    { name: 'User', desc: 'Primary account identity, hashed password (bcrypt), base currency, preferences' },
    { name: 'Account', desc: 'Financial accounts (Checking, Savings, Credit, Cash) with balanceMinor' },
    { name: 'Category', desc: 'Expense and income classifications with custom color and icon tokens' },
    { name: 'Transaction', desc: 'Individual ledger entries with amountMinor, type, date, payee, and notes' },
    { name: 'Budget', desc: 'Monthly spending limits per category with limitMinor and variance monitors' },
    { name: 'Group', desc: 'Shared expense groups with members and currency definitions' },
    { name: 'GroupExpense', desc: 'Multi-member shared bills with custom exact-cent share allocation' },
    { name: 'Subscription', desc: 'Recurring bill commitments, billing frequency, and next due date' },
    { name: 'UserPreference', desc: 'Theme mode (Light/Dark/System), notification preferences, date formatting' },
  ];

  let tblY = cursorY;
  currentPage.drawRectangle({
    x: MARGIN,
    y: tblY - 18,
    width: CONTENT_WIDTH,
    height: 18,
    color: cPrimary,
  });
  currentPage.drawText('ENTITY', { x: MARGIN + 10, y: tblY - 13, size: 8, font: helveticaBold, color: cWhite });
  currentPage.drawText('DESCRIPTION & INTEGRITY CONSTRAINTS', { x: MARGIN + 120, y: tblY - 13, size: 8, font: helveticaBold, color: cWhite });

  tblY -= 18;
  entities.forEach((ent, i) => {
    const rowBg = i % 2 === 0 ? cWhite : cCardBg;
    currentPage.drawRectangle({
      x: MARGIN,
      y: tblY - 16,
      width: CONTENT_WIDTH,
      height: 16,
      color: rowBg,
      borderColor: cBorder,
      borderWidth: 0.5,
    });
    currentPage.drawText(ent.name, { x: MARGIN + 10, y: tblY - 12, size: 8, font: helveticaBold, color: cAccent });
    currentPage.drawText(ent.desc, { x: MARGIN + 120, y: tblY - 12, size: 7.5, font: helvetica, color: cTextDark });
    tblY -= 16;
  });

  cursorY = tblY - 20;

  drawSectionHeader('6. Security, Authentication & Data Protection', 'Hardened multi-layered application security');
  drawBullet('Cryptographic Password Hashing', 'Passwords are salted and hashed using bcryptjs with a cost factor of 10. Passwords are never stored in plaintext.');
  drawBullet('URL-Safe Session Tokens', 'Authentication utilizes Base64URL-encoded HMAC-SHA256 tokens storing user identity and expiration. Delimiters prevent dot-collision in email usernames.');
  drawBullet('HTTP-Only Cookie Storage', 'Session cookies are configured with HttpOnly, Secure (in production), SameSite=Lax flags, preventing JavaScript access and protecting against XSS/CSRF attacks.');
  drawBullet('SQL Injection Immunization', 'All queries are fully parameterized through Prisma ORM prepared statements, preventing SQL injection.');

  cursorY -= 10;

  drawSectionHeader('7. Production Cloud Infrastructure on Render', 'DevOps, database persistence, and automated CI/CD');
  drawParagraph(
    'The production application is deployed on Render using native Infrastructure-as-Code (render.yaml):'
  );
  drawBullet('Managed PostgreSQL Database', 'Database expense-tracker-db provides persistent relational storage. Data persists permanently across application rebuilds, cold starts, and container migrations.');
  drawBullet('Dynamic Provider Switcher', 'scripts/switch-db.js automatically inspects the active DATABASE_URL. In cloud environments with PostgreSQL, it switches the Prisma schema provider and applies migrations via prisma db push. In local development, it seamlessly falls back to SQLite.');
  drawBullet('PWA & Desktop Shortcuts', 'Complete Web Manifest (/manifest.webmanifest) and high-resolution icons (16x16, 32x32, 180x180, 192x192, 512x512 maskable) enable native desktop and mobile installation.');

  // ==========================================
  // RUNNING FOOTERS ON ALL PAGES
  // ==========================================
  const totalPages = pages.length;
  pages.forEach((p, idx) => {
    p.drawLine({
      start: { x: MARGIN, y: 35 },
      end: { x: PAGE_WIDTH - MARGIN, y: 35 },
      thickness: 0.5,
      color: cBorder,
    });
    p.drawText('Expense Tracker Pro -- Confidential & Proprietary Technical Report', {
      x: MARGIN,
      y: 22,
      size: 7.5,
      font: helveticaOblique,
      color: cTextMuted,
    });
    p.drawText(`Page ${idx + 1} of ${totalPages}`, {
      x: PAGE_WIDTH - MARGIN - 50,
      y: 22,
      size: 7.5,
      font: helveticaBold,
      color: cTextMuted,
    });
  });

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join('C:\\Users\\polis\\Downloads', 'Expense_Tracker_Pro_Architecture_Report.pdf');
  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`Report successfully created at: ${outputPath}`);
  console.log(`Total Pages: ${totalPages}, Size: ${(pdfBytes.length / 1024).toFixed(1)} KB`);
}

createArchitectureReport().catch(err => {
  console.error('Error generating architecture report:', err);
  process.exit(1);
});
