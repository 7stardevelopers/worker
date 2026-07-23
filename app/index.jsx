import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { DarkColors } from '@constants/theme';

export default function Index() {
  const { token, loading: authLoading } = useAuth();
  const { profile, profileLoaded, fetchProfile } = useProvider();

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    fetchProfile();
  }, [token, authLoading]);

  useEffect(() => {
    if (!profileLoaded) return;
    if (!profile) {
      // No provider record yet — brand new user
      router.replace('/onboarding/personal');
      return;
    }
    if (profile.status === 'APPROVED') {
      router.replace('/(tabs)');
    } else if (profile.status === 'PENDING') {
      router.replace('/pending');
    } else {
      router.replace('/onboarding/personal');
    }
  }, [profile, profileLoaded]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: DarkColors.background }}>
      <ActivityIndicator color={DarkColors.primary} size="large" />
    </View>
  );
}
