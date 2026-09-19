const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.bankAccount.findMany({
    include: { partner: true }
  });
  console.log('Bank Accounts:', accounts.length);
  if (accounts.length > 0) {
    console.log(accounts[accounts.length - 1]);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
