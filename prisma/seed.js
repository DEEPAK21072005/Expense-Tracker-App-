const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial personal finance data...');

  // 1. Create or find default User
  const user = await prisma.user.upsert({
    where: { email: 'user@expensetracker.pro' },
    update: {},
    create: {
      email: 'user@expensetracker.pro',
      name: 'Personal User',
      baseCurrency: 'INR',
      timezone: 'Asia/Kolkata',
      theme: 'system',
    },
  });

  // 2. Default Accounts
  const accountsData = [
    { name: 'Primary Checking', type: 'BANK', currency: 'INR', balance: 45200.0 },
    { name: 'Emergency Savings', type: 'SAVINGS', currency: 'INR', balance: 125000.0 },
    { name: 'Credit Card', type: 'CREDIT_CARD', currency: 'INR', balance: -14500.0 },
    { name: 'Physical Wallet / Cash', type: 'CASH', currency: 'INR', balance: 3500.0 },
  ];

  const accounts = [];
  for (const acc of accountsData) {
    const existing = await prisma.account.findFirst({
      where: { userId: user.id, name: acc.name },
    });
    if (!existing) {
      const created = await prisma.account.create({
        data: { ...acc, userId: user.id },
      });
      accounts.push(created);
    } else {
      accounts.push(existing);
    }
  }

  // 3. Curated Categories
  const categoriesData = [
    // Expense
    { name: 'Food & Dining', type: 'EXPENSE', icon: 'utensils', color: '#F97316' },
    { name: 'Housing & Utilities', type: 'EXPENSE', icon: 'home', color: '#3B82F6' },
    { name: 'Transportation', type: 'EXPENSE', icon: 'car', color: '#6366F1' },
    { name: 'Groceries', type: 'EXPENSE', icon: 'shopping-cart', color: '#10B981' },
    { name: 'Entertainment', type: 'EXPENSE', icon: 'film', color: '#EC4899' },
    { name: 'Healthcare', type: 'EXPENSE', icon: 'activity', color: '#EF4444' },
    { name: 'Shopping', type: 'EXPENSE', icon: 'bag', color: '#8B5CF6' },
    { name: 'Subscriptions', type: 'EXPENSE', icon: 'repeat', color: '#06B6D4' },
    // Income
    { name: 'Salary & Compensation', type: 'INCOME', icon: 'briefcase', color: '#059669' },
    { name: 'Freelance & Projects', type: 'INCOME', icon: 'code', color: '#14B8A6' },
    { name: 'Investments & Returns', type: 'INCOME', icon: 'trending-up', color: '#84CC16' },
  ];

  const categoryMap = new Map();
  for (const cat of categoriesData) {
    let category = await prisma.category.findFirst({
      where: { userId: user.id, name: cat.name },
    });
    if (!category) {
      category = await prisma.category.create({
        data: { ...cat, userId: user.id },
      });
    }
    categoryMap.set(cat.name, category);
  }

  // 4. Sample Budgets for Current Month
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const foodCat = categoryMap.get('Food & Dining');
  const housingCat = categoryMap.get('Housing & Utilities');
  const groceryCat = categoryMap.get('Groceries');
  const entCat = categoryMap.get('Entertainment');

  const budgets = [
    { categoryId: foodCat?.id, amount: 12000.0, month: currentMonth, year: currentYear },
    { categoryId: housingCat?.id, amount: 25000.0, month: currentMonth, year: currentYear },
    { categoryId: groceryCat?.id, amount: 10000.0, month: currentMonth, year: currentYear },
    { categoryId: entCat?.id, amount: 5000.0, month: currentMonth, year: currentYear },
  ];

  for (const b of budgets) {
    if (b.categoryId) {
      const existing = await prisma.budget.findFirst({
        where: { userId: user.id, categoryId: b.categoryId, month: b.month, year: b.year },
      });
      if (!existing) {
        await prisma.budget.create({
          data: { ...b, userId: user.id, alertThreshold: 0.85 },
        });
      }
    }
  }

  // 5. Sample Initial Transactions for the month
  const primaryAccount = accounts[0];
  const creditCardAccount = accounts[2];

  const transactionsData = [
    {
      accountId: primaryAccount.id,
      categoryId: categoryMap.get('Salary & Compensation')?.id,
      amount: 85000.0,
      type: 'INCOME',
      payee: 'Acme Technologies Ltd',
      notes: 'Monthly engineering compensation',
      date: new Date(currentYear, currentMonth - 1, 1),
    },
    {
      accountId: primaryAccount.id,
      categoryId: categoryMap.get('Housing & Utilities')?.id,
      amount: 22000.0,
      type: 'EXPENSE',
      payee: 'Apartment Rent & Maintenance',
      notes: 'Monthly apartment lease',
      date: new Date(currentYear, currentMonth - 1, 2),
    },
    {
      accountId: creditCardAccount.id,
      categoryId: categoryMap.get('Groceries')?.id,
      amount: 4350.0,
      type: 'EXPENSE',
      payee: 'Nature Basket Supermarket',
      notes: 'Organic groceries & pantry supplies',
      date: new Date(currentYear, currentMonth - 1, 5),
    },
    {
      accountId: creditCardAccount.id,
      categoryId: categoryMap.get('Food & Dining')?.id,
      amount: 1450.0,
      type: 'EXPENSE',
      payee: 'Seoul Kitchen Bistro',
      notes: 'Weekend dinner with team',
      date: new Date(currentYear, currentMonth - 1, 8),
    },
    {
      accountId: primaryAccount.id,
      categoryId: categoryMap.get('Transportation')?.id,
      amount: 850.0,
      type: 'EXPENSE',
      payee: 'Metro Fast Transit',
      notes: 'Monthly travel card recharge',
      date: new Date(currentYear, currentMonth - 1, 10),
    },
    {
      accountId: creditCardAccount.id,
      categoryId: categoryMap.get('Entertainment')?.id,
      amount: 799.0,
      type: 'EXPENSE',
      payee: 'Netflix & Spotify Bundle',
      notes: 'Streaming subscriptions',
      date: new Date(currentYear, currentMonth - 1, 12),
    },
  ];

  for (const tx of transactionsData) {
    const existing = await prisma.transaction.findFirst({
      where: { userId: user.id, payee: tx.payee, date: tx.date },
    });
    if (!existing) {
      await prisma.transaction.create({
        data: {
          ...tx,
          userId: user.id,
          currency: 'INR',
        },
      });
    }
  }

  // 6. Upgraded Group Expense Split Group (Preserves and elevates legacy feature!)
  let splitGroup = await prisma.expenseSplitGroup.findFirst({
    where: { userId: user.id, name: 'Apartment Roommates' },
  });

  if (!splitGroup) {
    splitGroup = await prisma.expenseSplitGroup.create({
      data: {
        userId: user.id,
        name: 'Apartment Roommates',
        description: 'Monthly flat utility and grocery split',
        members: {
          create: [
            { name: 'Deepak' },
            { name: 'Rohan' },
            { name: 'Ananya' },
          ],
        },
      },
      include: { members: true },
    });

    // Sample initial group split expense: Wi-Fi bill ₹1500 paid by Deepak, split 3 ways
    const deepak = splitGroup.members.find((m) => m.name === 'Deepak');
    if (deepak) {
      await prisma.splitExpense.create({
        data: {
          groupId: splitGroup.id,
          paidById: deepak.id,
          description: 'High-Speed Fiber Broadband',
          amount: 1500.0,
          currency: 'INR',
          splitType: 'EQUAL',
          shares: {
            create: splitGroup.members.map((m) => ({
              memberId: m.id,
              shareAmount: 500.0,
            })),
          },
        },
      });
    }
  }

  // 7. Recurring Subscriptions
  const existingSub = await prisma.recurringPayment.findFirst({
    where: { userId: user.id, description: 'Cloud Storage & GitHub Pro' },
  });
  if (!existingSub) {
    await prisma.recurringPayment.create({
      data: {
        userId: user.id,
        accountId: primaryAccount.id,
        categoryId: categoryMap.get('Subscriptions')?.id,
        description: 'Cloud Storage & GitHub Pro',
        amount: 1200.0,
        currency: 'INR',
        frequency: 'MONTHLY',
        nextDate: new Date(currentYear, currentMonth - 1, 28),
      },
    });
  }

  console.log('Database seeded successfully with initial data!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
