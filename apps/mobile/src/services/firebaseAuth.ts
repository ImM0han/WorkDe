import { Platform } from 'react-native';

let auth: any;
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
const useMockAuth = isDev
  ? process.env.EXPO_PUBLIC_USE_REAL_FIREBASE !== 'true'
  : process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true';

// Mock implementation for Expo Go / Simulator dev testing / forced mock mode
const mockAuthInstance = {
  signInWithPhoneNumber: async (phoneNumber: string) => {
    console.log(`[Mock Firebase Auth] Requesting verification code for: ${phoneNumber}`);
    return {
      verificationId: `mock_verification_${phoneNumber}`,
      confirm: async (code: string) => {
        return {
          user: {
            getIdToken: async () => `mock-firebase-id-token:${phoneNumber}`,
            phoneNumber,
          },
        };
      },
    };
  },
  signInWithCredential: async (credential: { verificationId: string; token: string }) => {
    const phoneNumber = credential.verificationId.replace('mock_verification_', '');
    console.log(`[Mock Firebase Auth] Signed in with credential for: ${phoneNumber}`);
    return {
      user: {
        getIdToken: async () => `mock-firebase-id-token:${phoneNumber}`,
        phoneNumber,
      },
    };
  },
};

const mockAuth = () => mockAuthInstance;
mockAuth.PhoneAuthProvider = {
  credential: (verificationId: string, token: string) => {
    return { verificationId, token };
  },
};

if (useMockAuth) {
  console.log(`[Firebase Auth] Using mock authentication for ${isDev ? 'local development' : 'testing configuration'}.`);
  auth = mockAuth;
} else {
  try {
    // Attempt to require the native Firebase Auth module.
    // This will fail at runtime in Expo Go due to missing native modules.
    auth = require('@react-native-firebase/auth').default;
    
    // Test if it actually works or throws native module errors
    if (Platform.OS !== 'web') {
      auth();
    }
  } catch (error) {
    console.warn('[Firebase Auth] Native modules not found. Falling back to development mock auth.');
    auth = mockAuth;
  }
}

export default auth;
