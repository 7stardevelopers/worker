import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing } from '@constants/theme';
import Button from '@components/Button';

export default function EmptyState({ icon, title, subtitle, cta, iconColor, compact = false }) {
  const { Colors } = useTheme();
  const color = iconColor ?? Colors.mutedForeground;

  return (
    <View style={[styles.root, compact && styles.compact]}>
      <View style={[styles.iconWrap, compact && styles.iconWrapCompact, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        <Ionicons name={icon} size={compact ? 22 : 28} color={color} />
      </View>

      <Text style={[styles.title, { color: Colors.foreground }]}>{title}</Text>

      {subtitle ? (
        <Text style={[styles.subtitle, { color: Colors.mutedForeground }]}>{subtitle}</Text>
      ) : null}

      {cta ? (
        <Button title={cta.label} onPress={cta.onPress} compact style={styles.cta} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root:            { alignItems: 'center', paddingVertical: Spacing.xl4, paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  compact:         { paddingVertical: Spacing.xl2 },
  iconWrap:        { width: 64, height: 64, borderRadius: 32, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  iconWrapCompact: { width: 48, height: 48, borderRadius: 24 },
  title:           { fontSize: FontSize.body, fontWeight: FontWeight.semibold, textAlign: 'center' },
  subtitle:        { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  cta:             { marginTop: Spacing.md },
});
