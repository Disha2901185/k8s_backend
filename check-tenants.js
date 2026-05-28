const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, tenantId: true }
  });
  console.log('--- Users ---');
  console.log(users);

  const workOrders = await prisma.workOrder.findMany({
    select: { id: true, tenantId: true }
  });
  console.log('--- Work Orders ---');
  console.log(workOrders);

  const companies = await prisma.company.findMany({
    select: { id: true, name: true, tenantId: true }
  });
  console.log('--- Companies ---');
  console.log(companies);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
