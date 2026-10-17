import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { APP_NAME } from '@constants/brand';

export default function SplashOverlay({ onDone }) {
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const logoScale        = useRef(new Animated.Value(0.4)).current;
  const logoOpacity      = useRef(new Animated.Value(0)).current;
  const titleOpacity     = useRef(new Animated.Value(0)).current;
  const titleY           = useRef(new Animated.Value(20)).current;
  const glowOpacity      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale,   { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(titleY,       { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      ]).start();
    }, 450);

    setTimeout(() => {
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 1,   duration: 500, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.8, duration: 500, useNativeDriver: true }),
      ]).start();
    }, 750);

    const t = setTimeout(() => {
      Animated.timing(containerOpacity, { toValue: 0, duration: 500, useNativeDriver: true })
        .start(() => onDone());
    }, 2600);

    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]} pointerEvents="none">
      <LinearGradient colors={['#000000', '#0A0814', '#000000']} style={StyleSheet.absoluteFill} />

      <Animated.View style={[styles.ring, styles.ring1, { opacity: glowOpacity }]} />
      <Animated.View style={[styles.ring, styles.ring2, { opacity: glowOpacity }]} />
      <Animated.View style={[styles.ring, styles.ring3, { opacity: glowOpacity }]} />

      <Animated.View style={{ transform: [{ scale: logoScale }], opacity: logoOpacity }}>
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.logoBox}
        >
          <Text style={styles.logoText}>M</Text>
        </LinearGradient>
      </Animated.View>

      <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleY }], alignItems: 'center' }}>
        <Text style={styles.title}>{APP_NAME}</Text>
        <Text style={styles.subtitle}>Expert Partner App</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 28,
  },
  ring:  { position: 'absolute', borderRadius: 9999, borderWidth: 1 },
  ring1: { width: 140, height: 140, backgroundColor: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.35)' },
  ring2: { width: 220, height: 220, backgroundColor: 'rgba(99,102,241,0.04)', borderColor: 'rgba(99,102,241,0.18)' },
  ring3: { width: 300, height: 300, backgroundColor: 'transparent',           borderColor: 'rgba(99,102,241,0.08)' },
  logoBox: {
    width: 110, height: 110, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.7, shadowRadius: 30, elevation: 20,
  },
  logoText: { fontSize: 46, color: '#FFFFFF', fontWeight: '800', letterSpacing: -1 },
  title:    { fontSize: 30, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: 'rgba(235,235,245,0.5)', marginTop: 6, letterSpacing: 1 },
});
