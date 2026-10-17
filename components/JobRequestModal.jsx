import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/theme';
<<<<<<< HEAD
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { formatINR } from '@utils/format';
import BottomSheet from '@components/BottomSheet';
import Button from '@components/Button';
=======
import { FontSize, FontWeight, Spacing, Radius, Shadow } from '@constants/theme';
import { formatINR } from '@utils/money';
import { jobWhenLabel } from '@utils/jobs';
import PaymentBadge from '@components/PaymentBadge';
>>>>>>> e26961c635b60a007766324f445890a2e88d7232

const COUNTDOWN = 30;

export default function JobRequestModal({ visible, job, onAccept, onReject, onExpire, accepting = false }) {
  const expireRef = useRef(onExpire ?? onReject);
  expireRef.current = onExpire ?? onReject;
  const { Colors } = useTheme();
  const [timer, setTimer] = useState(COUNTDOWN);
  const [busy,  setBusy]  = useState(false);
  const progress = useRef(new Animated.Value(1)).current;

  // Keep the last job around so the sheet still has content while it
  // animates closed after the parent clears `job`.
  const lastJob = useRef(job);
  if (job) lastJob.current = job;
  const current = job ?? lastJob.current;

  useEffect(() => {
<<<<<<< HEAD
    if (!visible) return undefined;
    setBusy(false);
    progress.setValue(1);
    const anim = Animated.timing(progress, {
      toValue: 0, duration: COUNTDOWN * 1000, easing: Easing.linear, useNativeDriver: true,
    });
    anim.start();
    const iv = setInterval(() => setTimer(t => Math.max(t - 1, 0)), 1000);
    // Reset on close so the next request never opens with an expired timer.
    return () => { clearInterval(iv); anim.stop(); setTimer(COUNTDOWN); };
=======
    if (!visible) {
      slideY.setValue(300);
      progress.setValue(1);
      setTimer(COUNTDOWN);
      return;
    }

    Animated.spring(slideY, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }).start();
    Animated.timing(progress, { toValue: 0, duration: COUNTDOWN * 1000, useNativeDriver: false }).start();

    setTimer(COUNTDOWN);
    const iv = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { clearInterval(iv); expireRef.current?.(); return 0; }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(iv);
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
  }, [visible]);

  useEffect(() => {
    if (visible && timer === 0 && !busy) onReject?.();
  }, [timer, visible, busy]);

  const handleAccept = async () => {
    setBusy(true);
    try {
      await onAccept?.();
    } finally {
      setBusy(false);
    }
  };

  if (!current) return null;

  const earning = current.providerEarning ?? current.totalAmount ?? 0;

  return (
<<<<<<< HEAD
    <BottomSheet visible={visible} onClose={onReject} dismissible={!busy}>
      <View style={[styles.timerTrack, { backgroundColor: Colors.borderLight }]}>
        <Animated.View
          style={[styles.timerFill, { backgroundColor: Colors.warning, transform: [{ scaleX: progress }] }]}
        />
=======
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <Animated.View style={[styles.sheet, { backgroundColor: Colors.surface, transform: [{ translateY: slideY }] }, Shadow.lg]}>
          <LinearGradient colors={['rgba(99,102,241,0.15)', 'transparent']} style={StyleSheet.absoluteFill} />

          {/* Timer bar */}
          <View style={[styles.timerTrack, { backgroundColor: Colors.border }]}>
            <Animated.View style={[styles.timerFill, { width: progressWidth, backgroundColor: Colors.warning }]} />
          </View>

          <View style={styles.header}>
            <View style={[styles.alertIcon, { backgroundColor: Colors.warning + '20' }]}>
              <Ionicons name="flash" size={28} color={Colors.warning} />
            </View>
            <Text style={[styles.title, { color: Colors.foreground }]}>{job.isInstant ? '⚡ Instant Job — Now!' : 'New Job Request!'}</Text>
            {job.isInstant && (
              <Text style={[styles.instantSub, { color: Colors.mutedForeground }]}>
                A customer nearby needs an expert right away. Accept only if you can leave now.
              </Text>
            )}
            <Text style={[styles.countdown, { color: Colors.warning }]}>Expires in {timer}s</Text>
          </View>

          <View style={[styles.jobCard, { backgroundColor: Colors.surfaceRaised, borderColor: Colors.border }]}>
            <Text style={[styles.jobName, { color: Colors.foreground }]}>
              {job.service?.name ?? 'Service'}
            </Text>
            <View style={styles.jobMeta}>
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={14} color={Colors.mutedForeground} />
                <Text style={[styles.metaText, { color: Colors.mutedForeground }]} numberOfLines={2}>
                  {job.address?.fullAddress ?? 'Address on file'}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
                <Text style={[styles.metaText, styles.whenText, { color: Colors.foreground }]}>
                  {jobWhenLabel(job)}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={14} color={Colors.mutedForeground} />
                <Text style={[styles.metaText, { color: Colors.mutedForeground }]}>
                  ~{job.service?.duration ?? 60} min job
                </Text>
              </View>
            </View>
            <View style={[styles.earningBadge, { backgroundColor: Colors.success + '15', borderColor: Colors.success + '40' }]}>
              <Text style={[styles.earningLabel, { color: Colors.mutedForeground }]}>You earn</Text>
              <Text style={[styles.earningAmount, { color: Colors.success }]}>
                {formatINR(earning)}
              </Text>
              <PaymentBadge job={job} small />
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.rejectBtn, { borderColor: Colors.error, opacity: accepting ? 0.5 : 1 }]} onPress={onReject} disabled={accepting} activeOpacity={0.85}>
              <Ionicons name="close" size={20} color={Colors.error} />
              <Text style={[styles.rejectText, { color: Colors.error }]}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.acceptBtn, { flex: 1, opacity: accepting ? 0.7 : 1 }]} onPress={onAccept} disabled={accepting} activeOpacity={0.85}>
              <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.acceptGrad}>
                <Ionicons name="checkmark" size={20} color="#FFF" />
                <Text style={styles.acceptText}>{accepting ? 'Accepting…' : 'Accept Job'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
      </View>

      <View style={styles.header}>
        <Text style={[styles.title, { color: Colors.foreground }]}>New job request</Text>
        <Text style={[styles.countdown, { color: Colors.warning }]}>{timer}s</Text>
      </View>

      <View style={[styles.card, { backgroundColor: Colors.surfaceRaised }]}>
        <Text style={[styles.jobName, { color: Colors.foreground }]} numberOfLines={2}>
          {current.service?.name ?? 'Service'}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={Colors.mutedForeground} />
          <Text style={[styles.metaText, { color: Colors.mutedForeground }]} numberOfLines={2}>
            {current.address?.fullAddress ?? 'Address on file'}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color={Colors.mutedForeground} />
          <Text style={[styles.metaText, { color: Colors.mutedForeground }]}>
            {current.service?.duration ?? 60} min
          </Text>
        </View>
        <View style={[styles.earningRow, { borderTopColor: Colors.border }]}>
          <Text style={[styles.earningLabel, { color: Colors.mutedForeground }]}>You earn</Text>
          <Text style={[styles.earningAmount, { color: Colors.success }]}>{formatINR(earning)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button title="Decline" variant="secondary" onPress={onReject} disabled={busy} style={styles.decline} />
        <Button title="Accept" onPress={handleAccept} loading={busy} style={styles.accept} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  timerTrack:    { height: 3, borderRadius: 2, overflow: 'hidden' },
  timerFill:     { height: '100%', width: '100%', transformOrigin: 'left' },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:         { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  countdown:     { fontSize: FontSize.body, fontWeight: FontWeight.semibold, fontVariant: ['tabular-nums'] },
  card:          { borderRadius: Radius.lg, padding: Spacing.base, gap: Spacing.sm },
  jobName:       { fontSize: FontSize.h3, fontWeight: FontWeight.semibold, marginBottom: 2 },
  metaRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
<<<<<<< HEAD
  metaText:      { flex: 1, fontSize: FontSize.sm, lineHeight: 18 },
  earningRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md, marginTop: Spacing.xs },
=======
  metaText:      { fontSize: FontSize.sm, flex: 1 },
  whenText:      { fontWeight: FontWeight.semibold },
  instantSub:    { fontSize: FontSize.sm, textAlign: 'center', marginTop: 2 },
  earningBadge:  { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
  earningLabel:  { fontSize: FontSize.sm },
  earningAmount: { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  actions:       { flexDirection: 'row', gap: Spacing.sm },
  decline:       { flex: 1 },
  accept:        { flex: 2 },
});
