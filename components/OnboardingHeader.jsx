import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing } from '@constants/theme';
import { STEP_ORDER, goBackFrom } from '@utils/onboarding';

// Header for an onboarding step. `stepKey` is the step's name in STEP_ORDER.
// `editing` hides the progress (the worker is fixing one field from Profile).
// Pass `back={false}` when there is nowhere to go back to.
export default function OnboardingHeader({ stepKey, title, subtitle, editing = false, back = true, onBack }) {
  const { Colors } = useTheme();
  const total = STEP_ORDER.length;
  const step = STEP_ORDER.indexOf(stepKey) + 1;

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        {back ? (
          <TouchableOpacity
            onPress={onBack ?? (() => goBackFrom(stepKey))}
            style={styles.backBtn}
            hitSlop={8}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={Colors.foreground} />
          </TouchableOpacity>
        ) : <View style={styles.backBtn} />}
        {!editing && step > 0 ? (
          <Text style={[styles.stepText, { color: Colors.mutedForeground }]}>
            Step {step} of {total}
          </Text>
        ) : null}
        <View style={styles.backBtn} />
      </View>

      {!editing && step > 0 ? (
        <View style={styles.progress}>
          {STEP_ORDER.map((key, i) => (
            <View
              key={key}
              style={[styles.segment, { backgroundColor: i < step ? Colors.primary : Colors.border }]}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: Colors.foreground }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: Colors.mutedForeground }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { gap: Spacing.base, paddingBottom: Spacing.sm },
  topRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  backBtn:    { width: 40, height: 40, marginLeft: -Spacing.sm, justifyContent: 'center', alignItems: 'center' },
  stepText:   { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  progress:   { flexDirection: 'row', gap: Spacing.xs },
  segment:    { flex: 1, height: 3, borderRadius: 2 },
  titleBlock: { gap: Spacing.xs, marginTop: Spacing.sm },
  title:      { fontSize: FontSize.h1, fontWeight: FontWeight.bold },
  subtitle:   { fontSize: FontSize.body, lineHeight: 22 },
});
