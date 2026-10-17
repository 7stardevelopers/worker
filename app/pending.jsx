import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
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

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  // If bank details are missing, the 5-step onboarding wasn't finished.
  const isIncomplete = !profile?.bank_account_number;

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
          {isIncomplete
            ? 'Your onboarding is not complete yet. Finish all 5 steps to submit your application.'
            : 'This usually takes up to 24 hours. You can close the app; we will notify you.'}
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

      <FooterBar>
        {isIncomplete ? (
          <Button title="Continue onboarding" onPress={() => router.replace('/onboarding/personal')} />
        ) : (
          <Button title="Check status" icon="refresh" onPress={checkStatus} loading={checking} />
        )}
        <Button title="Log out" variant="ghost" onPress={handleLogout} compact />
      </FooterBar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  content:    { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, gap: Spacing.base },
  iconCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  title:      { fontSize: FontSize.h1, fontWeight: FontWeight.bold, textAlign: 'center' },
  body:       { fontSize: FontSize.body, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  card:       { alignSelf: 'stretch', borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base, gap: Spacing.md, marginTop: Spacing.md },
  stepRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepText:   { flex: 1, fontSize: FontSize.sm },
});
