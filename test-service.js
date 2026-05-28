const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listCollectionProjection(tenantId, month) {
  const selectedMonth = month;
  const monthStart = new Date(`${selectedMonth}-01T00:00:00.000Z`);
  if (Number.isNaN(monthStart.getTime())) {
    console.error('Invalid month format. Use YYYY-MM');
    return;
  }

  const nextMonthStart = new Date(monthStart);
  nextMonthStart.setUTCMonth(nextMonthStart.getUTCMonth() + 1);

  const items = await prisma.workOrderSchedule.findMany({
    where: {
      tenantId,
      scheduleDate: {
        gte: monthStart,
        lt: nextMonthStart,
      },
    },
    include: {
      workOrder: {
        include: {
          deal: {
            include: {
              company: true,
            },
          },
        },
      },
    },
  });

  const conversionRateByCurrency = new Map();
  const rows = await Promise.all(items.map(async (item) => {
    const amount = Number(item.amount ?? 0);
    const currency = (
      item.workOrder?.deal?.currency ??
      item.workOrder?.deal?.company?.currency ??
      'INR'
    ).toUpperCase();

    const conversionRate = 1; // Simplify conversion rate for testing
    const inrAmount = amount * conversionRate;

    return {
      scheduleDate: item.scheduleDate,
      customerName: item.workOrder?.deal?.company?.name ?? '',
      projectName: item.workOrder?.deal?.title ?? '',
      amount,
      currency,
      inrAmount,
    };
  }));

  const totalAmount = rows.reduce((sum, row) => sum + row.inrAmount, 0);

  return {
    month: selectedMonth,
    items: rows,
    totalAmount,
  };
}

async function main() {
  const tenantId = 'cmp3ztrrj018sgrhgbd75r6bj';
  
  const current = new Date();
  // We'll test next 12 months starting from current month
  for (let i = 0; i < 12; i++) {
    const targetDate = new Date(current.getFullYear(), current.getMonth() + i, 1);
    const year = targetDate.getFullYear();
    const monthStr = String(targetDate.getMonth() + 1).padStart(2, '0');
    const queryKey = `${year}-${monthStr}`;
    
    const result = await listCollectionProjection(tenantId, queryKey);
    console.log(`Month: ${queryKey}, Total Amount: ₹${result.totalAmount}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
