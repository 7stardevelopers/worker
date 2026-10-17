import React from 'react';
import { TouchableOpacity, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';

// Single button primitive for the whole app. Fixed height so swapping the
// label for a spinner never shifts the layout.
export default function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  compact = false,
  style,
}) {
  const { Colors } = useTheme();

  const palette = {
    primary:   { bg: Colors.primary,  fg: Colors.onPrimary,       border: Colors.primary },
    secondary: { bg: Colors.surface,  fg: Colors.foreground,      border: Colors.border },
    danger:    { bg: 'transparent',   fg: Colors.error,           border: Colors.error },
    ghost:     { bg: 'transparent',   fg: Colors.mutedForeground, border: 'transparent' },
  }[variant] ?? { bg: Colors.primary, fg: Colors.onPrimary, border: Colors.primary };

  const inactive = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[
        styles.base,
        compact && styles.compact,
        { backgroundColor: palette.bg, borderColor: palette.border },
        disabled && !loading && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={compact ? 16 : 18} color={palette.fg} /> : null}
          <Text style={[styles.label, compact && styles.labelCompact, { color: palette.fg }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base:         { height: 52, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.lg, justifyContent: 'center', alignItems: 'center' },
  compact:      { height: 40, paddingHorizontal: Spacing.base },
  disabled:     { opacity: 0.4 },
  content:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  label:        { fontSize: FontSize.body, fontWeight: FontWeight.semibold, flexShrink: 1 },
  labelCompact: { fontSize: FontSize.sm },
});
