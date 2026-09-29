import { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { useTheme } from '@context/theme';
import { routeForProvider } from '@utils/onboarding';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { APP_NAME } from '@constants/brand';

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

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      {failed ? (
        <>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.mutedForeground} />
          <Text style={[styles.title, { color: Colors.foreground }]}>Can't reach {APP_NAME}</Text>
          <Text style={[styles.body, { color: Colors.mutedForeground }]}>
            Check your internet connection and try again.
          </Text>
          <TouchableOpacity
            onPress={route}
            style={[styles.retry, { backgroundColor: Colors.primary }]}
            activeOpacity={0.85}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </>
      ) : (
        <ActivityIndicator color={Colors.primary} size="large" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md, padding: Spacing.xl },
  title:     { fontSize: FontSize.h3, fontWeight: FontWeight.semibold },
  body:      { fontSize: FontSize.sm, textAlign: 'center' },
  retry:     { marginTop: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.md },
  retryText: { color: '#FFF', fontWeight: FontWeight.semibold },
});
