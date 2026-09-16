import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { formatCurrency } from './money';

export interface MonthlyReportData {
  periodMonth: number;
  periodYear: number;
  currency: string;
  userName: string;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number; // percentage, e.g. 24.5
  categories: Array<{
    name: string;
    type: 'EXPENSE' | 'INCOME';
    total: number;
    percentage: number;
  }>;
  budgets: Array<{
    categoryName: string;
    limit: number;
    spent: number;
    variance: number;
    percentUsed: number;
  }>;
  transactions: Array<{
    date: Date | string;
    payee: string;
    category: string;
    account: string;
    type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
    amount: number;
  }>;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatPdfCurrency(amount: number, currency: string = 'INR'): string {
  const formatted = formatCurrency(amount, currency);
  return formatted
    .replace(/₹/g, 'INR ')
    .replace(/€/g, 'EUR ')
    .replace(/£/g, 'GBP ')
    .replace(/¥/g, 'JPY ')
    .replace(/[^\x20-\x7E]/g, '');
}

export async function generateExecutiveMonthlyPdf(data: MonthlyReportData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN = 40;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  // Colors
  const darkNavy = rgb(0.08, 0.12, 0.2);
  const mutedText = rgb(0.42, 0.46, 0.52);
  const borderGrey = rgb(0.88, 0.9, 0.93);
  const zebraBg = rgb(0.97, 0.98, 0.99);
  const emeraldGreen = rgb(0.05, 0.58, 0.35);
  const coralRed = rgb(0.85, 0.22, 0.22);
  const slateCard = rgb(0.95, 0.96, 0.98);

  const monthName = MONTH_NAMES[data.periodMonth - 1] || 'Current Month';
  const reportTitle = `Monthly Financial Statement — ${monthName} ${data.periodYear}`;

  let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function drawHeader(page: typeof currentPage, pageNum: number) {
    // Header banner
    page.drawText('EXPENSE TRACKER PRO', {
      x: MARGIN,
      y: PAGE_HEIGHT - 30,
      size: 9,
      font: fontBold,
      color: darkNavy,
    });

    const timestamp = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    page.drawText(`Generated: ${timestamp}`, {
      x: PAGE_WIDTH - MARGIN - 110,
      y: PAGE_HEIGHT - 30,
      size: 8,
      font: fontRegular,
      color: mutedText,
    });

    // Thin hairline
    page.drawLine({
      start: { x: MARGIN, y: PAGE_HEIGHT - 36 },
      end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 36 },
      thickness: 0.5,
      color: borderGrey,
    });
  }

  function drawFooter(page: typeof currentPage, pageNum: number) {
    // Footer hairline
    page.drawLine({
      start: { x: MARGIN, y: 36 },
      end: { x: PAGE_WIDTH - MARGIN, y: 36 },
      thickness: 0.5,
      color: borderGrey,
    });

    page.drawText('Confidential & Private Personal Financial Record', {
      x: MARGIN,
      y: 24,
      size: 8,
      font: fontRegular,
      color: mutedText,
    });

    const pageStr = `Page ${pageNum}`;
    page.drawText(pageStr, {
      x: PAGE_WIDTH - MARGIN - 35,
      y: 24,
      size: 8,
      font: fontRegular,
      color: mutedText,
    });
  }

  // Draw Page 1 Header
  drawHeader(currentPage, 1);
  y -= 25;

  // Title Block
  currentPage.drawText(reportTitle, {
    x: MARGIN,
    y: y,
    size: 18,
    font: fontBold,
    color: darkNavy,
  });
  y -= 14;

  currentPage.drawText(`Prepared for: ${data.userName} | Base Currency: ${data.currency}`, {
    x: MARGIN,
    y: y,
    size: 10,
    font: fontRegular,
    color: mutedText,
  });
  y -= 30;

  // 1. Executive Summary Cards (4 Columns)
  const cardWidth = (CONTENT_WIDTH - 24) / 4;
  const cardHeight = 52;
  const summaryCards = [
    { label: 'Total Income', val: formatPdfCurrency(data.totalIncome, data.currency), color: emeraldGreen },
    { label: 'Total Expenses', val: formatPdfCurrency(data.totalExpenses, data.currency), color: coralRed },
    {
      label: 'Net Cash Flow',
      val: formatPdfCurrency(data.netSavings, data.currency),
      color: data.netSavings >= 0 ? emeraldGreen : coralRed,
    },
    {
      label: 'Savings Rate',
      val: `${data.savingsRate.toFixed(1)}%`,
      color: data.savingsRate >= 20 ? emeraldGreen : darkNavy,
    },
  ];

