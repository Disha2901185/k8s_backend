const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = 'cmp3ztrrj018sgrhgbd75r6bj';

  const schedulesToSeed = [
    // WO: cmpgh9pjm0770grtssxdmmfy1 (₹9.5L)
    {
      workOrderId: 'cmpgh9pjm0770grtssxdmmfy1',
      amount: 350000,
      scheduleDate: new Date('2026-05-15T00:00:00.000Z'),
      itemDetails: 'Milestone 1 - Design & Prototype Approval',
      installmentLabel: 'Milestone 1',
    },
    {
      workOrderId: 'cmpgh9pjm0770grtssxdmmfy1',
      amount: 300000,
      scheduleDate: new Date('2026-06-15T00:00:00.000Z'),
      itemDetails: 'Milestone 2 - Core Beta Deployment',
      installmentLabel: 'Milestone 2',
    },
    {
      workOrderId: 'cmpgh9pjm0770grtssxdmmfy1',
      amount: 300000,
      scheduleDate: new Date('2026-07-15T00:00:00.000Z'),
      itemDetails: 'Milestone 3 - Production Live & Signoff',
      installmentLabel: 'Milestone 3',
    },

    // WO: cmpgj4ii70b0mgrtsm5j8uqsz (₹6.5L)
    {
      workOrderId: 'cmpgj4ii70b0mgrtsm5j8uqsz',
      amount: 250000,
      scheduleDate: new Date('2026-08-10T00:00:00.000Z'),
      itemDetails: 'Phase 1 Delivery',
      installmentLabel: 'Installment 1',
    },
    {
      workOrderId: 'cmpgj4ii70b0mgrtsm5j8uqsz',
      amount: 200000,
      scheduleDate: new Date('2026-09-10T00:00:00.000Z'),
      itemDetails: 'Phase 2 Delivery',
      installmentLabel: 'Installment 2',
    },
    {
      workOrderId: 'cmpgj4ii70b0mgrtsm5j8uqsz',
      amount: 200000,
      scheduleDate: new Date('2026-10-10T00:00:00.000Z'),
      itemDetails: 'Phase 3 Sign-off',
      installmentLabel: 'Installment 3',
    },

    // WO: cmpgj7awm0ejggrts4eu8trvc (₹11.0L)
    {
      workOrderId: 'cmpgj7awm0ejggrts4eu8trvc',
      amount: 400000,
      scheduleDate: new Date('2026-11-20T00:00:00.000Z'),
      itemDetails: 'Quarterly Advance Payment',
      installmentLabel: 'Q3 Advance',
    },
    {
      workOrderId: 'cmpgj7awm0ejggrts4eu8trvc',
      amount: 350000,
      scheduleDate: new Date('2026-12-20T00:00:00.000Z'),
      itemDetails: 'Mid-term Review milestone',
      installmentLabel: 'Milestone 2',
    },
    {
      workOrderId: 'cmpgj7awm0ejggrts4eu8trvc',
      amount: 350000,
      scheduleDate: new Date('2027-01-20T00:00:00.000Z'),
      itemDetails: 'Project completion signoff',
      installmentLabel: 'Final Settlement',
    },

    // WO: cmpgh7so2076xgrtslobpn07e (₹8.0L)
    {
      workOrderId: 'cmpgh7so2076xgrtslobpn07e',
      amount: 300000,
      scheduleDate: new Date('2027-02-15T00:00:00.000Z'),
      itemDetails: 'First installment',
      installmentLabel: 'Installment 1',
    },
    {
      workOrderId: 'cmpgh7so2076xgrtslobpn07e',
      amount: 300000,
      scheduleDate: new Date('2027-03-15T00:00:00.000Z'),
      itemDetails: 'Second installment',
      installmentLabel: 'Installment 2',
    },
    {
      workOrderId: 'cmpgh7so2076xgrtslobpn07e',
      amount: 200000,
      scheduleDate: new Date('2027-04-15T00:00:00.000Z'),
      itemDetails: 'Final installment',
      installmentLabel: 'Installment 3',
    },
  ];

  console.log('Seeding schedules...');
  let count = 0;
  for (const s of schedulesToSeed) {
    // Check if the work order exists
    const wo = await prisma.workOrder.findUnique({ where: { id: s.workOrderId } });
    if (!wo) {
      console.log(`Skipping schedule for non-existent Work Order: ${s.workOrderId}`);
      continue;
    }

    await prisma.workOrderSchedule.create({
      data: {
        tenantId,
        workOrderId: s.workOrderId,
        amount: s.amount,
        scheduleDate: s.scheduleDate,
        itemDetails: s.itemDetails,
        installmentLabel: s.installmentLabel,
      },
    });
    count++;
  }

  console.log(`Successfully seeded ${count} schedules!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
