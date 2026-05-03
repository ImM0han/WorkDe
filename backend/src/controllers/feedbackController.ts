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

    const review = await prisma.review.create({
      data: {
        jobId,
        clientId: clientId as string,
        partnerId: job.partnerId,
        rating,
        comment
      }
    });

    // Update partner average rating
    const partnerReviews = await prisma.review.aggregate({
      where: { partnerId: job.partnerId },
      _avg: { rating: true }
    });

    if (partnerReviews._avg.rating) {
      await prisma.partner.update({
        where: { id: job.partnerId },
        data: { rating: partnerReviews._avg.rating }
      });
    }

    res.json(review);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
};
