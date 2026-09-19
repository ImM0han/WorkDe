import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export interface AdminProfile {
  id: string;
  username: string;
  role: 'SUPERADMIN' | 'ADMIN';
  lastLoginAt?: string;
}

interface AdminStore {
  adminUser: AdminProfile | null;
  adminToken: string | null;
  isAdminLoggedIn: boolean;
  isLoading: boolean;
  setAdmin: (admin: AdminProfile, token: string) => Promise<void>;
  logoutAdmin: () => Promise<void>;
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set) => ({
      adminUser: null,
      adminToken: null,
      isAdminLoggedIn: false,
      isLoading: false,
      setAdmin: async (admin, token) => {
        await SecureStore.setItemAsync('admin_auth_token', token);
        set({
          adminUser: admin,
          adminToken: token,
          isAdminLoggedIn: true
        });
      },
      logoutAdmin: async () => {
        await SecureStore.deleteItemAsync('admin_auth_token');
        set({
          adminUser: null,
          adminToken: null,
          isAdminLoggedIn: false
        });
      }
    }),
    {
      name: 'workde-admin-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        adminUser: state.adminUser,
        adminToken: state.adminToken,
        isAdminLoggedIn: state.isAdminLoggedIn
      })
    }
  )
);

export const getAdminToken = () => SecureStore.getItemAsync('admin_auth_token');
