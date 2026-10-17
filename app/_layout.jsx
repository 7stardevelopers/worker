import '../global.css';
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
});

function AppContent() {
  const { isDark, Colors } = useTheme();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data ?? {};
      if (data.type === 'job_available' && data.booking_id) {
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
