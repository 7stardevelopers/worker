import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { formatINR } from '@utils/money';
import StatusPill from '@components/StatusPill';
import PaymentBadge from '@components/PaymentBadge';

export default function JobCard({ job }) {
  const { Colors } = useTheme();
  const earning = job.providerEarning ?? (job.totalAmount - (job.platformFee ?? 0));

  const instantRequest = job.isInstant && job.status === 'PENDING';
  const scheduled = instantRequest ? 'Now, customer is waiting'
    : job.scheduledAt
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
        {instantRequest ? (
          <View style={[styles.instantPill, { backgroundColor: Colors.warning + '1F' }]}>
            <Ionicons name="flash" size={11} color={Colors.warning} />
            <Text style={[styles.instantText, { color: Colors.warning }]}>Instant</Text>
          </View>
        ) : (
          <StatusPill status={job.status} small />
        )}
      </View>

      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={14} color={Colors.mutedForeground} />
        <Text style={[styles.address, { color: Colors.mutedForeground }]} numberOfLines={1}>
          {job.address?.fullAddress ?? 'Address on file'}
        </Text>
      </View>

      <View style={[styles.footer, { borderTopColor: Colors.borderLight }]}>
        <View style={styles.earningCol}>
          <Text style={[styles.earningLabel, { color: Colors.mutedForeground }]}>Your earning</Text>
          <Text style={[styles.earningAmount, { color: Colors.foreground }]}>{formatINR(earning)}</Text>
        </View>
        <View style={styles.footerRight}>
          <PaymentBadge job={job} small />
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
  instantPill:   { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  instantText:   { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  addressRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  address:       { flex: 1, fontSize: FontSize.sm },
  footer:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md },
  earningCol:    { gap: 2 },
  earningLabel:  { fontSize: FontSize.xs },
  earningAmount: { fontSize: FontSize.h3, fontWeight: FontWeight.semibold },
  footerRight:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexShrink: 1 },
});
