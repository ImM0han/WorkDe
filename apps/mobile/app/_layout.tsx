import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { useSocketStore } from '../src/stores/socketStore';
import { useSocketSetup } from '../src/hooks/useSocketSetup';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { initI18n } from '../src/i18n';
import '../src/i18n';
import { useAuthStore } from '../src/stores/authStore';
import { useLanguageStore } from '../src/i18n/languageStore';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import api from '../src/services/apiClient';

import { TiroDevanagariHindi_400Regular } from '@expo-google-fonts/tiro-devanagari-hindi';
import { HindSiliguri_400Regular } from '@expo-google-fonts/hind-siliguri';
import { NotoSansTelugu_400Regular } from '@expo-google-fonts/noto-sans-telugu';
import { HindMadurai_400Regular } from '@expo-google-fonts/hind-madurai';

import { useAlertStore } from '../src/stores/alertStore';
import { AnimatedAlert } from '../src/components/AnimatedAlert';

const originalShow = Toast.show;
Toast.show = (params) => {
  if (params.type === 'success' || params.type === 'error' || params.type === 'info') {
    useAlertStore.getState().showAlert(params as any);
  } else {
    originalShow(params);
  }
};
const LOCATION_TASK = 'BACKGROUND_LOCATION';

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }: any) => {
  if (error) return;
  const { locations } = data as any;
  const { latitude, longitude } = locations[0].coords;
  const socket = useSocketStore.getState().socket;
  if (socket) {
    socket.emit('partner:location', { lat: latitude, lng: longitude });
  }
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // default 1 min
    },
  },
});

// For specific keys, we would set queryClient.setQueryDefaults, e.g.:
queryClient.setQueryDefaults(['nearbyJobs'], { staleTime: 30_000 });
queryClient.setQueryDefaults(['partnerList'], { staleTime: 300_000 });
queryClient.setQueryDefaults(['walletBalance'], { staleTime: 60_000 });
queryClient.setQueryDefaults(['userProfile'], { staleTime: 600_000 });

