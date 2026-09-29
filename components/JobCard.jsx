import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius, Shadow } from '@constants/theme';
import { formatINR } from '@utils/money';
import StatusPill from '@components/StatusPill';

const ACTIVE_STATUSES = ['ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS'];

export default function JobCard({ job }) {
  const { Colors } = useTheme();
  const isActive = ACTIVE_STATUSES.includes(job.status);
  const statusColor = Colors.status[job.status] ?? Colors.mutedForeground;
  const earning = job.providerEarning ?? (job.totalAmount - (job.platformFee ?? 0));

  const scheduled = job.scheduledAt
    ? new Date(job.scheduledAt).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : '';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }, Shadow.md]}
      onPress={() => router.push(`/job/${job.id}`)}
      activeOpacity={0.85}
    >
      {isActive && (
        <LinearGradient
          colors={[statusColor + '22', 'transparent']}
          style={styles.glow}
        />
      )}

      <View style={styles.header}>
        <View style={styles.serviceRow}>
          <View style={[styles.iconBox, { backgroundColor: Colors.primary + '20' }]}>
            <Ionicons name="briefcase-outline" size={18} color={Colors.primary} />
          </View>
          <View style={styles.serviceInfo}>
            <Text style={[styles.serviceName, { color: Colors.foreground }]} numberOfLines={1}>
              {job.service?.name ?? 'Service'}
            </Text>
            <Text style={[styles.duration, { color: Colors.mutedForeground }]}>
              {job.service?.duration ?? 60} min
            </Text>
          </View>
        </View>
        <StatusPill status={job.status} small />
      </View>

      <View style={[styles.divider, { backgroundColor: Colors.border }]} />

      <View style={styles.meta}>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={13} color={Colors.mutedForeground} />
          <Text style={[styles.metaText, { color: Colors.mutedForeground }]} numberOfLines={1}>
            {job.address?.fullAddress ?? 'Address on file'}
          </Text>
        </View>
        {scheduled ? (
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={Colors.mutedForeground} />
            <Text style={[styles.metaText, { color: Colors.mutedForeground }]}>{scheduled}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <View>
          <Text style={[styles.earningLabel, { color: Colors.mutedForeground }]}>Your earning</Text>
          <Text style={[styles.earningAmount, { color: Colors.success }]}>
            {formatINR(earning)}
          </Text>
        </View>
        <View style={[styles.arrow, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary + '30' }]}>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
});
