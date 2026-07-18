const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugWallet() {
  try {
    console.log('=== PARTNERS & WALLET BALANCE ===');
    const partners = await prisma.partner.findMany({
      include: { user: { select: { name: true } } }
    });
    for (const p of partners) {
      console.log(`Partner: ${p.user.name} | ID: ${p.id} | WalletBalance:  ${p.walletBalance}`);
    }

    console.log('\n=== PAYMENTS ===');
    const payments = await prisma.payment.findMany({
      include: {
        job: { select: { category: true, partnerId: true } }
      }
    });
    for (const pm of payments) {
      console.log(`Payment ID: ${pm.id} | Job Category: ${pm.job?.category} | PartnerID: ${pm.job?.partnerId} | Amount:  ${pm.amount} | Net:  ${pm.netAmount} | Status: ${pm.status}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

debugWallet();
