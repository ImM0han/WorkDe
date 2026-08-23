import { prisma } from './utils/prisma';
import { WithdrawalStatus } from '@prisma/client';

async function main() {
  console.log('=== Starting Withdrawal Reconciliation & Credit-Back ===');

  const rejectedWithdrawals = await prisma.withdrawal.findMany({
    where: {
      status: WithdrawalStatus.REJECTED
    }
  });

  console.log(`Found ${rejectedWithdrawals.length} rejected withdrawal records in total.`);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Reconciliation error:', err);
    process.exit(1);
  });
