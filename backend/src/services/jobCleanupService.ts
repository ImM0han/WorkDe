import { prisma } from '../utils/prisma';

export const JOB_EXPIRATION_HOURS = 48;

/**
 * Returns the Date cutoff threshold (48 hours ago).
 * Any POSTED unaccepted job created before this date is considered expired.
 */
export const getJobExpirationCutoff = (): Date => {
  return new Date(Date.now() - JOB_EXPIRATION_HOURS * 60 * 60 * 1000);
};

/**
 * Automatically deletes all unaccepted POSTED jobs older than 48 hours.
 */
export const autoDeleteExpiredJobs = async (): Promise<number> => {
  try {
    const cutoffTime = getJobExpirationCutoff();
    const result = await prisma.job.deleteMany({
      where: {
        status: 'POSTED',
        createdAt: { lt: cutoffTime }
      }
    });

    if (result.count > 0) {
      console.log(`[Job Cleanup] Auto-deleted ${result.count} unaccepted job(s) posted > ${JOB_EXPIRATION_HOURS}h ago.`);
    }
    return result.count;
  } catch (err) {
    console.error('[Job Cleanup] Failed to auto-delete expired jobs:', err);
    return 0;
  }
};

/**
 * Starts a background interval (every 15 minutes) to continuously purge expired jobs.
 */
export const startJobCleanupCron = (): void => {
  // Run immediately on backend start
  autoDeleteExpiredJobs();

  // Run periodically every 15 minutes
  const INTERVAL_MS = 15 * 60 * 1000;
  setInterval(async () => {
    await autoDeleteExpiredJobs();
  }, INTERVAL_MS);

  console.log(`[Job Cleanup] Service initialized. Auto-deleting POSTED jobs older than ${JOB_EXPIRATION_HOURS} hours.`);
};
