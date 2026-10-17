import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Radius, Spacing } from '@constants/theme';
import { paymentInfo } from '@utils/jobs';

/** "Paid online" / "Pay after job" — how the customer chose to pay while booking. */
export default function PaymentBadge({ job, small = false }) {
  const { Colors } = useTheme();
  const info = paymentInfo(job);
  if (!info) return null;
  const color = Colors[info.colorKey] ?? Colors.primary;
  return (
    <View style={[styles.pill, { backgroundColor: color + '20', borderColor: color + '50' }, small && styles.small]}>
      <Ionicons name={info.icon} size={small ? 11 : 13} color={color} />
      <Text style={[styles.label, { color }, small && styles.labelSmall]}>{info.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill:       { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  small:      { paddingHorizontal: 6, paddingVertical: 3 },
  label:      { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  labelSmall: { fontSize: FontSize.xs },
});
