import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';

export default function PendingScreen() {
  const { Colors } = useTheme();
  const { logout } = useAuth();
  const { profile, fetchProfile, loading } = useProvider();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (profile?.status === 'APPROVED') {
      router.replace('/(tabs)');
    }
  }, [profile]);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    await fetchProfile();
    setChecking(false);
    // If still PENDING after refetch, tell the user
    if (profile?.status !== 'APPROVED') {
      Alert.alert('Still Under Review', 'Your application is still being reviewed. Please check back later or wait for the approval notification.');
    }
  }, [fetchProfile, profile]);

  const busy = checking || loading;

  // Detect incomplete onboarding — if bank account not set, they haven't finished all 5 steps
  const isIncomplete = !profile?.bank_account_number;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.content}>

        <View style={[styles.iconCircle, { backgroundColor: Colors.warning + '20' }]}>
          <Ionicons name="time-outline" size={52} color={Colors.warning} />
        </View>

        <Text style={[styles.title, { color: Colors.foreground }]}>Application Under Review</Text>
        <Text style={[styles.body, { color: Colors.mutedForeground }]}>
          {isIncomplete
            ? "It looks like your onboarding isn't complete yet. Finish all 5 steps to submit your application."
            : "Our team is verifying your documents and details. This usually takes up to 24 hours. You'll receive a push notification once approved."
          }
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

        {isIncomplete && (
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => router.replace('/onboarding/personal')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.btnGrad}
            >
              <Ionicons name="arrow-forward-circle-outline" size={18} color="#FFF" />
              <Text style={styles.btnText}>Continue Onboarding</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.refreshBtn, { opacity: busy ? 0.6 : 1 }]}
          onPress={checkStatus}
          disabled={busy}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={isIncomplete ? ['#374151', '#4B5563'] : ['#6366F1', '#8B5CF6']}
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
  continueBtn: { width: '100%', borderRadius: Radius.lg, overflow: 'hidden', height: 56 },
  refreshBtn:  { width: '100%', borderRadius: Radius.lg, overflow: 'hidden', height: 56 },
  logoutText:  { fontSize: FontSize.sm, textDecorationLine: 'underline', paddingVertical: Spacing.sm },
  btnGrad:     { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  btnText:     { color: '#FFF', fontSize: FontSize.body, fontWeight: FontWeight.bold },
});
