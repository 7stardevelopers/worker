import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius, Shadow } from '@constants/theme';
import StatusPill from '@components/StatusPill';

const SERVICE_ICONS = {
  electrical: 'flash-outline',
  plumbing:   'water-outline',
  cleaning:   'sparkles-outline',
  ac:         'snow-outline',
  paint:      'color-palette-outline',
  carpent:    'hammer-outline',
  pest:       'bug-outline',
  appliance:  'construct-outline',
};

function serviceIcon(name = '') {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(SERVICE_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return 'briefcase-outline';
}

function formatScheduled(dt) {
  if (!dt) return '';
  const d   = new Date(dt);
  const now = new Date();
  const todayStr    = now.toDateString();
  const tomorrowStr = new Date(now.getTime() + 86400000).toDateString();
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === todayStr)    return `Today, ${time}`;
  if (d.toDateString() === tomorrowStr) return `Tomorrow, ${time}`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + `, ${time}`;
}

function extractArea(fullAddress = '') {
  return fullAddress.replace(/\s*[—\-–]\s*\d{6}\s*$/, '').trim() || 'Address on file';
}

const fmt = (amt) => `₹${Number(amt).toLocaleString('en-IN')}`;

const ACTIVE_STATUSES = ['ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS'];

export default function JobCard({ job }) {
  const { Colors } = useTheme();

  const isActive    = ACTIVE_STATUSES.includes(job.status);
  const statusColor = Colors.status?.[job.status] ?? Colors.primary;
  const serviceName = job.service?.name ?? 'Service';
  const earning     = job.providerEarning ?? 0;
  const total       = job.totalAmount ?? 0;
  const fee         = job.platformFee ?? 0;
  const area        = extractArea(job.address?.fullAddress ?? '');
  const scheduled   = formatScheduled(job.scheduledAt);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }, Shadow.md]}
      onPress={() => router.push({ pathname: `/job/${job.id}`, params: { data: JSON.stringify(job) } })}
      activeOpacity={0.85}
    >
      {/* Status-coloured accent strip */}
      <LinearGradient
        colors={[statusColor + '55', statusColor + '11']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.accentStrip}
      />

      {/* Active glow */}
      {isActive && (
        <LinearGradient
          colors={[statusColor + '12', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: statusColor + '18' }]}>
          <Ionicons name={serviceIcon(serviceName)} size={20} color={statusColor} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.serviceName, { color: Colors.foreground }]} numberOfLines={1}>
            {serviceName}
          </Text>
          <Text style={[styles.bookingId, { color: Colors.mutedForeground }]}>
            #{job.id.slice(0, 8).toUpperCase()}
          </Text>
        </View>
        <StatusPill status={job.status} small />
      </View>

      {/* Earning row */}
      <View style={[styles.earningRow, { backgroundColor: statusColor + '0C', borderColor: statusColor + '22' }]}>
        <View style={styles.earningLeft}>
          <Text style={[styles.earningLabel, { color: Colors.mutedForeground }]}>Your Earning</Text>
          <Text style={[styles.earningAmount, { color: statusColor }]}>{fmt(earning)}</Text>
        </View>
        <View style={[styles.earningPill, { borderColor: Colors.border }]}>
          <Text style={[styles.pillText, { color: Colors.mutedForeground }]}>Total {fmt(total)}</Text>
          <View style={[styles.pillDot, { backgroundColor: Colors.border }]} />
          <Text style={[styles.pillText, { color: Colors.mutedForeground }]}>Fee {fmt(fee)}</Text>
        </View>
      </View>

      {/* Location + time */}
      <View style={styles.infoBlock}>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={13} color={Colors.primary} />
          <Text style={[styles.infoText, { color: Colors.foreground }]} numberOfLines={1}>{area}</Text>
        </View>
        {!!scheduled && (
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={13} color={Colors.success} />
            <Text style={[styles.infoText, { color: Colors.mutedForeground }]}>{scheduled}</Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: Colors.border }]}>
        <Text style={[styles.viewText, { color: Colors.primary }]}>View Details</Text>
        <View style={[styles.arrow, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary + '30' }]}>
          <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:         { borderRadius: Radius.xl, borderWidth: 1, marginHorizontal: Spacing.base, marginBottom: Spacing.md, overflow: 'hidden' },
  accentStrip:  { height: 3 },

  header:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, paddingBottom: Spacing.xs },
  iconBox:      { width: 38, height: 38, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  headerText:   { flex: 1 },
  serviceName:  { fontSize: FontSize.body, fontWeight: FontWeight.bold },
  bookingId:    { fontSize: FontSize.xs, marginTop: 1 },

  earningRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: Spacing.base, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.sm },
  earningLeft:  { gap: 1 },
  earningLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  earningAmount:{ fontSize: 22, fontWeight: FontWeight.bold, letterSpacing: -0.5 },
  earningPill:  { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  pillDot:      { width: 3, height: 3, borderRadius: 2 },
  pillText:     { fontSize: 10, fontWeight: FontWeight.medium },

  infoBlock:    { paddingHorizontal: Spacing.base, gap: 5, marginBottom: Spacing.sm },
  infoRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText:     { fontSize: FontSize.sm, flex: 1 },

  footer:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  viewText:     { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  arrow:        { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
});
