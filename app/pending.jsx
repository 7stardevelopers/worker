import React, { useState, useEffect, useCallback } from 'react';
<<<<<<< HEAD
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
=======
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, AppState } from 'react-native';
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
<<<<<<< HEAD
import FooterBar from '@components/FooterBar';
import Button from '@components/Button';

const STEPS = [
  { icon: 'document-text-outline',    text: 'We verify your documents' },
  { icon: 'shield-checkmark-outline', text: 'A background check is completed' },
  { icon: 'notifications-outline',    text: 'You get a notification once approved' },
];

export default function PendingScreen() {
  const { Colors } = useTheme();
  const { logout } = useAuth();
  const { profile, fetchProfile } = useProvider();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (profile?.status === 'APPROVED') router.replace('/(tabs)');
  }, [profile]);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    const latest = await fetchProfile();
    setChecking(false);
    // Use the freshly fetched profile, not the stale one from this render.
    if (latest && latest.status !== 'APPROVED') {
      Alert.alert('Still under review', 'Your application is still being reviewed. We will notify you once it is approved.');
    }
  }, [fetchProfile]);
=======
import { routeForProvider } from '@utils/onboarding';
import { api } from '@utils/api';
import { alertError } from '@utils/errors';

// TEMPORARY (testing only) — remove together with backend
// POST /providers/me/temp-approve once the test worker is approved.
const TEMP_APPROVE_PHONE = '9390233299';

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
>>>>>>> e26961c635b60a007766324f445890a2e88d7232

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

<<<<<<< HEAD
  // If bank details are missing, the 5-step onboarding wasn't finished.
  const isIncomplete = !profile?.bank_account_number;
=======
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
>>>>>>> e26961c635b60a007766324f445890a2e88d7232

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.iconCircle, { backgroundColor: Colors.warning + '1A' }]}>
          <Ionicons name="time-outline" size={32} color={Colors.warning} />
        </View>

        <Text style={[styles.title, { color: Colors.foreground }]}>
          {isIncomplete ? 'Finish your application' : 'Application under review'}
        </Text>
        <Text style={[styles.body, { color: Colors.mutedForeground }]}>
<<<<<<< HEAD
          {isIncomplete
            ? 'Your onboarding is not complete yet. Finish all 5 steps to submit your application.'
            : 'This usually takes up to 24 hours. You can close the app; we will notify you.'}
=======
          Our team is verifying your documents and details. This usually takes up to 24 hours. You'll receive a push notification once approved.
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
        </Text>

        {!isIncomplete ? (
          <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            {STEPS.map(step => (
              <View key={step.text} style={styles.stepRow}>
                <Ionicons name={step.icon} size={18} color={Colors.mutedForeground} />
                <Text style={[styles.stepText, { color: Colors.foreground }]}>{step.text}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

<<<<<<< HEAD
      <FooterBar>
        {isIncomplete ? (
          <Button title="Continue onboarding" onPress={() => router.replace('/onboarding/personal')} />
        ) : (
          <Button title="Check status" icon="refresh" onPress={checkStatus} loading={checking} />
        )}
        <Button title="Log out" variant="ghost" onPress={handleLogout} compact />
      </FooterBar>
=======
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

        {canTempApprove && (
          <TouchableOpacity onPress={tempApprove} disabled={busy} activeOpacity={0.8}
            style={[styles.tempBtn, { borderColor: Colors.warning }]} accessibilityRole="button"
            accessibilityLabel="Approve test account">
            <Text style={[styles.tempText, { color: Colors.warning }]}>Approve test account (testing only)</Text>
          </TouchableOpacity>
        )}

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
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
  root:       { flex: 1 },
  content:    { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, gap: Spacing.base },
  iconCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  title:      { fontSize: FontSize.h1, fontWeight: FontWeight.bold, textAlign: 'center' },
  body:       { fontSize: FontSize.body, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  card:       { alignSelf: 'stretch', borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base, gap: Spacing.md, marginTop: Spacing.md },
  stepRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepText:   { flex: 1, fontSize: FontSize.sm },
=======
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
  tempBtn:     { width: '100%', borderRadius: Radius.lg, borderWidth: 1, borderStyle: 'dashed', paddingVertical: Spacing.md, alignItems: 'center' },
  tempText:    { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
});
