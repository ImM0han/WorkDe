import { prisma } from './src/utils/prisma';
import axios from 'axios';

async function main() {
  const partner = await prisma.partner.findFirst({
    where: { bankAccounts: { some: {} } },
    include: { bankAccounts: true, user: true }
  });

  if (!partner) {
    console.error("No partner found with bank accounts");
    return;
  }

  console.log(`Testing withdrawal for partner: ${partner.user.name || partner.id}`);
  console.log(`Initial wallet balance: ₹${partner.walletBalance}`);

  const bank = partner.bankAccounts[0];
  console.log(`Using bank account:`, bank);

  // Directly call local backend API or function logic
  const amount = 10;

  // Let's test the endpoint logic
  const contactName = (partner.user.name && partner.user.name.trim().length > 0)
    ? partner.user.name.trim()
    : (partner.user.phone ? `Partner ${partner.user.phone.slice(-4)}` : 'Partner User');

  const contactPhone = (partner.user.phone || '9999999999').replace(/[^0-9]/g, '').slice(-10) || '9999999999';

  let bankAccountStr = '';
  if (bank.ifsc === 'UPI') {
    bankAccountStr = `UPI: ${bank.accountNumber}`;
  } else {
    bankAccountStr = `${bank.holderName || contactName} (A/C: ${bank.accountNumber}, IFSC: ${bank.ifsc})`;
  }

  let payoutId = `payout_sim_${Math.floor(Math.random() * 100000000)}`;
  let payoutStatus = 'processed';

  await prisma.$transaction([
    prisma.partner.update({
      where: { id: partner.id },
      data: { walletBalance: { decrement: amount } }
    }),
    prisma.withdrawal.create({
      data: {
        partnerId: partner.id,
        amount,
        bankAccount: bankAccountStr,
        status: 'COMPLETED',
        razorpayPayoutId: payoutId,
        payoutStatus,
        failureReason: null
      }
    })
  ]);

  const updatedPartner = await prisma.partner.findUnique({ where: { id: partner.id } });
  console.log(`Withdrawal successful! New balance: ₹${updatedPartner?.walletBalance}`);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
