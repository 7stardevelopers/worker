import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius, Shadow } from '@constants/theme';

// In-app banner for major events (job requests, payments, booking updates).
// Call from anywhere: toast.success('Job accepted'), toast.info(title, message, { onPress }).
// <ToastHost /> is mounted once in app/_layout.jsx; a new toast replaces the current one.

const DURATION_MS = 3500;
const ICONS = {
  success: 'checkmark-circle',
  error:   'alert-circle',
  warning: 'warning',
  info:    'notifications',
};

let listener = null;

function show(type, title, message, { onPress, duration = DURATION_MS } = {}) {
  listener?.({ id: Date.now() + Math.random(), type, title, message, onPress, duration });
}

export const toast = {
  show:    (opts) => show(opts.type ?? 'info', opts.title, opts.message, opts),
  success: (title, message, opts) => show('success', title, message, opts),
  error:   (title, message, opts) => show('error', title, message, opts),
  warning: (title, message, opts) => show('warning', title, message, opts),
  info:    (title, message, opts) => show('info', title, message, opts),
};

export default function ToastHost() {
  const { Colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(null);
  const translateY = useRef(new Animated.Value(-160)).current;
  const timer = useRef(null);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    Animated.timing(translateY, { toValue: -160, duration: 200, useNativeDriver: true })
      .start(() => setCurrent(null));
  }, [translateY]);

  useEffect(() => {
    listener = (t) => {
      clearTimeout(timer.current);
      setCurrent(t);
      translateY.setValue(-160);
      Animated.spring(translateY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }).start();
      if (t.type === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      else if (t.type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      timer.current = setTimeout(hide, t.duration);
    };
    return () => { listener = null; clearTimeout(timer.current); };
  }, [hide, translateY]);

  if (!current) return null;
  const accent = Colors[current.type] ?? Colors.primary;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + Spacing.sm, transform: [{ translateY }] }]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => { hide(); current.onPress?.(); }}
        style={[styles.card, Shadow.md, { backgroundColor: Colors.surfaceRaised, borderColor: Colors.border }]}
        accessibilityRole="alert"
        accessibilityLabel={[current.title, current.message].filter(Boolean).join('. ')}
      >
        <View style={[styles.iconWrap, { backgroundColor: accent + '1F' }]}>
          <Ionicons name={ICONS[current.type] ?? ICONS.info} size={20} color={accent} />
        </View>
        <View style={styles.texts}>
          {current.title ? <Text style={[styles.title, { color: Colors.foreground }]} numberOfLines={1}>{current.title}</Text> : null}
          {current.message ? <Text style={[styles.message, { color: Colors.mutedForeground }]} numberOfLines={2}>{current.message}</Text> : null}
        </View>
        {current.onPress ? <Ionicons name="chevron-forward" size={18} color={Colors.mutedForeground} /> : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap:     { position: 'absolute', left: Spacing.base, right: Spacing.base, zIndex: 1000, elevation: 1000 },
  card:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  texts:    { flex: 1, gap: 2 },
  title:    { fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  message:  { fontSize: FontSize.sm, lineHeight: 18 },
});