  summaryCards.forEach((c, idx) => {
    const cardX = MARGIN + idx * (cardWidth + 8);
    // Background fill
    currentPage.drawRectangle({
      x: cardX,
      y: y - cardHeight,
      width: cardWidth,
      height: cardHeight,
      color: slateCard,
      borderColor: borderGrey,
      borderWidth: 0.5,
    });

    currentPage.drawText(c.label.toUpperCase(), {
      x: cardX + 8,
      y: y - 16,
      size: 7,
      font: fontBold,
      color: mutedText,
    });

    currentPage.drawText(c.val, {
      x: cardX + 8,
      y: y - 38,
      size: 12,
      font: fontBold,
      color: c.color,
    });
  });

  y -= cardHeight + 30;

  // 2. Category Breakdown Section
  currentPage.drawText('Top Spending by Category', {
    x: MARGIN,
    y: y,
    size: 12,
    font: fontBold,
    color: darkNavy,
  });
  y -= 16;

  // Table header
  currentPage.drawRectangle({
    x: MARGIN,
    y: y - 18,
    width: CONTENT_WIDTH,
    height: 18,
    color: zebraBg,
    borderColor: borderGrey,
    borderWidth: 0.5,
  });

  currentPage.drawText('Category', { x: MARGIN + 8, y: y - 13, size: 8, font: fontBold, color: darkNavy });
  currentPage.drawText('Type', { x: MARGIN + 220, y: y - 13, size: 8, font: fontBold, color: darkNavy });
  currentPage.drawText('% Total', { x: MARGIN + 330, y: y - 13, size: 8, font: fontBold, color: darkNavy });
  currentPage.drawText('Amount', { x: PAGE_WIDTH - MARGIN - 80, y: y - 13, size: 8, font: fontBold, color: darkNavy });
  y -= 18;

  const expenseCategories = data.categories.filter((c) => c.type === 'EXPENSE').slice(0, 6);
  expenseCategories.forEach((cat, index) => {
    const rowHeight = 18;
    if (index % 2 === 1) {
      currentPage.drawRectangle({
        x: MARGIN,
        y: y - rowHeight,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: zebraBg,
      });
    }

    currentPage.drawText(cat.name, { x: MARGIN + 8, y: y - 13, size: 9, font: fontRegular, color: darkNavy });
    currentPage.drawText(cat.type, { x: MARGIN + 220, y: y - 13, size: 8, font: fontRegular, color: mutedText });
    currentPage.drawText(`${cat.percentage.toFixed(1)}%`, {
      x: MARGIN + 330,
      y: y - 13,
      size: 9,
      font: fontRegular,
      color: darkNavy,
    });
    const amtStr = formatPdfCurrency(cat.total, data.currency);
    currentPage.drawText(amtStr, {
      x: PAGE_WIDTH - MARGIN - 80,
      y: y - 13,
      size: 9,
      font: fontBold,
      color: darkNavy,
    });
    y -= rowHeight;
  });

  y -= 25;

  // 3. Budget Variance Section
  if (data.budgets.length > 0) {
    currentPage.drawText('Budget Performance & Variance', {
      x: MARGIN,
      y: y,
      size: 12,
      font: fontBold,
      color: darkNavy,
    });
    y -= 16;

    currentPage.drawRectangle({
      x: MARGIN,
      y: y - 18,
      width: CONTENT_WIDTH,
      height: 18,
      color: zebraBg,
      borderColor: borderGrey,
      borderWidth: 0.5,
    });

    currentPage.drawText('Category', { x: MARGIN + 8, y: y - 13, size: 8, font: fontBold, color: darkNavy });
    currentPage.drawText('Budget Limit', { x: MARGIN + 180, y: y - 13, size: 8, font: fontBold, color: darkNavy });
    currentPage.drawText('Actual Spent', { x: MARGIN + 290, y: y - 13, size: 8, font: fontBold, color: darkNavy });
    currentPage.drawText('Remaining', { x: PAGE_WIDTH - MARGIN - 90, y: y - 13, size: 8, font: fontBold, color: darkNavy });
    y -= 18;

    data.budgets.forEach((b, idx) => {
      const rowHeight = 18;
      if (idx % 2 === 1) {
        currentPage.drawRectangle({
          x: MARGIN,
          y: y - rowHeight,
          width: CONTENT_WIDTH,
          height: rowHeight,
          color: zebraBg,
        });
      }

      currentPage.drawText(b.categoryName, { x: MARGIN + 8, y: y - 13, size: 9, font: fontRegular, color: darkNavy });
      currentPage.drawText(formatPdfCurrency(b.limit, data.currency), {
        x: MARGIN + 180,
        y: y - 13,
        size: 9,
        font: fontRegular,
        color: mutedText,
      });
      currentPage.drawText(formatPdfCurrency(b.spent, data.currency), {
        x: MARGIN + 290,
        y: y - 13,
        size: 9,
        font: fontRegular,
        color: b.spent > b.limit ? coralRed : darkNavy,
      });

      const remColor = b.variance >= 0 ? emeraldGreen : coralRed;
      currentPage.drawText(formatPdfCurrency(b.variance, data.currency), {
        x: PAGE_WIDTH - MARGIN - 90,
        y: y - 13,
        size: 9,
        font: fontBold,
        color: remColor,
      });
      y -= rowHeight;
    });

    y -= 25;
  }

