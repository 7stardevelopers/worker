import React from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';

// The whole card is the tap target (the worker toggles this constantly, often
// one-handed); the native Switch only shows the state. `loading` ignores taps
// rather than disabling the control, so background refreshes don't flicker it.
export default function OnlineToggle({ isOnline, onToggle, loading }) {
  const { Colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
      onPress={loading ? undefined : onToggle}
      activeOpacity={0.8}
      accessibilityRole="switch"
      accessibilityLabel="Available for jobs"
      accessibilityState={{ checked: isOnline, busy: !!loading }}
    >
      <View style={[styles.dot, { backgroundColor: isOnline ? Colors.success : Colors.subtleForeground }]} />
      <View style={styles.textCol}>
        <Text style={[styles.status, { color: Colors.foreground }]}>
          {isOnline ? 'Online' : 'Offline'}
        </Text>
        <Text style={[styles.sub, { color: Colors.mutedForeground }]}>
          {isOnline ? 'You are receiving job requests' : 'Tap to start receiving job requests'}
        </Text>
      </View>
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants">
        <Switch
          value={isOnline}
          trackColor={{ false: Colors.surfaceRaised, true: Colors.success }}
          thumbColor={Colors.onPrimary}
          ios_backgroundColor={Colors.surfaceRaised}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base, marginHorizontal: Spacing.base },
  dot:     { width: 8, height: 8, borderRadius: 4 },
  textCol: { flex: 1, gap: 2 },
  status:  { fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  sub:     { fontSize: FontSize.sm },
});
