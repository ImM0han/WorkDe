import { useEffect } from 'react';
import { io } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import { useAuthStore } from '../stores/authStore';
import { useSocketStore } from '../stores/socketStore';
import { getApiBaseUrl } from '../services/apiClient';

export function useSocketSetup() {
  const { user } = useAuthStore();
  const { setSocket, setConnected } = useSocketStore();

  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const connect = async () => {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token || !mounted) return;

      const socket = io(getApiBaseUrl(), {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      socket.on('connect', async () => {
        if (!mounted) return;
        setConnected(true);

        // Partner: announce online with current location
        if (user.role === 'PARTNER') {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
              socket.emit('partner:online', {
                lat: loc.coords.latitude,
                lng: loc.coords.longitude,
              });
            }
          } catch {}
        }
      });

      socket.on('disconnect', () => { if (mounted) setConnected(false); });
      socket.on('connect_error', (err) => console.warn('[Socket] connect error:', err.message));

      // Listen for real-time user verification / profile updates
      socket.on('user:updated', (updatedUser: any) => {
        if (!mounted || !updatedUser) return;
        useAuthStore.setState(s => {
          if (!s.user) return s;
          return {
            user: {
              ...s.user,
              ...updatedUser,
              partnerId: updatedUser.partnerId || updatedUser.partner?.id || s.user.partnerId
            }
          };
        });
      });

      socket.on('notification:new', (data: any) => {
        if (!mounted) return;
        if (data?.type === 'AADHAAR_VERIFIED' || data?.type === 'KYC_UPDATED') {
          const api = require('../services/apiClient').default;
          api.get('/auth/me').then((res: any) => {
            if (res.data?.user && mounted) {
              const processedUser = {
                ...res.data.user,
                partnerId: res.data.user.partnerId || res.data.user.partner?.id
              };
              useAuthStore.setState({ user: processedUser });
            }
          }).catch(() => {});
        }
      });

      setSocket(socket);
    };

    connect();

    return () => {
      mounted = false;
      const { socket } = useSocketStore.getState();
      if (socket) {
        if (user.role === 'PARTNER') socket.emit('partner:offline');
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
    };
  }, [user?.id]);
}
