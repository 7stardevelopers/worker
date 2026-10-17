import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { formatINR } from '@utils/money';
import { jobWhenLabel } from '@utils/jobs';
import BottomSheet from '@components/BottomSheet';
import Button from '@components/Button';
import PaymentBadge from '@components/PaymentBadge';

const COUNTDOWN = 30;

export default function JobRequestModal({ visible, job, onAccept, onReject, onExpire, accepting = false }) {
  const { Colors } = useTheme();
  const [timer, setTimer] = useState(COUNTDOWN);
  const progress = useRef(new Animated.Value(1)).current;
  const expireRef = useRef(onExpire ?? onReject);
  expireRef.current = onExpire ?? onReject;

  // Keep the last job around so the sheet still has content while it
  // animates closed after the parent clears `job`.
  const lastJob = useRef(job);
  if (job) lastJob.current = job;
  const current = job ?? lastJob.current;

  useEffect(() => {
    if (!visible) return undefined;
    progress.setValue(1);
    const anim = Animated.timing(progress, {
      toValue: 0, duration: COUNTDOWN * 1000, easing: Easing.linear, useNativeDriver: true,
    });
    anim.start();
    const iv = setInterval(() => setTimer(t => Math.max(t - 1, 0)), 1000);
    // Reset on close so the next request never opens with an expired timer.
    return () => { clearInterval(iv); anim.stop(); setTimer(COUNTDOWN); };
  }, [visible]);

  useEffect(() => {
    if (visible && timer === 0 && !accepting) expireRef.current?.();
  }, [timer, visible, accepting]);

  if (!current) return null;

  const earning = current.providerEarning ?? current.totalAmount ?? 0;

  return (
    // Not dismissible: a stray tap on the backdrop must never decline a job.
    <BottomSheet visible={visible} onClose={onReject} dismissible={false}>
      <View style={[styles.timerTrack, { backgroundColor: Colors.borderLight }]}>
        <Animated.View
          style={[styles.timerFill, { backgroundColor: Colors.warning, transform: [{ scaleX: progress }] }]}
        />
      </View>

      <View style={styles.header}>
        <View style={styles.titleCol}>
          {current.isInstant ? (
            <View style={styles.instantRow}>
              <Ionicons name="flash" size={14} color={Colors.warning} />
              <Text style={[styles.instantLabel, { color: Colors.warning }]}>Instant job</Text>
            </View>
          ) : null}
          <Text style={[styles.title, { color: Colors.foreground }]}>New job request</Text>
        </View>
        <Text style={[styles.countdown, { color: Colors.warning }]}>{timer}s</Text>
      </View>

      {current.isInstant ? (
        <Text style={[styles.instantSub, { color: Colors.mutedForeground }]}>
          A customer nearby needs someone now. Accept only if you can leave right away.
        </Text>
      ) : null}

      <View style={[styles.card, { backgroundColor: Colors.surfaceRaised }]}>
        <Text style={[styles.jobName, { color: Colors.foreground }]} numberOfLines={2}>
          {current.service?.name ?? 'Service'}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={Colors.mutedForeground} />
          <Text style={[styles.metaText, styles.whenText, { color: Colors.foreground }]}>
            {jobWhenLabel(current)}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={Colors.mutedForeground} />
          <Text style={[styles.metaText, { color: Colors.mutedForeground }]} numberOfLines={2}>
            {current.address?.fullAddress ?? 'Address on file'}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color={Colors.mutedForeground} />
          <Text style={[styles.metaText, { color: Colors.mutedForeground }]}>
            About {current.service?.duration ?? 60} min
          </Text>
        </View>
        <View style={[styles.earningRow, { borderTopColor: Colors.border }]}>
          <View style={styles.earningCol}>
            <Text style={[styles.earningLabel, { color: Colors.mutedForeground }]}>You earn</Text>
            <PaymentBadge job={current} small />
          </View>
          <Text style={[styles.earningAmount, { color: Colors.success }]}>{formatINR(earning)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button title="Decline" variant="secondary" onPress={onReject} disabled={accepting} style={styles.decline} />
        <Button title="Accept" onPress={onAccept} loading={accepting} style={styles.accept} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  timerTrack:    { height: 3, borderRadius: 2, overflow: 'hidden' },
  timerFill:     { height: '100%', width: '100%', transformOrigin: 'left' },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: Spacing.md },
  titleCol:      { flex: 1, gap: 2 },
  instantRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  instantLabel:  { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  title:         { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  countdown:     { fontSize: FontSize.body, fontWeight: FontWeight.semibold, fontVariant: ['tabular-nums'] },
  instantSub:    { fontSize: FontSize.sm, lineHeight: 20 },
  card:          { borderRadius: Radius.lg, padding: Spacing.base, gap: Spacing.sm },
  jobName:       { fontSize: FontSize.h3, fontWeight: FontWeight.semibold, marginBottom: 2 },
  metaRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  metaText:      { flex: 1, fontSize: FontSize.sm, lineHeight: 18 },
  whenText:      { fontWeight: FontWeight.medium },
  earningRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md, marginTop: Spacing.xs },
  earningCol:    { gap: Spacing.xs },
  earningLabel:  { fontSize: FontSize.sm },
  earningAmount: { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  actions:       { flexDirection: 'row', gap: Spacing.sm },
  decline:       { flex: 1 },
  accept:        { flex: 2 },
});
