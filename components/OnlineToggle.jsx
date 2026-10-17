import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';

export default function OnlineToggle({ isOnline, onToggle, loading }) {
  const { Colors } = useTheme();
  const translateX = useRef(new Animated.Value(isOnline ? 1 : 0)).current;
  const glowOpacity = useRef(new Animated.Value(isOnline ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, { toValue: isOnline ? 1 : 0, tension: 80, friction: 10, useNativeDriver: true }),
      Animated.timing(glowOpacity, { toValue: isOnline ? 1 : 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [isOnline]);

  const thumbTranslate = translateX.interpolate({ inputRange: [0, 1], outputRange: [3, 33] });
  const onlineColor  = Colors.success;
  const offlineColor = Colors.border;

  return (
    // The whole card is the tap target — the worker toggles this constantly, often one-handed.
    <TouchableOpacity
      style={[styles.wrapper, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
      onPress={loading ? undefined : onToggle}
      activeOpacity={0.85}
      accessibilityRole="switch"
      accessibilityLabel="Available for jobs"
      accessibilityState={{ checked: isOnline, busy: !!loading }}
    >
      <Animated.View style={[styles.glow, { opacity: glowOpacity }]}>
        <LinearGradient
          colors={[onlineColor + '18', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={styles.textCol}>
        <Text style={[styles.status, { color: isOnline ? onlineColor : Colors.mutedForeground }]}>
          {isOnline ? 'You are Online' : 'You are Offline'}
        </Text>
        <Text style={[styles.sub, { color: Colors.subtleForeground }]}>
          {isOnline ? 'Accepting new job requests' : 'Tap to start accepting jobs'}
        </Text>
      </View>

      <View>
        <View style={[styles.track, { backgroundColor: isOnline ? onlineColor + '30' : Colors.surfaceRaised, borderColor: isOnline ? onlineColor : Colors.border }]}>
          <Animated.View style={[styles.thumb, { backgroundColor: isOnline ? onlineColor : Colors.mutedForeground, transform: [{ translateX: thumbTranslate }] }]}>
            <Ionicons
              name={isOnline ? 'radio-button-on' : 'radio-button-off'}
              size={14}
              color={isOnline ? '#FFF' : Colors.surface}
            />
          </Animated.View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base, marginHorizontal: Spacing.base, overflow: 'hidden' },
  glow:     { ...StyleSheet.absoluteFillObject },
  textCol:  { flex: 1, gap: 3 },
  status:   { fontSize: FontSize.h3, fontWeight: FontWeight.semibold },
  sub:      { fontSize: FontSize.sm },
  track:    { width: 68, height: 36, borderRadius: 18, borderWidth: 1.5, justifyContent: 'center' },
  thumb:    { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
});