export default function RootLayout() {
  useSocketSetup();
  
  const [authHydrated, setAuthHydrated] = useState(false);
  const [langHydrated, setLangHydrated] = useState(false);

  useEffect(() => {
    // Check if auth store is hydrated
    const unsubAuth = useAuthStore.persist.onFinishHydration(() => {
      setAuthHydrated(true);
    });
    if (useAuthStore.persist.hasHydrated()) {
      setAuthHydrated(true);
    }

    // Check if language store is hydrated
    const unsubLang = useLanguageStore.persist.onFinishHydration(() => {
      setLangHydrated(true);
    });
    if (useLanguageStore.persist.hasHydrated()) {
      setLangHydrated(true);
    }

    return () => {
      unsubAuth();
      unsubLang();
    };
  }, []);
  
  const [fontsLoaded] = useFonts({
    'Syne-Regular':     require('../assets/fonts/Syne-Regular.ttf'),
    'Syne-Bold':        require('../assets/fonts/Syne-Bold.ttf'),
    'Syne-ExtraBold':   require('../assets/fonts/Syne-ExtraBold.ttf'),
    'Nunito-Regular':   require('../assets/fonts/Nunito-Regular.ttf'),
    'Nunito-SemiBold':  require('../assets/fonts/Nunito-SemiBold.ttf'),
    'Nunito-Bold':      require('../assets/fonts/Nunito-Bold.ttf'),
    'DMMono-Regular':   require('../assets/fonts/DMMono-Regular.ttf'),
    'DMMono-Medium':    require('../assets/fonts/DMMono-Medium.ttf'),
    'TiroDevanagariHindi-Regular': TiroDevanagariHindi_400Regular,
    'HindSiliguri-Regular': HindSiliguri_400Regular,
    'NotoSansTelugu-Regular': NotoSansTelugu_400Regular,
    'HindMadurai-Regular': HindMadurai_400Regular,
  });

  const [i18nReady, setI18nReady] = useState(false);
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

  useEffect(() => {
    // 1. Listen for foreground notifications and add them to standard notification state
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      const { title, body, data } = notification.request.content;
      try {
        const { useNotificationStore } = require('../src/store/notificationStore');
        useNotificationStore.getState().addNotification({
          id: notification.request.identifier,
          type: data?.type || 'GENERAL',
          title: title || 'New Notification',
          body: body || '',
          isRead: false,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.error('[Notification Listener] Failed to update store:', err);
      }
    });

    // 2. Listen for notification response (taps) and route to correct screen
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (!data) return;

      const role = useAuthStore.getState().user?.role;
      const jobId = data.jobId as string | undefined;
      const pushType = data.type as string | undefined;

      console.log(`[Notification Response] Tapped push of type: ${pushType}, jobId: ${jobId}, userRole: ${role}`);

      switch (pushType) {
        case 'NEW_JOB':
          if (role === 'PARTNER' && jobId) {
            router.push({ pathname: '/(partner)/(modals)/job-detail', params: { id: jobId } });
          }
          break;
        case 'WORKER_JOINED':
        case 'JOB_FILLED':
        case 'JOB_ACCEPTED':
        case 'JOB_COMPLETED':
        case 'JOB_START_REQUESTED':
          if (role === 'CLIENT' && jobId) {
            router.push({ pathname: '/(client)/(modals)/job-detail', params: { id: jobId } });
          }
          break;
        case 'EXTENSION_REQUESTED':
          if (jobId) {
            if (role === 'CLIENT') {
              router.push({ pathname: '/(client)/(modals)/job-detail', params: { id: jobId } });
            } else if (role === 'PARTNER') {
              router.push({ pathname: '/(partner)/(modals)/job-detail', params: { id: jobId } });
            }
          }
          break;
        case 'PAYMENT_RECEIVED':
          if (role === 'PARTNER') {
            router.push({ pathname: '/(partner)/(modals)/wallet' });
          }
          break;
        case 'AADHAAR_VERIFIED':
          if (role === 'PARTNER') {
            router.push('/(partner)/profile');
          }
          break;
        default:
          break;
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
  }, []);

  const { socket } = useSocketStore();
  
  useEffect(() => {
    if (!socket) return;

    socket.on('job:completed', (payload: any) => {
      router.push(`/(client)/(modals)/payment?jobId=${payload.jobId}&amount=${payload.totalAmount}`);
      Toast.show({ type: 'info', text1: 'Job Done!', text2: payload.message });
    });

    socket.on('job:start-requested', (payload: any) => {
      queryClient.invalidateQueries({ queryKey: ['clientJobs'] });
      queryClient.invalidateQueries({ queryKey: ['activeOpsJobs'] });
      Toast.show({
        type: 'info',
        text1: 'Start Request Received',
        text2: payload.message || 'Worker wants to start the job. Tap to view/accept.',
        onPress: () => {
          Toast.hide();
          router.push({
            pathname: '/(client)/(modals)/job-detail',
            params: { id: payload.jobId }
          });
        }
      });
    });

    socket.on('job:started', (payload: any) => {
      queryClient.invalidateQueries({ queryKey: ['partnerJobs'] });
      queryClient.invalidateQueries({ queryKey: ['nearbyJobs'] });
      Toast.show({
        type: 'success',
        text1: 'Job Started!',
        text2: payload.message || 'Work is now in progress.'
      });
    });

    socket.on('job:start-declined', (payload: any) => {
      queryClient.invalidateQueries({ queryKey: ['partnerJobs'] });
      queryClient.invalidateQueries({ queryKey: ['nearbyJobs'] });
      Toast.show({
        type: 'error',
        text1: 'Start Request Declined',
        text2: payload.message || 'Client declined the start request.'
      });
    });

    socket.on('job:finalized', (payload: any) => {
      queryClient.invalidateQueries({ queryKey: ['partnerJobs'] });
      Toast.show({
        type: 'info',
        text1: 'Work Finalized',
        text2: payload.message || 'Client has completed work. Payment is pending.'
      });
    });

    socket.on('payment:received', () => {
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    });

    return () => {
      socket.off('job:completed');
      socket.off('job:start-requested');
      socket.off('job:started');
      socket.off('job:start-declined');
      socket.off('job:finalized');
      socket.off('payment:received');
    };
  }, [socket, queryClient, router]);
  // Push Notification Registration Helper
  const registerForPushNotifications = async () => {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B1A',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('[Push Notification] Permission not granted.');
        return;
      }

      const projectId = Constants?.expoConfig?.extra?.eas?.projectId || 
                        Constants?.easConfig?.projectId;
      
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId
      })).data;

      console.log('[Push Notification] Expo token retrieved:', token);
      return token;
    } catch (e: any) {
      console.warn('[Push Notification] Error registering push notifications:', e.message || e);
    }
  };

  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      registerForPushNotifications().then(token => {
        if (token) {
          api.put('/auth/profile', { pushToken: token })
            .then(() => console.log('[Push Notification] Registered push token on backend.'))
            .catch(err => console.error('[Push Notification] Failed to sync push token with backend:', err));
        }
      });
    }
  }, [user]);

  useEffect(() => {
    if (fontsLoaded && i18nReady && authHydrated && langHydrated) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, i18nReady, authHydrated, langHydrated]);

  if (!fontsLoaded || !i18nReady || !authHydrated || !langHydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(partner)" />
          <Stack.Screen name="(client)" />
          <Stack.Screen name="(shared)" />
        </Stack>
        <Toast />
        <AnimatedAlert />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
