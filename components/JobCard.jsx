import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { formatINR } from '@utils/format';
import StatusPill from '@components/StatusPill';

export default function JobCard({ job }) {
  const { Colors } = useTheme();
  const earning = job.providerEarning ?? (job.totalAmount - (job.platformFee ?? 0));

  const scheduled = job.scheduledAt
    ? new Date(job.scheduledAt).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
      })
    : 'As soon as possible';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
      onPress={() => router.push(`/job/${job.id}`)}
      activeOpacity={0.75}
    >
      <View style={styles.header}>
        <View style={styles.titleCol}>
          <Text style={[styles.serviceName, { color: Colors.foreground }]} numberOfLines={1}>
            {job.service?.name ?? 'Service'}
          </Text>
          <Text style={[styles.meta, { color: Colors.mutedForeground }]} numberOfLines={1}>
            {scheduled} · {job.service?.duration ?? 60} min
          </Text>
        </View>
        <StatusPill status={job.status} small />
      </View>

      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={14} color={Colors.mutedForeground} />
        <Text style={[styles.address, { color: Colors.mutedForeground }]} numberOfLines={1}>
          {job.address?.fullAddress ?? 'Address on file'}
        </Text>
      </View>

      <View style={[styles.footer, { borderTopColor: Colors.borderLight }]}>
        <Text style={[styles.earningLabel, { color: Colors.mutedForeground }]}>Your earning</Text>
        <View style={styles.earningRight}>
          <Text style={[styles.earningAmount, { color: Colors.foreground }]}>{formatINR(earning)}</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.subtleForeground} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:          { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, marginHorizontal: Spacing.base, marginBottom: Spacing.md, padding: Spacing.base, gap: Spacing.md },
  header:        { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  titleCol:      { flex: 1, gap: 2 },
  serviceName:   { fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  meta:          { fontSize: FontSize.sm },
  addressRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  address:       { flex: 1, fontSize: FontSize.sm },
  footer:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md },
  earningLabel:  { fontSize: FontSize.sm },
  earningRight:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  earningAmount: { fontSize: FontSize.h3, fontWeight: FontWeight.semibold },
});
