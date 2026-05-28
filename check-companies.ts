import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, tenantId: true, createdAt: true }
  });
  console.log(JSON.stringify(companies, null, 2));
}

check().finally(() => prisma.$disconnect());
