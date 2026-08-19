import { prisma } from './utils/prisma';

async function main() {
  console.log('=== Starting Withdrawal Reconciliation & Credit-Back ===');

  // Find withdrawals where failureReason exists or status is FAILED, but payoutStatus was marked 'processed' in simulation OR status was marked COMPLETED despite failureReason
  const failedWithdrawals = await prisma.withdrawal.findMany({
    where: {
      OR: [
        { failureReason: { not: null } },
        { status: 'FAILED' }
      ]
    }
  });

  console.log(`Found ${failedWithdrawals.length} failed/errored withdrawal records to check.`);

  let totalCreditedBack = 0;
  let countCredited = 0;

  for (const w of failedWithdrawals) {
    // If status is still COMPLETED (meaning money was deducted when it failed), refund it to wallet balance and set status to FAILED
    if (w.status === 'COMPLETED') {
      console.log(`[Reconcile] Refunding ₹${w.amount} to partner ${w.partnerId} for failed withdrawal ${w.id}...`);
      
      await prisma.$transaction([
        prisma.partner.update({
          where: { id: w.partnerId },
          data: { walletBalance: { increment: w.amount } }
        }),
        prisma.withdrawal.update({
          where: { id: w.id },
          data: {
            status: 'FAILED',
            payoutStatus: 'failed'
          }
        })
      ]);

      totalCreditedBack += w.amount;
      countCredited++;
    }
  }

  console.log(`=== Reconciliation Complete ===`);
  console.log(`Successfully credited back ₹${totalCreditedBack.toFixed(2)} to ${countCredited} partners.`);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Reconciliation error:', err);
    process.exit(1);
  });
