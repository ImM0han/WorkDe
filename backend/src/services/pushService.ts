import { Expo } from 'expo-server-sdk';
import { prisma } from '../utils/prisma';

const expo = new Expo();

export type PushType = 
  | 'WORKER_JOINED' 
  | 'JOB_FILLED' 
  | 'JOB_ACCEPTED' 
  | 'JOB_COMPLETED' 
  | 'NEW_JOB' 
  | 'AADHAAR_VERIFIED' 
  | 'PAYMENT_RECEIVED'
  | 'EXTENSION_REQUESTED';

export const PUSH_TEMPLATES: Record<string, { title: string, body: (d: any) => string }> = {
  WORKER_JOINED: { title: 'Worker confirmed! 👷', body: (d) => `${d.count} of ${d.total} workers confirmed` },
  JOB_FILLED:    { title: 'All workers confirmed! 🎉', body: (d) => `Your ${d.category} job is fully staffed` },
  JOB_ACCEPTED:  { title: 'Job Accepted', body: (d) => `${d.partnerName} accepted your job.` },
  JOB_COMPLETED: { title: 'Job Completed', body: (_) => `Your job has been completed.` },
  NEW_JOB:       { title: 'New Job Posted! 📍', body: (d) => `A new ${d.category} job is available near you.` },
  AADHAAR_VERIFIED: { title: 'Aadhaar Verified ✅', body: (_) => 'Your profile is now verified!' },
  PAYMENT_RECEIVED: { title: 'Payment Received 💰', body: (d) => `You received a payment of ₹${d.amount}.` },
  EXTENSION_REQUESTED: { title: 'Extension Requested ⏳', body: (_) => 'An extension has been requested for your job.' }
};

export const sendPushNotification = async (userId: string, type: PushType | string, payload: any) => {
  console.log(`[Push Service] Initiating push notification to User ID ${userId}: ${type}`, payload);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true }
    });

    if (!user || !user.pushToken) {
      console.log(`[Push Service] User ${userId} does not have a registered push token. Skipping push alert.`);
      return;
    }

    const token = user.pushToken.trim();

    // Verify token format using Expo SDK helper
    if (!Expo.isExpoPushToken(token)) {
      console.log(`[Push Service] Invalid Expo push token: ${token}. Skipping silently.`);
      return;
    }

    // Resolve title and body from templates
    let title = 'New Notification';
    let body = 'You have a new update in GigWork.';

    if (PUSH_TEMPLATES[type]) {
      title = PUSH_TEMPLATES[type].title;
      body = PUSH_TEMPLATES[type].body(payload || {});
    }

    const messages = [{
      to: token,
      sound: 'default' as const,
      title,
      body,
      data: { type, jobId: payload?.jobId || '' }
    }];

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        for (const ticket of tickets) {
          if (ticket.status === 'error') {
            console.error(`[Push Service] Expo ticket error: ${ticket.message}`);
            // If the device is not registered, clear token from the database
            if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
              await prisma.user.update({
                where: { id: userId },
                data: { pushToken: null }
              });
              console.log(`[Push Service] Cleared unregistered push token for User ID ${userId}`);
            }
          } else {
            console.log('[Push Service] Push notification sent successfully, ticket:', ticket);
          }
        }
      } catch (error) {
        console.error('[Push Service] Error sending push chunk:', error);
      }
    }
  } catch (error: any) {
    console.error(`[Push Service] Failed to send push notification to ${userId}:`, error.message || error);
  }
};
