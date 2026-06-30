import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { DarkColors } from '@constants/theme';

export default function Index() {
  const { token, loading: authLoading } = useAuth();
  const { profile, fetchProfile, loading: provLoading } = useProvider();

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    fetchProfile();
  }, [token, authLoading]);

  useEffect(() => {
    if (!profile) return;
    if (profile.status === 'APPROVED') {
      router.replace('/(tabs)');
    } else {
      router.replace('/onboarding/personal');
    }
  }, [profile]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: DarkColors.background }}>
      <ActivityIndicator color={DarkColors.primary} size="large" />
    </View>
  );
}
