import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useSocketStore } from '../stores/socketStore';
import { api } from '../services/apiClient';

export function usePartnerTracking(enabled: boolean) {
  const { socket } = useSocketStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !socket) return;

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      intervalRef.current = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const { latitude: lat, longitude: lng } = loc.coords;

          // Emit to socket (real-time forwarding to client)
          socket.emit('partner:location', { lat, lng });

          // Persist to DB (recovery on reconnect)
          await api.patch('/partner/location', { lat, lng, isOnline: true });
        } catch {}
      }, 15_000);
    };

    startTracking();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, socket]);
}
