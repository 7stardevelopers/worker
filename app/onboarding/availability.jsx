import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';
import OnboardingHeader from '@components/OnboardingHeader';
import FooterBar from '@components/FooterBar';
import Button from '@components/Button';

const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOTS = [
  { key: '06:00–09:00', start: '6 AM',  end: '9 AM'  },
  { key: '09:00–12:00', start: '9 AM',  end: '12 PM' },
  { key: '12:00–15:00', start: '12 PM', end: '3 PM'  },
  { key: '15:00–18:00', start: '3 PM',  end: '6 PM'  },
  { key: '18:00–21:00', start: '6 PM',  end: '9 PM'  },
];

export default function AvailabilityScreen() {
  const { Colors } = useTheme();
  const { token } = useAuth();
  const [schedule, setSchedule] = useState({});
  const [saving,   setSaving]   = useState(false);

  const toggle = (day, slot) => {
    const key = `${day}__${slot}`;
    setSchedule(prev => {
      const next = { ...prev };
      if (next[key]) delete next[key]; else next[key] = true;
      return next;
    });
  };

  const isSelected = (day, slot) => !!schedule[`${day}__${slot}`];
  const count = Object.keys(schedule).length;

  const handleSubmit = async () => {
    if (count === 0) {
      Alert.alert('Required', 'Select at least one time slot.');
      return;
    }
    setSaving(true);
    try {
      await api.patch('/providers/me', {}, token);
    } catch {
      // non-fatal — profile already exists from earlier steps
    } finally {
      setSaving(false);
    }
    // Last step is the camera selfie — saving it submits the application.
    router.push('/onboarding/photo');
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <OnboardingHeader stepKey="availability" title="Availability" subtitle="Tap the slots when you can usually take jobs." />

        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <View style={styles.slotCol} />
            {DAYS.map(d => (
              <Text key={d} style={[styles.dayLabel, { color: Colors.mutedForeground }]}>{d}</Text>
            ))}
          </View>

          {SLOTS.map(slot => (
            <View key={slot.key} style={styles.gridRow}>
              <View style={styles.slotCol}>
                <Text style={[styles.slotText, { color: Colors.foreground }]}>{slot.start}</Text>
                <Text style={[styles.slotSub, { color: Colors.subtleForeground }]}>{slot.end}</Text>
              </View>
              {DAYS.map(day => {
                const active = isSelected(day, slot.key);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: active ? Colors.primary : Colors.surface,
                        borderColor: active ? Colors.primary : Colors.border,
                      },
                    ]}
                    onPress={() => toggle(day, slot.key)}
                    activeOpacity={0.7}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={`${day} ${slot.start} to ${slot.end}`}
                  >
                    {active ? <Ionicons name="checkmark" size={14} color={Colors.onPrimary} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <Text style={[styles.hint, { color: Colors.mutedForeground }]}>
          {count > 0 ? `${count} slot${count === 1 ? '' : 's'} selected. ` : ''}You can change this later.
        </Text>
      </ScrollView>

      <FooterBar>
        <Button title="Continue" onPress={handleSubmit} disabled={count === 0} loading={saving} />
      </FooterBar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:     { flex: 1 },
  scroll:   { padding: Spacing.base, paddingTop: 0, gap: Spacing.lg },
  grid:     { gap: Spacing.xs + 2 },
  gridRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  slotCol:  { width: 48 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  slotText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  slotSub:  { fontSize: FontSize.xs - 1 },
  cell:     { flex: 1, aspectRatio: 1, maxHeight: 44, borderRadius: Radius.sm, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', alignItems: 'center' },
  hint:     { fontSize: FontSize.sm, textAlign: 'center' },
});
