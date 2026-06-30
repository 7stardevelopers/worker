import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';

export default function LoginScreen() {
  const { Colors, isDark } = useTheme();
  const [phone, setPhone]   = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const shake = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleSendOtp = async () => {
    if (phone.length !== 10) { triggerShake(); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/send-otp', { phone });
      router.push({ pathname: '/(auth)/otp', params: { phone } });
    } catch (e) {
      setError(e.message);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const isValid = phone.length === 10;

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <LinearGradient
        colors={isDark ? ['rgba(99,102,241,0.18)', 'transparent'] : ['rgba(79,70,229,0.08)', 'transparent']}
        style={styles.gradient}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.hero}>
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.logoBox}
            >
              <Text style={styles.logoText}>7★</Text>
            </LinearGradient>
            <Text style={[styles.appName, { color: Colors.foreground }]}>7StarWorker</Text>
            <Text style={[styles.tagline, { color: Colors.mutedForeground }]}>
              Expert Partner App
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={[styles.heading, { color: Colors.foreground }]}>Welcome back 👋</Text>
            <Text style={[styles.sub, { color: Colors.mutedForeground }]}>
              Enter your registered mobile number
            </Text>

            <Animated.View style={{ transform: [{ translateX: shake }] }}>
              <View style={[
                styles.inputBox,
                { backgroundColor: Colors.inputBg, borderColor: focused ? Colors.primary : Colors.border },
              ]}>
                <View style={styles.prefix}>
                  <Text style={styles.flag}>🇮🇳</Text>
                  <Text style={[styles.prefixText, { color: Colors.mutedForeground }]}>+91</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: Colors.border }]} />
                <TextInput
                  style={[styles.input, { color: Colors.foreground }]}
                  placeholder="Enter mobile number"
                  placeholderTextColor={Colors.subtleForeground}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={setPhone}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                />
                {isValid && <Ionicons name="checkmark-circle" size={20} color={Colors.success} />}
              </View>
            </Animated.View>

            {error ? <Text style={[styles.error, { color: Colors.error }]}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.btn, { opacity: isValid && !loading ? 1 : 0.45 }]}
              onPress={handleSendOtp}
              disabled={!isValid || loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.btnGradient}
              >
                <Text style={styles.btnText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
                {!loading && <Ionicons name="arrow-forward" size={18} color="#FFF" />}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={[styles.terms, { color: Colors.subtleForeground }]}>
              By continuing you agree to our{' '}
              <Text style={{ color: Colors.primary }}>Terms of Service</Text>
              {' & '}
              <Text style={{ color: Colors.primary }}>Privacy Policy</Text>
            </Text>
          </View>

          <View style={styles.badges}>
            {[
              { icon: 'cash-outline',             text: 'Earn Daily'         },
              { icon: 'shield-checkmark-outline', text: 'Verified Platform'  },
              { icon: 'star-outline',             text: '₹500 Referral Bonus' },
            ].map((b) => (
              <View key={b.text} style={[styles.badge, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                <Ionicons name={b.icon} size={16} color={Colors.primary} />
                <Text style={[styles.badgeText, { color: Colors.mutedForeground }]}>{b.text}</Text>
              </View>
            ))}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  gradient:   { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  scroll:     { flexGrow: 1, padding: Spacing.base, paddingBottom: 48 },
  hero:       { alignItems: 'center', paddingTop: 80, paddingBottom: 48, gap: 10 },
  logoBox:    { width: 90, height: 90, borderRadius: 26, justifyContent: 'center', alignItems: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.6, shadowRadius: 24, elevation: 14 },
  logoText:   { fontSize: 38, color: '#FFF', fontWeight: '800' },
  appName:    { fontSize: FontSize.h1, fontWeight: FontWeight.bold },
  tagline:    { fontSize: FontSize.sm },
  form:       { gap: Spacing.base },
  heading:    { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  sub:        { fontSize: FontSize.body },
  inputBox:   { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, borderWidth: 1.5, height: 58, paddingHorizontal: Spacing.md, gap: Spacing.sm },
  prefix:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  flag:       { fontSize: 18 },
  prefixText: { fontSize: FontSize.body, fontWeight: FontWeight.medium },
  divider:    { width: 1, height: 26 },
  input:      { flex: 1, fontSize: FontSize.h3, height: '100%', letterSpacing: 1 },
  btn:        { borderRadius: Radius.md, overflow: 'hidden', height: 56, marginTop: Spacing.sm },
  btnGradient:{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  btnText:    { color: '#FFF', fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  error:      { fontSize: FontSize.sm, textAlign: 'center' },
  terms:      { fontSize: FontSize.xs, textAlign: 'center', lineHeight: 20 },
  badges:     { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.xl, flexWrap: 'wrap' },
  badge:      { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 7, borderWidth: StyleSheet.hairlineWidth },
  badgeText:  { fontSize: 11, fontWeight: FontWeight.medium },
});
