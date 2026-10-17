import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Radius, Spacing } from '@constants/theme';

const LABELS = {
  PENDING:     'Pending',
  ACCEPTED:    'Accepted',
  EN_ROUTE:    'En Route',
  IN_PROGRESS: 'In Progress',
  COMPLETED:   'Completed',
  CANCELLED:   'Cancelled',
  REJECTED:    'Rejected',
};

export default function StatusPill({ status, small = false }) {
  const { Colors } = useTheme();
  const color = Colors.status[status] ?? Colors.mutedForeground;

  return (
    <View style={[
      styles.pill,
      { backgroundColor: color + '20', borderColor: color + '50' },
      small && styles.small,
    ]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }, small && styles.labelSmall]}>
        {LABELS[status] ?? status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill:       { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  small:      { paddingHorizontal: 6, paddingVertical: 3 },
  dot:        { width: 6, height: 6, borderRadius: 3 },
  label:      { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  labelSmall: { fontSize: FontSize.xs },
});
