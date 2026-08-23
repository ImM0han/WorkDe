import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

import bcrypt from 'bcrypt';
import { prisma } from '../utils/prisma';

async function seedSuperadmin() {
  const username = process.env.SUPERADMIN_BOOTSTRAP_USERNAME;
  const password = process.env.SUPERADMIN_BOOTSTRAP_PASSWORD;

  if (!username || !password) {
    console.error('[Seed Error] SUPERADMIN_BOOTSTRAP_USERNAME or SUPERADMIN_BOOTSTRAP_PASSWORD is not configured in env.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existingSuperadmin = await prisma.adminUser.findFirst({
    where: { role: 'SUPERADMIN' }
  });

  if (existingSuperadmin) {
    const updated = await prisma.adminUser.update({
      where: { id: existingSuperadmin.id },
      data: {
        username: username.trim(),
        passwordHash,
        isActive: true,
        failedAttempts: 0,
        lockedUntil: null
      }
    });
    console.log(`[Seed Superadmin] Superadmin credentials updated successfully for username: "${updated.username}"`);
    return;
  }

  const superadmin = await prisma.adminUser.create({
    data: {
      username: username.trim(),
      passwordHash,
      role: 'SUPERADMIN',
      isActive: true
    }
  });

  console.log(`[Seed Superadmin] Superadmin created successfully with username: "${superadmin.username}"`);
}

seedSuperadmin()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('[Seed Superadmin] Failed to seed superadmin:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
