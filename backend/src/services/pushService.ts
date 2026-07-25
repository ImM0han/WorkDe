import * as admin from 'firebase-admin';
import { prisma } from '../utils/prisma';

export type PushType = 'WORKER_JOINED' | 'JOB_FILLED' | 'JOB_ACCEPTED' | 'JOB_COMPLETED' | 'NEW_JOB' | 'AADHAAR_VERIFIED' | 'PAYMENT_RECEIVED';

export const PUSH_TEMPLATES: Record<string, { title: string, body: (d: any) => string }> = {
  WORKER_JOINED: { title: 'Worker confirmed! 👷', body: (d) => `${d.count} of ${d.total} workers confirmed` },
  JOB_FILLED:    { title: 'All workers confirmed! 🎉', body: (d) => `Your ${d.category} job is fully staffed` },
  JOB_ACCEPTED:  { title: 'Job Accepted', body: (d) => `${d.partnerName} accepted your job.` },
  JOB_COMPLETED: { title: 'Job Completed', body: (_) => `Your job has been completed.` },
  AADHAAR_VERIFIED: { title: 'Aadhaar Verified ✅', body: (_) => 'Your profile is now verified!' },
  PAYMENT_RECEIVED: { title: 'Payment Received 💰', body: (d) => `You received a payment of ₹${d.amount}.` }
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
    
    // Resolve notification title and body
    let title = 'New Notification';
    let body = 'You have a new update in GigWork.';

    if (PUSH_TEMPLATES[type]) {
      title = PUSH_TEMPLATES[type].title;
      body = PUSH_TEMPLATES[type].body(payload || {});
    }

    // 1. Dual Mode Routing: Expo Push Notifications (starts with "ExponentPushToken[")
    if (token.startsWith('ExponentPushToken[')) {
      console.log(`[Push Service] Routing push to Expo Service: ${token}`);
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
          'accept-encoding': 'gzip, deflate'
        },
        body: JSON.stringify({
          to: token,
          sound: 'default',
          title,
          body,
          data: { type, payload }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Push Service] Expo API responded with error: ${errText}`);
      } else {
        const result = await response.json();
        console.log('[Push Service] Expo push notification sent successfully:', result);
      }
    } else {
      // 2. Dual Mode Routing: Native Firebase Cloud Messaging (FCM)
      console.log(`[Push Service] Routing push to FCM: ${token}`);
      
      // Ensure firebase is initialized
      if (!admin.apps.length) {
        console.warn('[Push Service] Firebase Admin SDK is not initialized. Cannot send FCM push.');
        return;
      }

      const message: admin.messaging.Message = {
        token,
        notification: {
          title,
          body
        },
        data: {
          type,
          payload: JSON.stringify(payload || {})
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default'
            }
          }
        }
      };

      const result = await admin.messaging().send(message);
      console.log('[Push Service] FCM notification sent successfully:', result);
    }
  } catch (error: any) {
    console.error(`[Push Service] Failed to send push notification to ${userId}:`, error.message || error);
  }
};

