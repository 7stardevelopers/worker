import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@context/theme';
import { Spacing } from '@constants/theme';

// Sticky bottom action area. Sits in normal layout flow (not absolute) so it
// never overlaps scroll content, and pads for the home indicator / nav bar.
export default function FooterBar({ children }) {
  const { Colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: Colors.background,
          borderTopColor: Colors.border,
          paddingBottom: Math.max(insets.bottom, Spacing.base),
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: Spacing.base, paddingTop: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth, gap: Spacing.sm },
});
