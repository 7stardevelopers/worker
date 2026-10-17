import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { formatINR } from '@utils/money';
import { whenLabel, isAwaitingCustomer } from '@utils/jobs';

// What the worker should do next, per status.
const STATUS_COPY = {
  ACCEPTED:    { title: 'Next job',            icon: 'calendar-outline',  cta: 'Start trip' },
  EN_ROUTE:    { title: 'Heading to customer', icon: 'navigate-outline',  cta: 'Open job' },
  IN_PROGRESS: { title: 'Job in progress',     icon: 'construct-outline', cta: 'Finish job' },
};
const AWAITING_COPY = { title: 'Waiting for customer', icon: 'hourglass-outline', cta: 'View job' };

/** The one job the worker should act on right now, pinned above the feed. */
export default function ActiveJobCard({ job, paused = false }) {
  const { Colors } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;
  const awaiting = isAwaitingCustomer(job);
  const copy = awaiting ? AWAITING_COPY : (STATUS_COPY[job.status] ?? STATUS_COPY.ACCEPTED);
  const accent = awaiting ? Colors.warning : (Colors.status[job.status] ?? Colors.primary);
  const live = job.status !== 'ACCEPTED' && !awaiting;

  useEffect(() => {
    if (!live || paused) return undefined;
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [pulse, live, paused]);

  const open = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(`/job/${job.id}`);
  };

  return (
    <TouchableOpacity
      onPress={open}
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: Colors.surface, borderColor: accent + '66' }]}
      accessibilityRole="button"
      accessibilityLabel={`${copy.title}: ${job.service.name} for ${job.customerName}. ${copy.cta}`}
    >
      <View style={styles.topRow}>
        <View style={styles.statusRow}>
          <View style={styles.dotWrap}>
            {live && (
              <Animated.View style={[styles.dotPulse, {
                backgroundColor: accent,
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
                transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
              }]} />
            )}
            <View style={[styles.dot, { backgroundColor: accent }]} />
          </View>
          <Text style={[styles.status, { color: accent }]}>{copy.title}</Text>
        </View>
        <Text style={[styles.when, { color: Colors.mutedForeground }]}>{whenLabel(job.scheduledAt)}</Text>
      </View>

      <Text style={[styles.service, { color: Colors.foreground }]} numberOfLines={1}>{job.service.name}</Text>
      <View style={styles.metaRow}>
        <Ionicons name="person-outline" size={14} color={Colors.mutedForeground} />
        <Text style={[styles.meta, { color: Colors.mutedForeground }]} numberOfLines={1}>{job.customerName}</Text>
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={14} color={Colors.mutedForeground} />
        <Text style={[styles.meta, { color: Colors.mutedForeground }]} numberOfLines={1}>{job.address.fullAddress}</Text>
      </View>

      <View style={[styles.footer, { borderTopColor: Colors.borderLight }]}>
        <View style={styles.earnCol}>
          <Text style={[styles.earnLabel, { color: Colors.mutedForeground }]}>You earn</Text>
          <Text style={[styles.earn, { color: Colors.foreground }]}>{formatINR(job.providerEarning)}</Text>
        </View>
        <View style={[styles.cta, { backgroundColor: Colors.primary }]}>
          <Ionicons name={copy.icon} size={16} color={Colors.onPrimary} />
          <Text style={[styles.ctaText, { color: Colors.onPrimary }]} numberOfLines={1}>{copy.cta}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:      { marginHorizontal: Spacing.base, marginTop: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.base, gap: 6 },
  topRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexShrink: 1 },
  dotWrap:   { width: 10, height: 10, alignItems: 'center', justifyContent: 'center' },
  dot:       { width: 8, height: 8, borderRadius: 4 },
  dotPulse:  { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  status:    { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  when:      { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  service:   { fontSize: FontSize.h3, fontWeight: FontWeight.semibold },
  metaRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta:      { flex: 1, fontSize: FontSize.sm },
  footer:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md, marginTop: Spacing.sm },
  earnCol:   { gap: 2 },
  earnLabel: { fontSize: FontSize.xs },
  earn:      { fontSize: FontSize.h3, fontWeight: FontWeight.semibold },
  cta:       { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.md, paddingHorizontal: Spacing.base, height: 40, flexShrink: 1 },
  ctaText:   { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
