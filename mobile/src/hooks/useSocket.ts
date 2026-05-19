import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

export let socketInstance: Socket | null = null;
export const getSocket = () => socketInstance;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const connect = async () => {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) return;

      socketInstance = io(process.env.EXPO_PUBLIC_API_URL!, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        transports: ['websocket'],  // Required for New Architecture
      });
      socketRef.current = socketInstance;
    };

    if (!socketInstance) {
      connect();
    } else {
      socketRef.current = socketInstance;
    }

    return () => {
      // In a real app, you might not want to disconnect on every unmount
      // if you want the socket to persist across screens.
      // We'll leave it persisting in the singleton for now.
    };
  }, []);

  return socketRef.current;
}
