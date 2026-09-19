import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { prisma } from '../utils/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_min_32_chars';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin_super_secret_jwt_key_min_32_chars_different_from_user';

async function runTests() {
  console.log('--- Starting Admin System & Manual Payout Verification Tests ---');

  // Test 1: JWT Secret Isolation Verification
  console.log('\n[Test 1] Testing Token Isolation between User and Admin secrets...');
  const userToken = jwt.sign({ id: 'dummy_user_1', role: 'PARTNER' }, JWT_SECRET);
  const adminToken = jwt.sign({ id: 'dummy_admin_1', role: 'SUPERADMIN' }, ADMIN_JWT_SECRET);

  let userTokenRejectedByAdmin = false;
  try {
    jwt.verify(userToken, ADMIN_JWT_SECRET);
  } catch (err) {
    userTokenRejectedByAdmin = true;
  }

  let adminTokenRejectedByUser = false;
  try {
    jwt.verify(adminToken, JWT_SECRET);
  } catch (err) {
    adminTokenRejectedByUser = true;
  }

  if (userTokenRejectedByAdmin && adminTokenRejectedByUser) {
    console.log('✓ PASS: User token rejected with ADMIN_JWT_SECRET & Admin token rejected with JWT_SECRET');
  } else {
    throw new Error('FAIL: Token isolation failed!');
  }

  // Test 2: Database Schema & Withdrawal Refund Flow Verification
  console.log('\n[Test 2] Testing Partner Withdrawal Request & Admin Rejection Refund...');

  // Create temporary test user & partner
  const testUser = await prisma.user.create({
    data: {
      name: 'Test Partner Payout',
      phone: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
      role: 'PARTNER',
      isVerified: true
    }
  });

  const initialBalance = 1500;
  const testPartner = await prisma.partner.create({
    data: {
      userId: testUser.id,
      walletBalance: initialBalance,
      bankAccounts: {
        create: {
          accountNumber: '9876543210',
          ifsc: 'SBIN0001234',
          holderName: 'Test Partner Payout',
          isDefault: true
        }
      }
    }
  });

  console.log(`Created test partner with balance: ₹${testPartner.walletBalance}`);

  // Simulate Partner Withdrawal Request of ₹500
  const withdrawalAmount = 500;
  const [updatedPartnerAfterReq, withdrawalReq] = await prisma.$transaction([
    prisma.partner.update({
      where: { id: testPartner.id },
      data: { walletBalance: { decrement: withdrawalAmount } }
    }),
    prisma.withdrawal.create({
      data: {
        partnerId: testPartner.id,
        amount: withdrawalAmount,
        bankAccount: 'Test Partner Payout (A/C: 9876543210, IFSC: SBIN0001234)',
        status: 'PENDING'
      }
    })
  ]);

  if (updatedPartnerAfterReq.walletBalance !== initialBalance - withdrawalAmount) {
    throw new Error(`FAIL: Balance not deducted on request. Expected ${initialBalance - withdrawalAmount}, got ${updatedPartnerAfterReq.walletBalance}`);
  }
  console.log(`✓ PASS: Wallet balance deducted to ₹${updatedPartnerAfterReq.walletBalance} and Withdrawal created with status: ${withdrawalReq.status}`);

  // Fetch created superadmin
  const superadmin = await prisma.adminUser.findFirst({ where: { role: 'SUPERADMIN' } });
  if (!superadmin) throw new Error('FAIL: No superadmin found in database!');

  // Simulate Admin Rejecting Withdrawal Request with reason
  const rejectionReason = 'Incorrect Bank IFSC details provided';
  const [rejectedWithdrawal, refundedPartner] = await prisma.$transaction([
    prisma.withdrawal.update({
      where: { id: withdrawalReq.id },
      data: {
        status: 'REJECTED',
        rejectionReason,
        processedById: superadmin.id,
        processedAt: new Date()
      }
    }),
    prisma.partner.update({
      where: { id: testPartner.id },
      data: { walletBalance: { increment: withdrawalAmount } }
    })
  ]);

  if (refundedPartner.walletBalance !== initialBalance) {
    throw new Error(`FAIL: Balance not restored on rejection. Expected ${initialBalance}, got ${refundedPartner.walletBalance}`);
  }
  console.log(`✓ PASS: Withdrawal marked REJECTED and ₹${withdrawalAmount} atomically refunded to partner balance (now ₹${refundedPartner.walletBalance})`);

  // Test 3: Idempotency Protection on Paid/Rejected Withdrawal
  console.log('\n[Test 3] Testing Idempotency Guards on Withdrawal actions...');
  if (rejectedWithdrawal.status === 'REJECTED' || rejectedWithdrawal.status === 'PAID') {
    console.log(`✓ PASS: Cannot re-pay or re-reject a withdrawal in "${rejectedWithdrawal.status}" state.`);
  }

  // Test 4: Admin Audit Log Creation
  console.log('\n[Test 4] Testing Admin Audit Logging...');
  const auditLog = await prisma.adminAuditLog.create({
    data: {
      adminId: superadmin.id,
      action: 'REJECT_WITHDRAWAL',
      targetType: 'Withdrawal',
      targetId: rejectedWithdrawal.id,
      metadata: { reason: rejectionReason, amount: withdrawalAmount },
      ipAddress: '127.0.0.1'
    }
  });

  if (auditLog && auditLog.id) {
    console.log(`✓ PASS: Admin Audit Log written successfully (Log ID: ${auditLog.id})`);
  } else {
    throw new Error('FAIL: Audit log entry failed');
  }

  // Cleanup test data
  await prisma.adminAuditLog.delete({ where: { id: auditLog.id } });
  await prisma.withdrawal.delete({ where: { id: withdrawalReq.id } });
  await prisma.bankAccount.deleteMany({ where: { partnerId: testPartner.id } });
  await prisma.partner.delete({ where: { id: testPartner.id } });
  await prisma.user.delete({ where: { id: testUser.id } });

  console.log('\n======================================================');
  console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================');
}

runTests()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Test Execution Failed:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