  // 4. Transaction Appendix with Paginated Table
  let pageIndex = 1;
  drawFooter(currentPage, pageIndex);

  function checkOrAddPage(neededHeight: number) {
    if (y - neededHeight < MARGIN + 35) {
      currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pageIndex++;
      drawHeader(currentPage, pageIndex);
      drawFooter(currentPage, pageIndex);
      y = PAGE_HEIGHT - MARGIN - 30;
      drawTransactionTableHeader();
    }
  }

  function drawTransactionTableHeader() {
    currentPage.drawRectangle({
      x: MARGIN,
      y: y - 18,
      width: CONTENT_WIDTH,
      height: 18,
      color: zebraBg,
      borderColor: borderGrey,
      borderWidth: 0.5,
    });

    currentPage.drawText('Date', { x: MARGIN + 8, y: y - 13, size: 8, font: fontBold, color: darkNavy });
    currentPage.drawText('Payee / Description', { x: MARGIN + 80, y: y - 13, size: 8, font: fontBold, color: darkNavy });
    currentPage.drawText('Category', { x: MARGIN + 250, y: y - 13, size: 8, font: fontBold, color: darkNavy });
    currentPage.drawText('Account', { x: MARGIN + 370, y: y - 13, size: 8, font: fontBold, color: darkNavy });
    currentPage.drawText('Amount', { x: PAGE_WIDTH - MARGIN - 80, y: y - 13, size: 8, font: fontBold, color: darkNavy });
    y -= 18;
  }

  checkOrAddPage(50);
  currentPage.drawText('Transaction Ledger', {
    x: MARGIN,
    y: y,
    size: 12,
    font: fontBold,
    color: darkNavy,
  });
  y -= 16;
  drawTransactionTableHeader();

  data.transactions.forEach((tx, idx) => {
    checkOrAddPage(18);
    const rowHeight = 18;
    if (idx % 2 === 1) {
      currentPage.drawRectangle({
        x: MARGIN,
        y: y - rowHeight,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: zebraBg,
      });
    }

    const dStr = typeof tx.date === 'string' ? tx.date.split('T')[0] : tx.date.toISOString().split('T')[0];
    currentPage.drawText(dStr, { x: MARGIN + 8, y: y - 13, size: 8, font: fontRegular, color: mutedText });

    // Truncate long payee name if needed
    const payeeClean = tx.payee.length > 28 ? `${tx.payee.substring(0, 26)}...` : tx.payee;
    currentPage.drawText(payeeClean, { x: MARGIN + 80, y: y - 13, size: 8, font: fontRegular, color: darkNavy });

    const catClean = tx.category.length > 18 ? `${tx.category.substring(0, 16)}...` : tx.category;
    currentPage.drawText(catClean, { x: MARGIN + 250, y: y - 13, size: 8, font: fontRegular, color: mutedText });

    const accClean = tx.account.length > 16 ? `${tx.account.substring(0, 14)}...` : tx.account;
    currentPage.drawText(accClean, { x: MARGIN + 370, y: y - 13, size: 8, font: fontRegular, color: mutedText });

    const isExp = tx.type === 'EXPENSE';
    const amtColor = isExp ? coralRed : emeraldGreen;
    const prefix = isExp ? '-' : '+';
    const formatted = `${prefix}${formatPdfCurrency(tx.amount, data.currency)}`;

    currentPage.drawText(formatted, {
      x: PAGE_WIDTH - MARGIN - 80,
      y: y - 13,
      size: 8,
      font: fontBold,
      color: amtColor,
    });

    y -= rowHeight;
  });

  return await pdfDoc.save();
}
