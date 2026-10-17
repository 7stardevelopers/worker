import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';

export default function EmptyState({ icon, title, subtitle, cta, iconColor, compact = false }) {
  const { Colors } = useTheme();
  const color = iconColor ?? Colors.primary;

  return (
    <View style={[styles.root, compact && styles.compact]}>
      <View style={[styles.iconWrap, { backgroundColor: color + '15' }]}>
        <LinearGradient colors={[color + '30', color + '12']} style={styles.iconGlow} />
        <Ionicons name={icon} size={compact ? 28 : 38} color={color} />
      </View>

      <Text style={[styles.title, { color: Colors.foreground }, compact && styles.titleCompact]}>
        {title}
      </Text>

      {subtitle ? (
        <Text style={[styles.subtitle, { color: Colors.mutedForeground }, compact && styles.subtitleCompact]}>
          {subtitle}
        </Text>
      ) : null}

      {cta ? (
        <TouchableOpacity style={styles.cta} onPress={cta.onPress} activeOpacity={0.85}>
          <LinearGradient colors={Colors.gradientPrimary} style={styles.ctaGrad}>
            <Text style={styles.ctaText}>{cta.label}</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root:            { alignItems: 'center', paddingVertical: 56, paddingHorizontal: Spacing.xl, gap: Spacing.md },
  compact:         { paddingVertical: 32, gap: Spacing.sm },
  iconWrap:        { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  iconGlow:        { ...StyleSheet.absoluteFillObject },
  title:           { fontSize: FontSize.h3, fontWeight: FontWeight.bold, textAlign: 'center' },
  titleCompact:    { fontSize: FontSize.body },
  subtitle:        { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22, maxWidth: 280 },
  subtitleCompact: { fontSize: FontSize.xs },
  cta:             { borderRadius: Radius.xl, overflow: 'hidden', marginTop: Spacing.sm },
  ctaGrad:         { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  ctaText:         { fontSize: FontSize.body, fontWeight: FontWeight.bold, color: '#FFF' },
});
