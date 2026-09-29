import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@context/theme';
import { useProvider } from '@context/provider';
import { APP_NAME } from '@constants/brand';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';

const REASONS = [
  { icon: 'navigate-outline',      title: 'Show customers you\'re on the way', body: 'Your live position appears on the customer\'s map while you travel to them and while you work.' },
  { icon: 'briefcase-outline',     title: 'Keep tracking during a job',        body: 'Location keeps updating in the background — even with the app closed or Maps open — but only while you have an active job.' },
  { icon: 'shield-checkmark-outline', title: 'Stops when the job ends',      body: 'Tracking stops automatically when the job is completed or cancelled, or when you log out.' },
];

/**
 * Prominent disclosure shown before the OS location prompts (required by
 * Google Play for background location). Opened when the worker tries to go
 * online or start a trip without "Allow all the time".
 * `?then=online` → go online automatically once permission is granted.
 */
export default function PermissionsScreen() {
  const { Colors } = useTheme();
  const { then } = useLocalSearchParams();
  const { refreshLocationPermission, toggleAvailability, isAvailable } = useProvider();
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const allow = async () => {
    setBusy(true);
    try {
      const fg = await Location.requestForegroundPermissionsAsync();
      if (fg.status !== 'granted') { setBlocked(!fg.canAskAgain); return; }
      // Android 11+ sends the worker to Settings for "Allow all the time".
      const bg = await Location.requestBackgroundPermissionsAsync();
      if (bg.status !== 'granted') { setBlocked(!bg.canAskAgain); return; }
      await refreshLocationPermission();
      if (then === 'online' && !isAvailable) await toggleAvailability();
      router.back();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={styles.close} hitSlop={12} accessibilityLabel="Not now">
          <Ionicons name="close" size={24} color={Colors.mutedForeground} />
        </TouchableOpacity>

        <View style={[styles.iconCircle, { backgroundColor: Colors.primary + '20' }]}>
          <Ionicons name="location" size={44} color={Colors.primary} />
        </View>
        <Text style={[styles.title, { color: Colors.foreground }]}>Allow location access</Text>
        <Text style={[styles.sub, { color: Colors.mutedForeground }]}>
          {APP_NAME} uses your location, including in the background, so customers can track their expert.
        </Text>

        <View style={styles.reasons}>
          {REASONS.map(r => (
            <View key={r.title} style={[styles.reason, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
              <Ionicons name={r.icon} size={22} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.reasonTitle, { color: Colors.foreground }]}>{r.title}</Text>
                <Text style={[styles.reasonBody, { color: Colors.mutedForeground }]}>{r.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {Platform.OS === 'android' && (
          <View style={[styles.tip, { backgroundColor: Colors.info + '12', borderColor: Colors.info + '35' }]}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.info} />
            <Text style={[styles.tipText, { color: Colors.foreground }]}>
              On the next screen choose <Text style={styles.bold}>"Allow all the time"</Text>.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {blocked ? (
          <>
            <Text style={[styles.blocked, { color: Colors.warning }]}>
              Location access is turned off for {APP_NAME}. Enable it in Settings → Location → "Allow all the time".
            </Text>
            <TouchableOpacity style={styles.btn} onPress={() => Linking.openSettings()} activeOpacity={0.85}>
              <LinearGradient colors={Colors.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGrad}>
                <Ionicons name="settings-outline" size={18} color="#FFF" />
                <Text style={styles.btnText}>Open Settings</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[styles.btn, { opacity: busy ? 0.6 : 1 }]} onPress={allow} disabled={busy} activeOpacity={0.85}>
            <LinearGradient colors={Colors.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGrad}>
              <Text style={styles.btnText}>{busy ? 'Waiting for permission…' : 'Continue'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => router.back()} style={styles.later}>
          <Text style={[styles.laterText, { color: Colors.mutedForeground }]}>Not now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  scroll:      { padding: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  close:       { alignSelf: 'flex-end' },
  iconCircle:  { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
  title:       { fontSize: FontSize.h1, fontWeight: FontWeight.bold, textAlign: 'center' },
  sub:         { fontSize: FontSize.body, textAlign: 'center', lineHeight: 22 },
  reasons:     { alignSelf: 'stretch', gap: Spacing.sm, marginTop: Spacing.sm },
  reason:      { flexDirection: 'row', gap: Spacing.md, padding: Spacing.base, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth },
  reasonTitle: { fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  reasonBody:  { fontSize: FontSize.sm, lineHeight: 19, marginTop: 2 },
  tip:         { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  tipText:     { flex: 1, fontSize: FontSize.sm },
  bold:        { fontWeight: FontWeight.bold },
  footer:      { padding: Spacing.xl, paddingTop: Spacing.sm, gap: Spacing.sm },
  blocked:     { fontSize: FontSize.sm, textAlign: 'center' },
  btn:         { height: 54, borderRadius: Radius.md, overflow: 'hidden' },
  btnGrad:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  btnText:     { color: '#FFF', fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  later:       { alignItems: 'center', paddingVertical: Spacing.sm },
  laterText:   { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});
