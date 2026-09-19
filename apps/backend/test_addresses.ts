import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) return console.log('No user');

    const count = await prisma.savedAddress.count({ where: { userId: user.id } });
    console.log(`User ${user.id} has ${count} saved addresses.`);

    // Let's create an address with a random label to bypass P2002
    const address = await prisma.savedAddress.create({
      data: {
        userId: user.id,
        label: 'Other',
        customLabel: 'Test ' + Date.now(),
        name: 'Test Name',
        phone: '1234567890',
        flat: 'Flat 1',
        street: 'Test Street',
        landmark: '',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
        lat: parseFloat('12.34'),
        lng: parseFloat('56.78'),
        fullAddress: 'Flat 1, Test Street, Test City, Test State, 123456',
        isDefault: count === 0,
      },
    });
    console.log('Successfully created address:', address);
  } catch (error) {
    console.error('Error creating address:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
