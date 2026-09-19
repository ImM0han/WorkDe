import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

import bcrypt from 'bcrypt';
import { prisma } from '../utils/prisma';
import { redis } from '../lib/redis';

async function resetDatabase() {
  console.log('⚠️  Starting database wipe (erasing all transactions, jobs, payments, users, and logs)...');

  // Clear MongoDB database collections in relational dependency order
  await prisma.payment.deleteMany({});
  await prisma.feedback.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.dispute.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.job.deleteMany({});
  await prisma.withdrawal.deleteMany({});
  await prisma.bankAccount.deleteMany({});
  await prisma.certificate.deleteMany({});
  await prisma.savedAddress.deleteMany({});
  await prisma.partner.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.adminAuditLog.deleteMany({});
  await prisma.bannedPhone.deleteMany({});
  await prisma.adminUser.updateMany({ data: { createdById: null } });
  await prisma.adminUser.deleteMany({});

  console.log('✅ All MongoDB collections wiped successfully.');

  // Clear Redis state (cached locations & rate limits)
  try {
    await redis.flushdb();
    console.log('✅ Redis cache flushed successfully.');
  } catch (err: any) {
    console.warn('⚠️  Failed to flush Redis (may not be running locally):', err.message);
  }

  // Re-seed Superadmin if credentials exist in env
  const username = process.env.SUPERADMIN_BOOTSTRAP_USERNAME;
  const password = process.env.SUPERADMIN_BOOTSTRAP_PASSWORD;

  if (username && password) {
    const passwordHash = await bcrypt.hash(password, 12);
    const superadmin = await prisma.adminUser.create({
      data: {
        username: username.trim(),
        passwordHash,
        role: 'SUPERADMIN',
        isActive: true
      }
    });
    console.log(`🔑 Superadmin account created successfully with username: "${superadmin.username}"`);
  } else {
    console.log('ℹ️  No SUPERADMIN_BOOTSTRAP_USERNAME / PASSWORD set in env. Skipping superadmin seed.');
  }

  console.log('✨ Database reset complete! Your app is clean and ready for fresh transactions.');
}

resetDatabase()
  .then(async () => {
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('❌ Database reset failed:', error);
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(1);
  });
