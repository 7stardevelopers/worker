import '../global.css';
import React, { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { AuthProvider } from '@context/auth';
import { ThemeProvider, useTheme } from '@context/theme';
import { ProviderProvider } from '@context/provider';
import SplashOverlay from '@components/Splash';
import '@utils/location';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const { isDark } = useTheme();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data ?? {};
      if (data.type === 'job_available' || (data.type === 'job_request' && data.booking_id)) {
        router.push('/(tabs)');
      } else if (data.type === 'account_approved') {
        router.replace('/');
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
        <Stack.Screen name="job/chat"             options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="onboarding"           options={{ animation: 'fade' }} />
        <Stack.Screen name="pending"              options={{ animation: 'none' }} />
        <Stack.Screen name="notifications"        options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="support/index"        options={{ animation: 'slide_from_right' }} />
      </Stack>
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
