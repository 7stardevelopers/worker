import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { useTheme } from '@context/theme';
import { routeForProvider } from '@utils/onboarding';
import { APP_NAME } from '@constants/brand';
import LoadingScreen from '@components/LoadingScreen';
import EmptyState from '@components/EmptyState';

export default function Index() {
  const { Colors } = useTheme();
  const { token, user, loading: authLoading } = useAuth();
  const { fetchProfile } = useProvider();
  const [failed, setFailed] = useState(false);

  const route = useCallback(async () => {
    setFailed(false);
    const profile = await fetchProfile();
    if (!profile) { setFailed(true); return; }
    try {
      router.replace(await routeForProvider(profile, user, token));
    } catch {
      setFailed(true);
    }
  }, [fetchProfile, user, token]);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.replace('/(auth)/login'); return; }
    route();
  }, [authLoading, token]);

  if (!failed) return <LoadingScreen brand />;

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <EmptyState
        icon="cloud-offline-outline"
        title={`Can't reach ${APP_NAME}`}
        subtitle="Check your internet connection and try again."
        cta={{ label: 'Try again', onPress: route }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center' },
});
