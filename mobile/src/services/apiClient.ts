import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

export function getApiBaseUrl(): string {
  let url = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000').trim();
  url = url.replace(/\/+$/, '');
  url = url.replace(/\/api\/v1$/i, '');
  return url;
}

const api = axios.create({ baseURL: getApiBaseUrl() });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      SecureStore.deleteItemAsync('auth_token').then(() => {
        router.replace('/(auth)/login');
      });
    }
    return Promise.reject(error);
  }
);

export default api;
