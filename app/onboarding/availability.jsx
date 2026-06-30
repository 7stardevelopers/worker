import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOTS = ['06:00–09:00', '09:00–12:00', '12:00–15:00', '15:00–18:00', '18:00–21:00'];

export default function AvailabilityScreen() {
  const { Colors } = useTheme();
  const { token } = useAuth();
  const [schedule, setSchedule] = useState({});
  const [saving,   setSaving]   = useState(false);

  const toggle = (day, slot) => {
    const key = `${day}__${slot}`;
    setSchedule(prev => {
      const next = { ...prev };
      next[key] ? delete next[key] : (next[key] = true);
      return next;
    });
  };

  const isSelected = (day, slot) => !!schedule[`${day}__${slot}`];

  const handleSubmit = async () => {
    if (Object.keys(schedule).length === 0) {
      Alert.alert('Required', 'Select at least one availability slot');
      return;
    }
    setSaving(true);
    try {
      const slots = Object.keys(schedule).map(k => {
        const [day, slot] = k.split('__');
        return { day, slot };
      });
      await api.patch('/providers/me/availability-schedule', { slots }, token);
      Alert.alert(
        'Application Submitted! 🎉',
        'Your profile is under review. You\'ll be notified within 24 hours once approved.',
        [{ text: 'OK', onPress: () => router.replace('/onboarding/personal') }]
      );
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.title, { color: Colors.foreground }]}>Availability</Text>
            <Text style={[styles.sub, { color: Colors.mutedForeground }]}>Choose your working hours</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.gridHeader}>
            <View style={styles.dayLabelCol} />
            {DAYS.map(d => (
              <Text key={d} style={[styles.dayLabel, { color: Colors.mutedForeground }]}>{d}</Text>
            ))}
          </View>

          {SLOTS.map(slot => (
            <View key={slot} style={styles.slotRow}>
              <Text style={[styles.slotLabel, { color: Colors.mutedForeground }]} numberOfLines={2}>
                {slot.replace('–', '\n')}
              </Text>
              {DAYS.map(day => {
                const active = isSelected(day, slot);
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
                    onPress={() => toggle(day, slot)}
                    activeOpacity={0.7}
                  >
                    {active && <Ionicons name="checkmark" size={12} color="#FFF" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <Text style={[styles.hint, { color: Colors.mutedForeground }]}>
          Tap cells to toggle availability. You can update this anytime from your profile.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: Colors.border }]}>
        <TouchableOpacity
          style={[styles.submitBtn, { opacity: !saving ? 1 : 0.6 }]}
          onPress={handleSubmit}
          disabled={saving}
          activeOpacity={0.85}
        >
          <LinearGradient colors={Colors.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitGrad}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
            <Text style={styles.submitText}>{saving ? 'Submitting...' : 'Submit Application'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  scroll:      { padding: Spacing.base, paddingBottom: 120, gap: Spacing.base },
  header:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingBottom: Spacing.md },
  title:       { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  sub:         { fontSize: FontSize.sm },
  grid:        { gap: 8 },
  gridHeader:  { flexDirection: 'row', alignItems: 'center' },
  dayLabelCol: { width: 54 },
  dayLabel:    { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: FontWeight.bold },
  slotRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  slotLabel:   { width: 54, fontSize: 9, lineHeight: 13 },
  cell:        { flex: 1, height: 36, borderRadius: 6, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  hint:        { fontSize: FontSize.xs, textAlign: 'center', lineHeight: 20 },
  footer:      { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.base, paddingBottom: 36, borderTopWidth: StyleSheet.hairlineWidth },
  submitBtn:   { borderRadius: Radius.lg, overflow: 'hidden', height: 56 },
  submitGrad:  { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  submitText:  { color: '#FFF', fontSize: FontSize.body, fontWeight: FontWeight.bold },
});
