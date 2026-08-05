import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID!,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'wrkup-e32bc.appspot.com',
  });
  console.log('[Firebase Admin] Initialized successfully');
}

// ✅ Functions — called at runtime, not at import time
export const bucket         = admin.storage().bucket();
export const getBucket      = () => bucket;
export const firebaseAuth   = admin.auth();
export { admin };