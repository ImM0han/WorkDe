import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// ── GET /addresses ────────────────────────────────────────
// Returns all saved addresses for the logged-in user
// Default address always comes first
router.get('/', authenticateToken, async (req, res) => {
  const addresses = await prisma.savedAddress.findMany({
    where: { userId: (req as any).user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
  res.json(addresses);
});

// ── POST /addresses ───────────────────────────────────────
// Save a new address
// If it's the first address, auto-set as default
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      label, customLabel, name, phone,
      flat, street, landmark, city, state,
      pincode, lat, lng, fullAddress,
    } = req.body;

    const existingCount = await prisma.savedAddress.count({
      where: { userId: (req as any).user.id },
    });

    const address = await prisma.savedAddress.create({
      data: {
        userId: (req as any).user.id,
        label, customLabel, name, phone,
        flat, street, landmark, city, state,
        pincode,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        fullAddress,
        isDefault: existingCount === 0,
      },
    });

    res.status(201).json(address);
  } catch (error: any) {
    console.error('Error saving address:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: `You already have an address saved as '${req.body.label}'. Please use a different label or edit the existing one.` });
    }
    require('fs').appendFileSync('error.log', JSON.stringify({ message: error.message, stack: error.stack }) + '\n');
    res.status(500).json({ error: error.message || 'Internal server error', stack: error.stack });
  }
});

// ── PUT /addresses/:id ────────────────────────────────────
// Update an existing address
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.savedAddress.findFirst({
    where: { id, userId: (req as any).user.id },
  });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const updated = await prisma.savedAddress.update({
    where: { id },
    data: { ...req.body, lat: parseFloat(req.body.lat), lng: parseFloat(req.body.lng) },
  });
  res.json(updated);
});

// ── DELETE /addresses/:id ─────────────────────────────────
// Delete an address
// If deleted address was default, promote the next one
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  const address = await prisma.savedAddress.findFirst({
    where: { id, userId: (req as any).user.id },
  });
  if (!address) return res.status(404).json({ error: 'Not found' });

  await prisma.savedAddress.delete({ where: { id } });

  if (address.isDefault) {
    const next = await prisma.savedAddress.findFirst({
      where: { userId: (req as any).user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (next) {
      await prisma.savedAddress.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }

  res.json({ success: true });
});

// ── PATCH /addresses/:id/default ─────────────────────────
// Set one address as default, unset all others
router.patch('/:id/default', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = (req as any).user.id;

  await prisma.$transaction([
    prisma.savedAddress.updateMany({
      where: { userId },
      data: { isDefault: false },
    }),
    prisma.savedAddress.update({
      where: { id },
      data: { isDefault: true },
    }),
  ]);

  res.json({ success: true });
});

// ── GET /addresses/pincode/:pincode ──────────────────────
// Lookup city and state from pincode using India Post API
// Used to auto-fill city/state when user types pincode
router.get('/pincode/:pincode', async (req, res) => {
  const { pincode } = req.params;
  if (!/^\d{6}$/.test(pincode)) {
    return res.status(400).json({ error: 'Invalid pincode' });
  }

  try {
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${pincode}`
    );
    const data = await response.json();

    if (data[0].Status === 'Success') {
      const post = data[0].PostOffice[0];
      res.json({ city: post.District, state: post.State, found: true });
    } else {
      res.json({ found: false });
    }
  } catch {
    res.json({ found: false });
  }
});

export default router;
