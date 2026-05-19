export type PushType = 'WORKER_JOINED' | 'JOB_FILLED' | 'JOB_ACCEPTED' | 'JOB_COMPLETED' | 'NEW_JOB';

export const PUSH_TEMPLATES: Record<string, { title: string, body: (d: any) => string }> = {
  WORKER_JOINED: { title:'Worker confirmed! 👷', body:(d)=>`${d.count} of ${d.total} workers confirmed` },
  JOB_FILLED:    { title:'All workers confirmed! 🎉', body:(d)=>`Your ${d.category} job is fully staffed` },
  JOB_ACCEPTED:  { title:'Job Accepted', body:(d)=>`${d.partnerName} accepted your job.` },
  JOB_COMPLETED: { title:'Job Completed', body:(_)=>`Your job has been completed.` },
};

export const sendPushNotification = async (userId: string, type: PushType | string, payload: any) => {
  console.log(`Sending push notification to ${userId}: ${type}`, payload);
  // Implementation will go here
};
