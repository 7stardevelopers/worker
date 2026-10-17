import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Radius, Spacing } from '@constants/theme';

const LABELS = {
  PENDING:     'Pending',
  ACCEPTED:    'Accepted',
  EN_ROUTE:    'En route',
  IN_PROGRESS: 'In progress',
  COMPLETED:   'Completed',
  CANCELLED:   'Cancelled',
  REJECTED:    'Rejected',
};

const LIVE = ['EN_ROUTE', 'IN_PROGRESS'];

export default function StatusPill({ status, small = false }) {
  const { Colors } = useTheme();
  const color = Colors.status[status] ?? Colors.mutedForeground;
  const live = LIVE.includes(status);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!live) { pulse.setValue(1); return undefined; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [live]);

  return (
    <View style={[styles.pill, small && styles.small, { backgroundColor: color + '1A' }]}>
      <Animated.View style={[styles.dot, { backgroundColor: color, opacity: pulse }]} />
      <Text style={[styles.label, small && styles.labelSmall, { color }]} numberOfLines={1}>
        {LABELS[status] ?? status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill:       { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.full, paddingHorizontal: Spacing.sm + 2, paddingVertical: 4, alignSelf: 'flex-start' },
  small:      { paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  dot:        { width: 6, height: 6, borderRadius: 3 },
  label:      { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  labelSmall: { fontSize: FontSize.xs },
});
