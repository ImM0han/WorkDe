import { prisma } from './utils/prisma';

async function main() {
  console.log("=== Inspecting Payments ===");
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.dir(payments, { depth: null });

  console.log("=== Inspecting Jobs ===");
  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.dir(jobs, { depth: null });
}

main().catch(console.error);
