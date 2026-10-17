import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@context/theme';
import { FontWeight } from '@constants/theme';

export default function BrandMark({ size = 56 }) {
  const { Colors } = useTheme();

  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, borderRadius: size * 0.28, backgroundColor: Colors.primary },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.48, color: Colors.onPrimary }]}>7</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box:  { justifyContent: 'center', alignItems: 'center' },
  text: { fontWeight: FontWeight.bold, includeFontPadding: false },
});
