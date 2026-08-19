import { createClient } from '@supabase/supabase-js';

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const forceMock = process.env.EXPO_PUBLIC_USE_MOCK_SUPABASE === 'true';

// Determine if we should use the real client or mock client.
const useRealSupabase = !forceMock && supabaseUrl !== '' && supabaseAnonKey !== '';

const mockSupabase = {
  auth: {
    signInWithOtp: async ({ phone, email }: { phone?: string; email?: string }) => {
      console.log(`[Mock Supabase Auth] Requesting OTP code for: ${phone || email}`);
      return { data: {}, error: null };
    },
    verifyOtp: async ({ phone, email, token, type }: { phone?: string; email?: string; token: string; type: string }) => {
      console.log(`[Mock Supabase Auth] Verifying OTP: ${token} for ${phone || email}`);
      const identifier = phone || email;
      return {
        data: {
          session: {
            access_token: `mock-supabase-access-token:${identifier}`,
          },
          user: {
            phone,
            email,
          }
        },
        error: null
      };
    }
  }
};

let supabase: any;

if (useRealSupabase) {
  console.log('[Supabase Auth] Initializing real Supabase client.');
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    }
  });
} else {
  console.log(`[Supabase Auth] Using mock authentication for ${isDev ? 'local development' : 'testing configuration'}.`);
  supabase = mockSupabase;
}

export default supabase;
