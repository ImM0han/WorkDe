import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // Client user
  const clientUser = await prisma.user.upsert({
    where: { phone: '+919876543210' },
    create: { phone: '+919876543210', name: 'Rahul Sharma', role: 'CLIENT', passwordHash, isVerified: true },
    update: {},
  });

  // Partner users — all within 5km of Patna center (25.5941, 85.1376)
  const partnerData = [
    { phone: '+919876543211', name: 'Ramesh Kumar', skills: ['Mason', 'Carpenter'], lat: 25.5960, lng: 85.1400 },
    { phone: '+919876543212', name: 'Sunil Singh',  skills: ['Plumber', 'Electrician'], lat: 25.5920, lng: 85.1350 },
    { phone: '+919876543213', name: 'Dinesh Yadav', skills: ['Mason', 'Painter'], lat: 25.5980, lng: 85.1420 },
  ];

  for (const pd of partnerData) {
    const user = await prisma.user.upsert({
      where: { phone: pd.phone },
      create: { phone: pd.phone, name: pd.name, role: 'PARTNER', passwordHash, isVerified: true, aadhaarStatus: 'VERIFIED' },
      update: {},
    });
    await prisma.partner.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        skills: pd.skills,
        isOnline: true,
        lastLat: pd.lat,
        lastLng: pd.lng,
        rating: 4.5,
        totalJobs: 12,
      },
      update: { skills: pd.skills, isOnline: true, lastLat: pd.lat, lastLng: pd.lng },
    });
  }

  console.log('Seed complete');
}

main().finally(() => prisma.$disconnect());
