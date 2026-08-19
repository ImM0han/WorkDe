import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

const useRealSupabase = supabaseUrl !== '' && supabaseAnonKey !== '';

const mockSupabase = {
  auth: {
    getUser: async (token: string) => {
      if (token.startsWith('mock-supabase-access-token:')) {
        const phone = token.split(':')[1];
        return {
          data: {
            user: { phone }
          },
          error: null
        };
      }
      return {
        data: { user: null },
        error: new Error('Invalid mock token')
      };
    }
  }
};

export const supabase = useRealSupabase
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (mockSupabase as any);

if (useRealSupabase) {
  console.log('[Supabase Admin] Initialized real Supabase client.');
} else {
  console.log('[Supabase Admin] Initialized mock Supabase client.');
}
