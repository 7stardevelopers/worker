import '../global.css';
<<<<<<< HEAD
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from '@context/auth';
import { ThemeProvider, useTheme } from '@context/theme';
import { ProviderProvider } from '@context/provider';
import '@utils/location';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
  }),
=======
import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Notifications from '@utils/notifications';
import { isViewingChat } from '@utils/chatPresence';
import { openNotification, routeForNotification } from '@utils/notificationRouting';
import { router } from 'expo-router';
import { AuthProvider } from '@context/auth';
import { ThemeProvider, useTheme } from '@context/theme';
import { ProviderProvider } from '@context/provider';
import SplashOverlay from '@components/Splash';
import OfflineBanner from '@components/OfflineBanner';
import ToastHost, { toast } from '@components/Toast';
import '@utils/location';

// While the app is open a push shows as the in-app toast (see AppContent) instead
// of the system banner; it still goes to the notification tray. Job requests
// keep their sound. A chat push for the chat already on screen is hidden.
Notifications?.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification?.request?.content?.data ?? {};
    const hide = data.type === 'new_message' && isViewingChat(data.booking_id);
    const isJob = data.type === 'job_available' || data.type === 'instant_job';
    return {
      shouldShowBanner: false,
      shouldShowList:   !hide,
      shouldPlaySound:  isJob,
      shouldSetBadge:   !hide,
    };
  },
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
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
  const { isDark, Colors } = useTheme();

  useEffect(() => {
    if (!Notifications) return undefined;
    // Tapped while the app was closed — opened by the jobs tab once the auth gate is done.
    Notifications.getLastNotificationResponseAsync()
      .then(r => r && openNotification(r, { coldStart: true }))
      .catch(() => {});
    const tapSub = Notifications.addNotificationResponseReceivedListener(r => openNotification(r));
    // Foreground push → in-app toast; tapping it goes where the push would.
    const recvSub = Notifications.addNotificationReceivedListener(n => {
      const { title, body, data = {} } = n.request.content ?? {};
      if (data.type === 'new_message' && isViewingChat(data.booking_id)) return;
      if (data.type === 'job_taken') return; // silent — useJobFeed removes the job
      const target = routeForNotification(data);
      const kind = data.type === 'job_available' || data.type === 'instant_job' ? 'warning'
        : /cancel|fail|reject|suspend/i.test(`${data.type} ${data.status ?? ''}`) ? 'error'
        : /paid|payment|payout|approved|credit/i.test(data.type ?? '') ? 'success'
        : 'info';
      toast.show({
        type: kind, title, message: body,
        onPress: () => (target === null ? router.replace('/') : router.push(target)),
      });
    });
    return () => { tapSub.remove(); recvSub.remove(); };
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
<<<<<<< HEAD
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="index"          options={{ animation: 'none' }} />
        <Stack.Screen name="(auth)"         options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)"         options={{ animation: 'fade' }} />
        <Stack.Screen name="job/[id]"       options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="customer/[id]"  options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="onboarding"     options={{ animation: 'fade' }} />
        <Stack.Screen name="pending"        options={{ animation: 'fade' }} />
        <Stack.Screen name="notifications"  options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="support/index"  options={{ animation: 'slide_from_right' }} />
      </Stack>
=======
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
      <ToastHost />
      {showSplash && <SplashOverlay onDone={() => setShowSplash(false)} />}
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
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

const styles = StyleSheet.create({
  root: { flex: 1 },
});
