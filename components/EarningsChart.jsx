import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { formatINR } from '@utils/money';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// `data` is a rolling window: data[6] is today, data[0] is six days ago.
function lastSevenDayLabels() {
  const today = new Date().getDay();
  return Array.from({ length: 7 }, (_, i) => WEEKDAYS[(today - 6 + i + 7) % 7]);
}

export default function EarningsChart({ data = [] }) {
  const { Colors } = useTheme();
  const anims = useRef(Array.from({ length: 7 }, () => new Animated.Value(0))).current;
  const labels = lastSevenDayLabels();

  const normalized = labels.map((label, i) => {
    const val = data[i] ?? 0;
    return { label, value: val };
  });

  const maxVal = Math.max(...normalized.map(d => d.value), 1);

  useEffect(() => {
    const animations = normalized.map((d, i) =>
      Animated.timing(anims[i], {
        toValue: d.value / maxVal,
        duration: 600,
        delay: i * 60,
        useNativeDriver: false,
      })
    );
    Animated.parallel(animations).start();
  }, [JSON.stringify(data)]);

  return (
    <View style={[styles.wrapper, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
      <Text style={[styles.label, { color: Colors.mutedForeground }]}>7-Day Earnings</Text>
      <View style={styles.chart}>
        {normalized.map((d, i) => {
          const isToday = i === 6;
          const barColor = isToday ? Colors.primary : Colors.primary + '60';
          return (
            <View key={d.label} style={styles.col}>
              <View style={styles.barWrap}>
                <Animated.View
                  style={[
                    styles.bar,
                    {
                      backgroundColor: barColor,
                      height: anims[i].interpolate({ inputRange: [0, 1], outputRange: [2, 80] }),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.day, { color: isToday ? Colors.primary : Colors.mutedForeground }]}>
                {d.label}
              </Text>
              {d.value > 0 ? (
                <Text style={[styles.amount, { color: Colors.subtleForeground }]}>
                  {formatINR(d.value)}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:  { borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base, marginHorizontal: Spacing.base },
  label:    { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: Spacing.md },
  chart:    { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 110 },
  col:      { flex: 1, alignItems: 'center', gap: 4 },
  barWrap:  { height: 80, justifyContent: 'flex-end', width: '60%' },
  bar:      { borderRadius: Radius.sm, minHeight: 2 },
  day:      { fontSize: 10, fontWeight: FontWeight.semibold },
  amount:   { fontSize: 9 },
});
