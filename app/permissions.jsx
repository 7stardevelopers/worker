import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@context/theme';
import { useProvider } from '@context/provider';
import { requestTrackingPermission, IS_EXPO_GO } from '@utils/location';
import { APP_NAME } from '@constants/brand';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import FooterBar from '@components/FooterBar';
import Button from '@components/Button';

const REASONS = [
  { icon: 'navigate-outline',         title: "Show customers you're on the way", body: "Your live position appears on the customer's map while you travel to them and while you work." },
  { icon: 'briefcase-outline',        title: 'Keep tracking during a job',        body: 'Location keeps updating while the app is open or in the background, even with Maps open, but only while you have an active job. Closing the app stops sharing.' },
  { icon: 'shield-checkmark-outline', title: 'Stops when the job ends',           body: 'Tracking stops automatically when the job is completed or cancelled, when you log out, or when you fully close the app.' },
];

/**
 * Prominent disclosure shown before the OS location prompts. Opened when the
 * worker tries to go online or start a trip without location permission
 * ("While using the app" on Android, "Always" on iOS).
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
      const { granted, blocked: isBlocked } = await requestTrackingPermission();
      if (!granted) { setBlocked(isBlocked); return; }
      await refreshLocationPermission();
      if (then === 'online' && !isAvailable) await toggleAvailability();
      router.back();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.close}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Not now"
        >
          <Ionicons name="close" size={24} color={Colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.iconCircle, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Ionicons name="location-outline" size={30} color={Colors.primary} />
        </View>
        <Text style={[styles.title, { color: Colors.foreground }]}>Allow location access</Text>
        <Text style={[styles.sub, { color: Colors.mutedForeground }]}>
          {APP_NAME} uses your location while the app is open or in the background, so customers can track their expert.
        </Text>

        <View style={[styles.reasons, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          {REASONS.map((r, i) => (
            <View
              key={r.title}
              style={[styles.reason, i < REASONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight }]}
            >
              <Ionicons name={r.icon} size={20} color={Colors.mutedForeground} />
              <View style={styles.flex}>
                <Text style={[styles.reasonTitle, { color: Colors.foreground }]}>{r.title}</Text>
                <Text style={[styles.reasonBody, { color: Colors.mutedForeground }]}>{r.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {IS_EXPO_GO && (
          <View style={[styles.tip, { backgroundColor: Colors.warning + '1A' }]}>
            <Ionicons name="flask-outline" size={18} color={Colors.warning} />
            <Text style={[styles.tipText, { color: Colors.foreground }]}>
              Testing in Expo Go: location is shared only while the app is open. Install a development build for background tracking.
            </Text>
          </View>
        )}

        {Platform.OS === 'android' && !IS_EXPO_GO && (
          <View style={[styles.tip, { backgroundColor: Colors.info + '1A' }]}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.info} />
            <Text style={[styles.tipText, { color: Colors.foreground }]}>
              On the next screen choose <Text style={styles.bold}>While using the app</Text>.
            </Text>
          </View>
        )}
      </ScrollView>

      <FooterBar>
        {blocked ? (
          <>
            <Text style={[styles.blocked, { color: Colors.warning }]}>
              Location access is turned off for {APP_NAME}. Enable it in Settings, then Location, then {Platform.OS === 'android' ? 'Allow only while using the app' : 'Always'}.
            </Text>
            <Button title="Open Settings" icon="settings-outline" onPress={() => Linking.openSettings()} />
          </>
        ) : (
          <Button title="Continue" onPress={allow} loading={busy} />
        )}
        <Button title="Not now" variant="ghost" onPress={() => router.back()} />
      </FooterBar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  flex:        { flex: 1 },
  topBar:      { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Spacing.base, height: 52, alignItems: 'center' },
  close:       { width: 40, height: 40, marginRight: -Spacing.sm, justifyContent: 'center', alignItems: 'center' },
  scroll:      { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  iconCircle:  { width: 72, height: 72, borderRadius: 36, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  title:       { fontSize: FontSize.h1, fontWeight: FontWeight.bold, textAlign: 'center' },
  sub:         { fontSize: FontSize.body, textAlign: 'center', lineHeight: 22 },
  reasons:     { alignSelf: 'stretch', borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, marginTop: Spacing.sm },
  reason:      { flexDirection: 'row', gap: Spacing.md, padding: Spacing.base },
  reasonTitle: { fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  reasonBody:  { fontSize: FontSize.sm, lineHeight: 19, marginTop: 2 },
  tip:         { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md },
  tipText:     { flex: 1, fontSize: FontSize.sm, lineHeight: 19 },
  bold:        { fontWeight: FontWeight.semibold },
  blocked:     { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 19 },
});
