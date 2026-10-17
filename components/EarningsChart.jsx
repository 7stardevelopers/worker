import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';

const BAR_HEIGHT = 80;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// `data` is 7 values in paise, oldest first; the last entry is today.
export default function EarningsChart({ data = [] }) {
  const { Colors } = useTheme();
  const anims = useRef(Array.from({ length: 7 }, () => new Animated.Value(0))).current;

  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - i));
      return { label: WEEKDAYS[d.getDay()], value: data[i] ?? 0 };
    });
  }, [JSON.stringify(data)]);

  const maxVal = Math.max(...days.map(d => d.value), 1);

  useEffect(() => {
    Animated.stagger(40, days.map((d, i) =>
      Animated.timing(anims[i], { toValue: Math.max(d.value / maxVal, 0.03), duration: 450, useNativeDriver: true }),
    )).start();
  }, [days]);

  return (
    <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
      <Text style={[styles.title, { color: Colors.mutedForeground }]}>Last 7 days</Text>
      <View style={styles.chart}>
        {days.map((d, i) => {
          const isToday = i === 6;
          return (
            <View key={i} style={styles.col}>
              <View style={styles.barWrap}>
                <Animated.View
                  style={[
                    styles.bar,
                    {
                      backgroundColor: isToday ? Colors.primary : Colors.primary + '55',
                      transform: [{ scaleY: anims[i] }],
                    },
                  ]}
                />
              </View>
              <Text style={[styles.day, { color: isToday ? Colors.foreground : Colors.mutedForeground }]}>
                {d.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card:    { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base, marginHorizontal: Spacing.base },
  title:   { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: Spacing.md },
  chart:   { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  col:     { flex: 1, alignItems: 'center', gap: Spacing.sm },
  barWrap: { height: BAR_HEIGHT, width: '55%', justifyContent: 'flex-end' },
  bar:     { height: BAR_HEIGHT, borderRadius: Radius.sm / 2, transformOrigin: 'bottom' },
  day:     { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
});
