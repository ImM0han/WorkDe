import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { DisputeType } from '@prisma/client';

export const createDispute = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobId, type, description, evidence } = req.body;
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const ticketNumber = `GW-D-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const dispute = await prisma.dispute.create({
      data: {
        jobId,
        raisedById: userId,
        type: type as DisputeType || 'OTHER',
        description,
        evidence: evidence || [],
        ticketNumber,
        status: 'OPEN'
      }
    });

    res.json(dispute);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create dispute' });
  }
};

export const getMyDisputes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const disputes = await prisma.dispute.findMany({
      where: { raisedById: userId },
      orderBy: { createdAt: 'desc' },
      include: { job: { select: { category: true } } }
    });

    res.json(disputes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch disputes' });
  }
};

export const getDisputeById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: { job: true, raisedBy: { select: { name: true, role: true } } }
    });

    if (!dispute) { res.status(404).json({ error: 'Dispute not found' }); return; }
    res.json(dispute);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dispute' });
  }
};

export const resolveDispute = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // In production, verify req.user.role === 'ADMIN'
    const { id } = req.params;
    const { resolution } = req.body;

    const dispute = await prisma.dispute.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolution,
        resolvedAt: new Date()
      }
    });

    res.json(dispute);
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
};
