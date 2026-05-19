import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export interface User {
  id: string;
  phone: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  role: 'PARTNER' | 'CLIENT';
  isVerified: boolean;
  aadhaarStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  partnerId?: string;
}

interface AuthStore {
  user: User | null;
  role: 'PARTNER' | 'CLIENT' | null;
  isLoading: boolean;
  pendingAuth: {
    phone: string;
    sessionId: string;
    isExistingUser: boolean;
    otpToken?: string;
    password?: string;
  } | null;
  setUser: (user: User, token: string) => Promise<void>;
  setRole: (role: 'PARTNER' | 'CLIENT') => void;
  logout: () => Promise<void>;
  setPendingAuth: (data: AuthStore['pendingAuth']) => void;
  setOtpToken: (token: string) => void;
  clearPendingAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      isLoading: false,
      pendingAuth: null,
      setUser: async (user, token) => {
        await SecureStore.setItemAsync('auth_token', token);
        const processedUser = {
          ...user,
          partnerId: user.partnerId || (user as any).partner?.id
        };
        set({ user: processedUser, role: processedUser.role });
      },
      setRole: (role) => set({ role }),
      logout: async () => {
        await SecureStore.deleteItemAsync('auth_token');
        set({ user: null, role: null });
      },
      setPendingAuth: (data) => set({ pendingAuth: data }),
      setOtpToken: (token) => set(s => ({
        pendingAuth: s.pendingAuth ? { ...s.pendingAuth, otpToken: token } : null
      })),
      clearPendingAuth: () => set({ pendingAuth: null }),
    }),
    {
      name: 'gigwork-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user, role: state.role }),
    }
  )
);

export const getToken = () => SecureStore.getItemAsync('auth_token');
