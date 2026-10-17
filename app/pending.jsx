import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { routeForProvider } from '@utils/onboarding';
import { api } from '@utils/api';
import { alertError } from '@utils/errors';
import FooterBar from '@components/FooterBar';
import Button from '@components/Button';

// TEMPORARY (testing only) — remove together with backend
// POST /providers/me/temp-approve once the test worker is approved.
const TEMP_APPROVE_PHONE = '9390233299';

const STEPS = [
  { icon: 'document-text-outline',    text: 'Our team checks your documents' },
  { icon: 'shield-checkmark-outline', text: 'Background check' },
  { icon: 'notifications-outline',    text: 'You get a notification once approved' },
];

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
        Alert.alert('Still under review', 'Your application is still being reviewed. We will notify you once it is approved.');
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

  // TEMPORARY — see TEMP_APPROVE_PHONE
  const canTempApprove = String(user?.phone ?? '').replace(/\D/g, '').endsWith(TEMP_APPROVE_PHONE);
  const tempApprove = async () => {
    setChecking(true);
    try {
      await api.post('/providers/me/temp-approve', {}, token);
      await refreshStatus();
    } catch (e) {
      alertError('Approve failed', e);
    } finally {
      setChecking(false);
    }
  };

  const confirmLogout = () => Alert.alert('Log out', 'Are you sure you want to log out?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Log out', style: 'destructive', onPress: logout },
  ]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Ionicons name="time-outline" size={32} color={Colors.warning} />
        </View>

        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: Colors.foreground }]}>Application under review</Text>
          <Text style={[styles.body, { color: Colors.mutedForeground }]}>
            We are verifying your documents and details. This usually takes up to 24 hours.
          </Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          {STEPS.map(item => (
            <View key={item.text} style={styles.infoRow}>
              <Ionicons name={item.icon} size={18} color={Colors.mutedForeground} />
              <Text style={[styles.infoText, { color: Colors.foreground }]}>{item.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <FooterBar>
        <Button title="Check status" icon="refresh-outline" onPress={checkStatus} loading={busy} />
        {canTempApprove && (
          <Button title="Approve test account (testing only)" variant="secondary" onPress={tempApprove} disabled={busy} />
        )}
        <Button title="Log out" variant="ghost" onPress={confirmLogout} />
      </FooterBar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  content:    { flexGrow: 1, padding: Spacing.lg, justifyContent: 'center', alignItems: 'center', gap: Spacing.xl },
  iconCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', alignItems: 'center' },
  textBlock:  { gap: Spacing.sm, alignItems: 'center' },
  title:      { fontSize: FontSize.h1, fontWeight: FontWeight.bold, textAlign: 'center' },
  body:       { fontSize: FontSize.body, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  infoCard:   { alignSelf: 'stretch', borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base, gap: Spacing.md },
  infoRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  infoText:   { fontSize: FontSize.sm, flex: 1 },
});
