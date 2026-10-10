import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius, Shadow } from '@constants/theme';
import { formatINR } from '@utils/money';
import PaymentBadge from '@components/PaymentBadge';

const COUNTDOWN = 30;

export default function JobRequestModal({ visible, job, onAccept, onReject, onExpire, accepting = false }) {
  const expireRef = useRef(onExpire ?? onReject);
  expireRef.current = onExpire ?? onReject;
  const { Colors } = useTheme();
  const [timer, setTimer] = useState(COUNTDOWN);
  const slideY = useRef(new Animated.Value(300)).current;
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
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
  }, [visible]);

  if (!job) return null;

  const earning = job.providerEarning ?? job.totalAmount ?? 0;
  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
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
            <Text style={[styles.title, { color: Colors.foreground }]}>New Job Request!</Text>
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
                <Ionicons name="time-outline" size={14} color={Colors.mutedForeground} />
                <Text style={[styles.metaText, { color: Colors.mutedForeground }]}>
                  {job.service?.duration ?? 60} min
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet:         { borderTopLeftRadius: Radius.xl2, borderTopRightRadius: Radius.xl2, padding: Spacing.base, paddingBottom: 36, gap: Spacing.base, overflow: 'hidden' },
  timerTrack:    { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: Spacing.sm },
  timerFill:     { height: '100%', borderRadius: 2 },
  header:        { alignItems: 'center', gap: Spacing.sm },
  alertIcon:     { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  title:         { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  countdown:     { fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  jobCard:       { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base, gap: Spacing.sm },
  jobName:       { fontSize: FontSize.h3, fontWeight: FontWeight.semibold },
  jobMeta:       { gap: 6 },
  metaRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  metaText:      { fontSize: FontSize.sm, flex: 1 },
  earningBadge:  { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  earningLabel:  { fontSize: FontSize.sm },
  earningAmount: { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  actions:       { flexDirection: 'row', gap: Spacing.sm },
  rejectBtn:     { width: 100, height: 54, borderRadius: Radius.lg, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 },
  rejectText:    { fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  acceptBtn:     { borderRadius: Radius.lg, overflow: 'hidden', height: 54 },
  acceptGrad:    { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  acceptText:    { color: '#FFF', fontSize: FontSize.body, fontWeight: FontWeight.bold },
});
