import * as admin from 'firebase-admin';
import path from 'path';

// Note: In production, load service account from an environment variable or secret manager
// For local dev, make sure to add firebase-service-account.json to the backend root if needed,
// but for now we'll initialize without credentials (or use default credentials) so it doesn't crash.

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(), // Uses GOOGLE_APPLICATION_CREDENTIALS
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'gigwork-dev.appspot.com'
    });
  }
} catch (error) {
  console.error('Firebase Admin initialization error', error);
}

export const bucket = admin.storage().bucket();
export const firebaseAuth = admin.auth();
