import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import PressableScale from '@components/PressableScale';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { formatINR } from '@utils/money';
import { whenLabel } from '@utils/jobs';

// What the worker should do next, per status.
const STATUS_COPY = {
  ACCEPTED:    { title: 'Next job',          icon: 'calendar',  cta: 'Start trip' },
  EN_ROUTE:    { title: 'Heading to customer', icon: 'navigate', cta: 'Open job' },
  IN_PROGRESS: { title: 'Job in progress',   icon: 'construct', cta: 'Finish job' },
};

/** The one job the worker should act on right now, pinned above the feed. */
export default function ActiveJobCard({ job, paused = false }) {
  const { Colors } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;
  const copy = STATUS_COPY[job.status] ?? STATUS_COPY.ACCEPTED;
  const accent = Colors.status[job.status] ?? Colors.primary;
  const live = job.status !== 'ACCEPTED';

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
    <PressableScale onPress={open} scale={0.98} style={styles.wrap} accessibilityRole="button"
      accessibilityLabel={`${copy.title}: ${job.service.name} for ${job.customerName}. ${copy.cta}`}>
      <LinearGradient
        colors={[accent + '33', Colors.surface]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: accent + '55' }]}
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

        <View style={[styles.footer, { borderTopColor: Colors.border }]}>
          <View>
            <Text style={[styles.earnLabel, { color: Colors.mutedForeground }]}>You earn</Text>
            <Text style={[styles.earn, { color: Colors.success }]}>{formatINR(job.providerEarning)}</Text>
          </View>
          <View style={[styles.cta, { backgroundColor: accent }]}>
            <Ionicons name={copy.icon} size={16} color="#FFF" />
            <Text style={styles.ctaText}>{copy.cta}</Text>
          </View>
        </View>
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap:      { marginHorizontal: Spacing.base, marginTop: Spacing.md },
  card:      { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.base, gap: 6 },
  topRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dotWrap:   { width: 10, height: 10, alignItems: 'center', justifyContent: 'center' },
  dot:       { width: 8, height: 8, borderRadius: 4 },
  dotPulse:  { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  status:    { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 0.6, textTransform: 'uppercase' },
  when:      { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  service:   { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  metaRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta:      { flex: 1, fontSize: FontSize.sm },
  footer:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md, marginTop: Spacing.sm },
  earnLabel: { fontSize: FontSize.xs },
  earn:      { fontSize: FontSize.h3, fontWeight: FontWeight.bold },
  cta:       { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.full, paddingHorizontal: Spacing.base, paddingVertical: 10 },
  ctaText:   { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
