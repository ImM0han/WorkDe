import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

router.get('/addresses', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const addresses = await prisma.savedAddress.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(addresses);
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/addresses', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { label, address, lat, lng } = req.body;

    if (!label || !address || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Upsert the address by label so if they save "Home" again, it updates the existing one.
    const newAddress = await prisma.savedAddress.upsert({
      where: {
        userId_label: {
          userId,
          label
        }
      },
      update: {
        address,
        lat,
        lng
      },
      create: {
        userId,
        label,
        address,
        lat,
        lng
      }
    });

    res.status(201).json(newAddress);
  } catch (error) {
    console.error('Error saving address:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/addresses/:id', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const addressId = req.params.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify it belongs to the user
    const existing = await prisma.savedAddress.findUnique({
      where: { id: addressId }
    });

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Address not found or unauthorized' });
    }

    await prisma.savedAddress.delete({
      where: { id: addressId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
