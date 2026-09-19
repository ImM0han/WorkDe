import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';

export const submitFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobId, rating, comment } = req.body;
    const clientId = req.user?.id;

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.clientId !== clientId) {
      res.status(403).json({ error: 'Unauthorized or job not found' });
      return;
    }

    if (!job.partnerId) {
      res.status(400).json({ error: 'Job has no assigned partner' });
      return;
    }

    const review = await prisma.feedback.create({
      data: {
        jobId,
        rating,
        comment
      }
    });

    // Update partner average rating
    const partnerJobs = await prisma.job.findMany({
      where: { partnerId: job.partnerId },
      select: { feedback: { select: { rating: true } } }
    });

    const ratings = partnerJobs.map(j => j.feedback?.rating).filter((r): r is number => r != null);

    if (ratings.length > 0) {
      const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      await prisma.partner.update({
        where: { id: job.partnerId },
        data: { rating: avgRating }
      });
    }

    res.json(review);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
};
