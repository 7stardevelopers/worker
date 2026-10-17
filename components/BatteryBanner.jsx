import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/theme';
import { isBatteryRestricted, batteryTip, openBatterySettings } from '@utils/battery';
import { APP_NAME } from '@constants/brand';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';

/**
 * Warns when the phone's battery saver may kill live location sharing and opens
 * the app's settings to fix it. Re-checks on return to the app, so it hides by
 * itself once the worker has changed the setting.
 */
export default function BatteryBanner({ style }) {
  const { Colors } = useTheme();
  const [restricted, setRestricted] = useState(false);

  useEffect(() => {
    let alive = true;
    const check = () => isBatteryRestricted().then(r => { if (alive) setRestricted(r); });
    check();
    const sub = AppState.addEventListener('change', s => { if (s === 'active') check(); });
    return () => { alive = false; sub.remove(); };
  }, []);

  if (!restricted) return null;
  return (
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: Colors.warning + '18', borderColor: Colors.warning + '40' }, style]}
      onPress={openBatterySettings}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Fix battery settings"
      hitSlop={8}
    >
      <Ionicons name="battery-dead-outline" size={18} color={Colors.warning} />
      <View style={styles.body}>
        <Text style={[styles.title, { color: Colors.foreground }]}>Your phone may stop sharing your location</Text>
        <Text style={[styles.text, { color: Colors.mutedForeground }]}>Settings → {APP_NAME} → {batteryTip()}</Text>
      </View>
      <Text style={[styles.cta, { color: Colors.warning }]}>Fix</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  body:   { flex: 1, gap: 2 },
  title:  { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  text:   { fontSize: FontSize.xs, lineHeight: 16 },
  cta:    { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
});
