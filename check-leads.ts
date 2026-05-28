import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const leads = await prisma.lead.findMany({
    select: { id: true, companyName: true, company: { select: { name: true } } }
  });
  console.log(JSON.stringify(leads, null, 2));
}

check().finally(() => prisma.$disconnect());
