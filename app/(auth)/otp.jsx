import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@context/auth';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';

const OTP_LENGTH = 6;

export default function OtpScreen() {
  const { Colors } = useTheme();
  const { login } = useAuth();
  const { phone } = useLocalSearchParams();
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [timer, setTimer]   = useState(30);
  const inputs = useRef([]);

  useEffect(() => {
    inputs.current[0]?.focus();
    const iv = setInterval(() => setTimer(t => t > 0 ? t - 1 : 0), 1000);
    return () => clearInterval(iv);
  }, []);

  const handleChange = (val, idx) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...digits];
    next[idx] = val;
    setDigits(next);
    if (val && idx < OTP_LENGTH - 1) inputs.current[idx + 1]?.focus();
    if (!val && idx > 0) inputs.current[idx - 1]?.focus();
  };

  const handleKeyPress = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length < OTP_LENGTH) return;
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/verify-otp', { phone, otp: code, role: 'PROVIDER' });
      const { access_token, refresh_token, user } = res.data;
      await login(access_token, refresh_token, user);
      // index.jsx reads provider status and routes to (tabs) or onboarding
      router.replace('/');
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    try {
      await api.post('/auth/send-otp', { phone });
      setTimer(30);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  };

  const isComplete = digits.every(d => d !== '');

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <LinearGradient colors={['rgba(99,102,241,0.12)', 'transparent']} style={styles.gradient} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.content}>

          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.primary + '20' }]}>
              <Ionicons name="chatbubble-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={[styles.heading, { color: Colors.foreground }]}>Verify OTP</Text>
            <Text style={[styles.sub, { color: Colors.mutedForeground }]}>
              6-digit code sent to +91 {phone}
            </Text>
          </View>

          <View style={styles.otpRow}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={r => { inputs.current[i] = r; }}
                style={[
                  styles.box,
                  {
                    backgroundColor: Colors.surface,
                    borderColor: d ? Colors.primary : Colors.border,
                    color: Colors.foreground,
                  },
                ]}
                value={d}
                onChangeText={v => handleChange(v, i)}
                onKeyPress={e => handleKeyPress(e, i)}
                keyboardType="numeric"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          {error ? <Text style={{ color: Colors.error, textAlign: 'center', fontSize: FontSize.sm }}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, { opacity: isComplete && !loading ? 1 : 0.45 }]}
            onPress={handleVerify}
            disabled={!isComplete || loading}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#6366F1', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnGradient}>
              {loading ? (
                <Text style={styles.btnText}>Verifying...</Text>
              ) : (
                <>
                  <Text style={styles.btnText}>Verify & Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.resendRow}>
            <Text style={[styles.resendLabel, { color: Colors.mutedForeground }]}>Didn't receive OTP? </Text>
            {timer > 0
              ? <Text style={[styles.resendTimer, { color: Colors.mutedForeground }]}>Resend in {timer}s</Text>
              : (
                <TouchableOpacity onPress={handleResend}>
                  <Text style={[styles.resendBtn, { color: Colors.primary }]}>Resend OTP</Text>
                </TouchableOpacity>
              )
            }
          </View>

        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  gradient:   { position: 'absolute', top: 0, left: 0, right: 0, height: 250 },
  content:    { flex: 1, padding: Spacing.base, paddingTop: 60, gap: Spacing.xl },
  backBtn:    { width: 40, height: 40, justifyContent: 'center' },
  header:     { alignItems: 'center', gap: Spacing.md },
  iconCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  heading:    { fontSize: FontSize.h1, fontWeight: FontWeight.bold },
  sub:        { fontSize: FontSize.body, textAlign: 'center' },
  otpRow:     { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  box:        { width: 50, height: 60, borderRadius: Radius.md, borderWidth: 1.5, textAlign: 'center', fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  btn:        { borderRadius: Radius.md, overflow: 'hidden', height: 56 },
  btnGradient:{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  btnText:    { color: '#FFF', fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  resendRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  resendLabel:{ fontSize: FontSize.sm },
  resendTimer:{ fontSize: FontSize.sm },
  resendBtn:  { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
