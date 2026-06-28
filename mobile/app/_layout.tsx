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
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // Logic for unread badge could go here
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.type === 'NEW_JOB') {
        router.push('/(partner)'); // or appropriate path
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

    socket.on('payment:received', () => {
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    });

    return () => {
      socket.off('job:completed');
      socket.off('payment:received');
    };
  }, [socket, queryClient, router]);

  useEffect(() => {
    if (fontsLoaded && i18nReady && authHydrated && langHydrated) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, i18nReady, authHydrated, langHydrated]);

  if (!fontsLoaded || !i18nReady || !authHydrated || !langHydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
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
