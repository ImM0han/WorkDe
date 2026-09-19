import { prisma } from './src/utils/prisma';

async function main() {
  console.log("=== Inspecting Partners & Bank Accounts & Withdrawals ===");
  const partners = await prisma.partner.findMany({
    include: {
      user: true,
      bankAccounts: true,
      withdrawals: true
    }
  });

  for (const p of partners) {
    console.log(`Partner: ${p.user.name} (${p.id}) | Wallet Balance: ₹${p.walletBalance}`);
    console.log(`  Bank Accounts (${p.bankAccounts.length}):`, p.bankAccounts);
    console.log(`  Withdrawals (${p.withdrawals.length}):`, p.withdrawals);
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
