import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing } from '@constants/theme';
import BrandMark from '@components/BrandMark';
import { APP_NAME } from '@constants/brand';

// Full-screen loading state. Always centred on both axes.
// - `brand`   shows the app mark above the spinner (app start / auth gate)
// - `overlay` pins it over the whole screen so it stays centred even when a
//             header sits above it; touches pass through to the header.
export default function LoadingScreen({ label, brand = false, overlay = false }) {
  const { Colors } = useTheme();

  return (
    <View
      style={[styles.root, overlay ? styles.overlay : { backgroundColor: Colors.background }]}
      pointerEvents={overlay ? 'none' : 'auto'}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Loading'}
    >
      {brand ? (
        <View style={styles.brand}>
          <BrandMark size={64} />
          <Text style={[styles.appName, { color: Colors.foreground }]}>{APP_NAME}</Text>
        </View>
      ) : null}
      <ActivityIndicator size="large" color={Colors.primary} />
      {label ? <Text style={[styles.label, { color: Colors.mutedForeground }]}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, gap: Spacing.base },
  overlay: { ...StyleSheet.absoluteFill },
  brand:   { alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xl },
  appName: { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  label:   { fontSize: FontSize.sm, textAlign: 'center' },
});
