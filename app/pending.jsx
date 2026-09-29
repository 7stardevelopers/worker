import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { routeForProvider } from '@utils/onboarding';

export default function PendingScreen() {
  const { Colors } = useTheme();
  const { user, token, logout } = useAuth();
  const { fetchProfile, loading } = useProvider();
  const [checking, setChecking] = useState(false);

  // Refetch and move on if the worker no longer belongs here (approved,
  // suspended, or a document was rejected and needs re-uploading).
  // Resolves true when still pending, false when routed away, null on failure.
  const refreshStatus = useCallback(async () => {
    const fresh = await fetchProfile();
    if (!fresh) return null;
    const target = await routeForProvider(fresh, user, token);
    if (target === '/pending') return true;
    router.replace(target);
    return false;
  }, [fetchProfile, user, token]);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const stillPending = await refreshStatus();
      if (stillPending === null) throw new Error();
      if (stillPending) {
        Alert.alert('Still Under Review', 'Your application is still being reviewed. Please check back later or wait for the approval notification.');
      }
    } catch {
      Alert.alert('Connection problem', "Couldn't check your status. Please try again.");
    } finally {
      setChecking(false);
    }
  }, [refreshStatus]);

  // Approval often lands while the app is in the background (push → reopen).
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') refreshStatus().catch(() => {});
    });
    return () => sub.remove();
  }, [refreshStatus]);

  const busy = checking || loading;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.content}>

        <View style={[styles.iconCircle, { backgroundColor: Colors.warning + '20' }]}>
          <Ionicons name="time-outline" size={52} color={Colors.warning} />
        </View>

        <Text style={[styles.title, { color: Colors.foreground }]}>Application Under Review</Text>
        <Text style={[styles.body, { color: Colors.mutedForeground }]}>
          Our team is verifying your documents and details. This usually takes up to 24 hours. You'll receive a push notification once approved.
        </Text>

        <View style={[styles.infoCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          {[
            { icon: 'document-text-outline',    text: 'Documents verified by our team'  },
            { icon: 'shield-checkmark-outline', text: 'Background check in progress'    },
            { icon: 'notifications-outline',    text: 'Push notification when approved' },
          ].map(item => (
            <View key={item.text} style={styles.infoRow}>
              <Ionicons name={item.icon} size={18} color={Colors.primary} />
              <Text style={[styles.infoText, { color: Colors.mutedForeground }]}>{item.text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.refreshBtn, { opacity: busy ? 0.6 : 1 }]}
          onPress={checkStatus}
          disabled={busy}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={Colors.gradientPrimary}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.btnGrad}
          >
            {busy
              ? <ActivityIndicator color="#FFF" size="small" />
              : <>
                  <Ionicons name="refresh-outline" size={18} color="#FFF" />
                  <Text style={styles.btnText}>Check Status</Text>
                </>
            }
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => Alert.alert('Log Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: logout },
          ])}
          activeOpacity={0.7}
        >
          <Text style={[styles.logoutText, { color: Colors.mutedForeground }]}>Log Out</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  content:     { flex: 1, padding: Spacing.base, justifyContent: 'center', alignItems: 'center', gap: Spacing.lg },
  iconCircle:  { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  title:       { fontSize: FontSize.h1, fontWeight: FontWeight.bold, textAlign: 'center' },
  body:        { fontSize: FontSize.body, textAlign: 'center', lineHeight: 24, paddingHorizontal: Spacing.base },
  infoCard:    { width: '100%', borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base, gap: Spacing.md },
  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  infoText:    { fontSize: FontSize.sm, flex: 1 },
  refreshBtn:  { width: '100%', borderRadius: Radius.lg, overflow: 'hidden', height: 56 },
  logoutText:  { fontSize: FontSize.sm, textDecorationLine: 'underline', paddingVertical: Spacing.sm },
  btnGrad:     { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  btnText:     { color: '#FFF', fontSize: FontSize.body, fontWeight: FontWeight.bold },
});
