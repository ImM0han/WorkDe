import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useAdminStore } from '../stores/adminStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:10000';

const adminApi = axios.create({
  baseURL: `${BASE_URL}/ops-console`
});

adminApi.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('admin_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      if (error.response?.data?.error?.includes('admin token') || error.response?.data?.error?.includes('Unauthorized')) {
        useAdminStore.getState().logoutAdmin();
        SecureStore.deleteItemAsync('admin_auth_token').then(() => {
          router.replace('/(auth)/login' as any);
        });
      }
    }
    return Promise.reject(error);
  }
);

export default adminApi;
