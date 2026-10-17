import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkState } from 'expo-network';
import { FontSize, FontWeight, Spacing } from '@constants/theme';

/** App-wide strip shown while the phone has no internet connection. */
export default function OfflineBanner() {
  const { isConnected, isInternetReachable } = useNetworkState();
  const insets = useSafeAreaInsets();
  // Both are undefined until the first reading — only react to a definite "no".
  if (isConnected !== false && isInternetReachable !== false) return null;

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 4 }]} pointerEvents="none"
      accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Ionicons name="cloud-offline-outline" size={14} color="#FFF" />
      <Text style={styles.text}>No internet — updates will resume when you're back online</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar:  { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 6, paddingHorizontal: Spacing.base, backgroundColor: '#B45309', zIndex: 100 },
  text: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
});
