import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // Client user
  let clientUser = await prisma.user.findFirst({
    where: { phone: '+919876543210' },
  });
  if (!clientUser) {
    clientUser = await prisma.user.create({
      data: { phone: '+919876543210', name: 'Rahul Sharma', role: 'CLIENT', passwordHash, isVerified: true },
    });
  }

  // Partner users — all within 5km of Patna center (25.5941, 85.1376)
  const partnerData = [
    { phone: '+919876543211', name: 'Ramesh Kumar', skills: ['Mason', 'Carpenter'], lat: 25.5960, lng: 85.1400 },
    { phone: '+919876543212', name: 'Sunil Singh',  skills: ['Plumber', 'Electrician'], lat: 25.5920, lng: 85.1350 },
    { phone: '+919876543213', name: 'Dinesh Yadav', skills: ['Mason', 'Painter'], lat: 25.5980, lng: 85.1420 },
  ];

  for (const pd of partnerData) {
    let user = await prisma.user.findFirst({
      where: { phone: pd.phone },
    });
    if (!user) {
      user = await prisma.user.create({
        data: { phone: pd.phone, name: pd.name, role: 'PARTNER', passwordHash, isVerified: true, aadhaarStatus: 'VERIFIED' },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name: pd.name },
      });
    }

    const partner = await prisma.partner.findUnique({
      where: { userId: user.id },
    });
    if (!partner) {
      await prisma.partner.create({
        data: {
          userId: user.id,
          skills: pd.skills,
          isOnline: true,
          lastLat: pd.lat,
          lastLng: pd.lng,
          rating: 4.5,
          totalJobs: 12,
        },
      });
    } else {
      await prisma.partner.update({
        where: { userId: user.id },
        data: { skills: pd.skills, isOnline: true, lastLat: pd.lat, lastLng: pd.lng },
      });
    }
  }

  // Seed Superadmin if configured in .env
  const adminUsername = process.env.SUPERADMIN_BOOTSTRAP_USERNAME;
  const adminPassword = process.env.SUPERADMIN_BOOTSTRAP_PASSWORD;
  if (adminUsername && adminPassword) {
    const adminPasswordHash = await bcrypt.hash(adminPassword, 12);
    const existingAdmin = await prisma.adminUser.findFirst({
      where: { role: 'SUPERADMIN' },
    });
    if (existingAdmin) {
      await prisma.adminUser.update({
        where: { id: existingAdmin.id },
        data: {
          username: adminUsername.trim(),
          passwordHash: adminPasswordHash,
          isActive: true,
          failedAttempts: 0,
          lockedUntil: null,
        },
      });
      console.log(`[Superadmin] Updated superadmin user: ${adminUsername.trim()}`);
    } else {
      await prisma.adminUser.create({
        data: {
          username: adminUsername.trim(),
          passwordHash: adminPasswordHash,
          role: 'SUPERADMIN',
          isActive: true,
        },
      });
      console.log(`[Superadmin] Created superadmin user: ${adminUsername.trim()}`);
    }
  }

  console.log('Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

