import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
<<<<<<< HEAD
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { formatINR } from '@utils/format';
=======
import { FontSize, FontWeight, Spacing, Radius, Shadow } from '@constants/theme';
import { formatINR } from '@utils/money';
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
import StatusPill from '@components/StatusPill';
import PaymentBadge from '@components/PaymentBadge';

export default function JobCard({ job }) {
  const { Colors } = useTheme();
  const earning = job.providerEarning ?? (job.totalAmount - (job.platformFee ?? 0));

<<<<<<< HEAD
  const scheduled = job.scheduledAt
    ? new Date(job.scheduledAt).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
      })
    : 'As soon as possible';
=======
  const instantRequest = job.isInstant && job.status === 'PENDING';
  const scheduled = instantRequest ? 'Now — customer is waiting'
    : job.scheduledAt
      ? new Date(job.scheduledAt).toLocaleString('en-IN', {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        })
      : '';
>>>>>>> e26961c635b60a007766324f445890a2e88d7232

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
          <View style={[styles.instantPill, { backgroundColor: Colors.warning + '22' }]}>
            <Ionicons name="flash" size={11} color={Colors.warning} />
            <Text style={[styles.instantPillText, { color: Colors.warning }]}>Instant</Text>
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

<<<<<<< HEAD
      <View style={[styles.footer, { borderTopColor: Colors.borderLight }]}>
        <Text style={[styles.earningLabel, { color: Colors.mutedForeground }]}>Your earning</Text>
        <View style={styles.earningRight}>
          <Text style={[styles.earningAmount, { color: Colors.foreground }]}>{formatINR(earning)}</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.subtleForeground} />
=======
      <View style={styles.footer}>
        <View>
          <Text style={[styles.earningLabel, { color: Colors.mutedForeground }]}>Your earning</Text>
          <Text style={[styles.earningAmount, { color: Colors.success }]}>
            {formatINR(earning)}
          </Text>
        </View>
        <PaymentBadge job={job} small />
        <View style={[styles.arrow, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary + '30' }]}>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
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
=======
  instantPill:     { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  instantPillText: { fontSize: 11, fontWeight: '700' },
  card:         { borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth, marginHorizontal: Spacing.base, marginBottom: Spacing.md, padding: Spacing.base, overflow: 'hidden' },
  glow:         { ...StyleSheet.absoluteFillObject },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  iconBox:      { width: 36, height: 36, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  serviceInfo:  { flex: 1 },
  serviceName:  { fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  duration:     { fontSize: FontSize.xs, marginTop: 2 },
  divider:      { height: StyleSheet.hairlineWidth, marginVertical: Spacing.md },
  meta:         { gap: 6 },
  metaRow:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText:     { fontSize: FontSize.sm, flex: 1 },
  footer:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md },
  earningLabel: { fontSize: FontSize.xs },
  earningAmount:{ fontSize: FontSize.h3, fontWeight: FontWeight.bold, marginTop: 2 },
  arrow:        { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
});
