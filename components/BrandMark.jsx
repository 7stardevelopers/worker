import React from 'react';
import { Image, StyleSheet } from 'react-native';

const ICON = require('../assets/icon.png');

// The app icon, used wherever the brand appears inside the app.
export default function BrandMark({ size = 56 }) {
  return (
    <Image
      source={ICON}
      style={[styles.icon, { width: size, height: size, borderRadius: size * 0.24 }]}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  icon: { overflow: 'hidden' },
});
