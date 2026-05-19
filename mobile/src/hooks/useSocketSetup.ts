import { useEffect } from 'react';
import { io } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import { useAuthStore } from '../stores/authStore';
import { useSocketStore } from '../stores/socketStore';

export function useSocketSetup() {
  const { user } = useAuthStore();
  const { setSocket, setConnected } = useSocketStore();

  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const connect = async () => {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token || !mounted) return;

      const socket = io(process.env.EXPO_PUBLIC_API_URL!, {
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
