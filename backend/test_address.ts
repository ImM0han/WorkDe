import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('No user found');
      return;
    }

    const address = await prisma.savedAddress.create({
      data: {
        userId: user.id,
        label: 'Home',
        customLabel: '',
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
        isDefault: true,
      },
    });
    console.log('Success:', address);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
