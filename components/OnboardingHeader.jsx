import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing } from '@constants/theme';

const TOTAL_STEPS = 5;

export default function OnboardingHeader({ step, title, subtitle }) {
  const { Colors } = useTheme();
  const canGoBack = router.canGoBack();

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        {canGoBack ? (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={8}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={Colors.foreground} />
          </TouchableOpacity>
        ) : <View style={styles.backBtn} />}
        <Text style={[styles.stepText, { color: Colors.mutedForeground }]}>
          Step {step} of {TOTAL_STEPS}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.progress}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[styles.segment, { backgroundColor: i < step ? Colors.primary : Colors.border }]}
          />
        ))}
      </View>

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
