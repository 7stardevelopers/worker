import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';

// Native Switch per platform. `loading` ignores presses rather than
// disabling the control, so background profile refreshes don't flicker it.
export default function OnlineToggle({ isOnline, onToggle, loading }) {
  const { Colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
      <View style={[styles.dot, { backgroundColor: isOnline ? Colors.success : Colors.subtleForeground }]} />
      <View style={styles.textCol}>
        <Text style={[styles.status, { color: Colors.foreground }]}>
          {isOnline ? 'Online' : 'Offline'}
        </Text>
        <Text style={[styles.sub, { color: Colors.mutedForeground }]}>
          {isOnline ? 'You are receiving job requests' : 'Go online to receive job requests'}
        </Text>
      </View>
      <Switch
        value={isOnline}
        onValueChange={() => { if (!loading) onToggle(); }}
        trackColor={{ false: Colors.surfaceRaised, true: Colors.success }}
        thumbColor={Colors.onPrimary}
        ios_backgroundColor={Colors.surfaceRaised}
        accessibilityLabel="Online status"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base, marginHorizontal: Spacing.base },
  dot:     { width: 8, height: 8, borderRadius: 4 },
  textCol: { flex: 1, gap: 2 },
  status:  { fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  sub:     { fontSize: FontSize.sm },
});
