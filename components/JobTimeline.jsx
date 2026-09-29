import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing } from '@constants/theme';

const STEPS = [
  { status: 'ACCEPTED',    label: 'Accepted',    icon: 'checkmark' },
  { status: 'EN_ROUTE',    label: 'On the way',  icon: 'navigate' },
  { status: 'IN_PROGRESS', label: 'Working',     icon: 'construct' },
  { status: 'COMPLETED',   label: 'Done',        icon: 'flag' },
];

/** Horizontal progress through the job lifecycle. */
export default function JobTimeline({ status }) {
  const { Colors } = useTheme();
  const current = STEPS.findIndex(s => s.status === status);
  if (current < 0) return null;

  return (
    <View style={styles.row} accessibilityLabel={`Job progress: ${STEPS[current].label}`}>
      {STEPS.map((step, i) => {
        const done = i < current || status === 'COMPLETED';
        const active = i === current && status !== 'COMPLETED';
        const color = done || active ? Colors.status[step.status] ?? Colors.primary : Colors.border;
        return (
          <React.Fragment key={step.status}>
            <View style={styles.step}>
              <View style={[styles.circle, {
                backgroundColor: done ? color : active ? color + '22' : Colors.surface,
                borderColor: color,
              }]}>
                <Ionicons name={done ? 'checkmark' : step.icon} size={14} color={done ? '#FFF' : active ? color : Colors.subtleForeground} />
              </View>
              <Text style={[styles.label, { color: active ? color : done ? Colors.foreground : Colors.subtleForeground }]}>
                {step.label}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[styles.line, { backgroundColor: i < current ? Colors.status[STEPS[i + 1].status] ?? Colors.primary : Colors.border }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Spacing.base },
  step:   { alignItems: 'center', gap: 6, width: 64 },
  circle: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  label:  { fontSize: FontSize.xs, fontWeight: FontWeight.medium, textAlign: 'center' },
  line:   { flex: 1, height: 2, marginTop: 14, borderRadius: 1 },
});
