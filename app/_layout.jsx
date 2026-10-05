import '../global.css';
import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Notifications from '@utils/notifications';
import { router } from 'expo-router';
import { AuthProvider } from '@context/auth';
import { ThemeProvider, useTheme } from '@context/theme';
import { ProviderProvider } from '@context/provider';
import SplashOverlay from '@components/Splash';
import OfflineBanner from '@components/OfflineBanner';
import '@utils/location';

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
  }),
});

// Backend pushes carry no channelId, so Android delivers them on "default".
// Make that channel urgent — a job request must ring and pop up as heads-up.
if (Notifications && Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Job alerts',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#6366F1',
  }).catch(() => {});
}

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const { isDark } = useTheme();

  useEffect(() => {
    if (!Notifications) return;
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data ?? {};
      if (data.type === 'provider_approved' || data.type === 'account_approved' || data.type === 'photo_reset') {
        router.replace('/'); // re-run the auth gate → straight into the app (or the photo retake)
      } else if (data.type === 'support_reply' && data.ticket_id) {
        router.push(`/support/${data.ticket_id}`);
      } else if (data.booking_id) {
        // New job requests open on the job itself, where the worker can accept.
        router.push(`/job/${data.booking_id}`);
      } else {
        router.push('/notifications');
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(auth)"               options={{ animation: 'none' }} />
        <Stack.Screen name="(tabs)"               options={{ animation: 'none' }} />
        <Stack.Screen name="job/[id]"             options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="customer/[id]"        options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="onboarding"           options={{ animation: 'fade' }} />
        <Stack.Screen name="pending"              options={{ animation: 'none' }} />
        <Stack.Screen name="suspended"            options={{ animation: 'none' }} />
        <Stack.Screen name="notifications"        options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="support/index"        options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="support/[id]"         options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="chat/[id]"            options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="permissions"          options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
      <OfflineBanner />
      {showSplash && <SplashOverlay onDone={() => setShowSplash(false)} />}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <ProviderProvider>
              <AppContent />
            </ProviderProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
