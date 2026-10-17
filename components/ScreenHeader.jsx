import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing } from '@constants/theme';

// `large` is for top-level tab screens (no back button, big title).
export default function ScreenHeader({ title, subtitle, back = false, onBack, right, large = false }) {
  const { Colors } = useTheme();

  return (
    <View style={[styles.root, large && styles.rootLarge]}>
      {back ? (
        <TouchableOpacity
          onPress={onBack ?? (() => router.back())}
          style={styles.backBtn}
          hitSlop={8}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={Colors.foreground} />
        </TouchableOpacity>
      ) : null}

      <View style={styles.titleCol}>
        <Text
          style={[large ? styles.titleLarge : styles.title, { color: Colors.foreground }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: Colors.mutedForeground }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: Spacing.base, gap: Spacing.sm },
  rootLarge:  { minHeight: 64 },
  backBtn:    { width: 40, height: 40, marginLeft: -Spacing.sm, justifyContent: 'center', alignItems: 'center' },
  titleCol:   { flex: 1 },
  title:      { fontSize: FontSize.h3, fontWeight: FontWeight.semibold },
  titleLarge: { fontSize: FontSize.h1, fontWeight: FontWeight.bold },
  subtitle:   { fontSize: FontSize.sm, marginTop: 2 },
  right:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
