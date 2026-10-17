import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@context/auth';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing } from '@constants/theme';
import { friendlyError } from '@utils/errors';
import { api } from '@utils/api';
import { formatPhone } from '@utils/format';
import ScreenHeader from '@components/ScreenHeader';
import OtpInput from '@components/OtpInput';
import Button from '@components/Button';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function OtpScreen() {
  const { Colors } = useTheme();
  const { login } = useAuth();
  const { phone } = useLocalSearchParams();
  const [code,      setCode]      = useState('');
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [error,     setError]     = useState('');
  const [timer,     setTimer]     = useState(RESEND_SECONDS);

  useEffect(() => {
    const iv = setInterval(() => setTimer(t => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(iv);
  }, []);

  const handleVerify = async (value = code) => {
    if (value.length < OTP_LENGTH || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/verify-otp', { phone, otp: value, role: 'PROVIDER' });
      const { access_token, refresh_token, user } = res.data;
      await login(access_token, refresh_token, user);
      // index.jsx reads provider status and routes to (tabs) or onboarding
      router.replace('/');
    } catch (e) {
      setError(friendlyError(e) ?? '');
      setLoading(false);
    }
  };

  const handleChange = (value) => {
    setCode(value);
    if (error) setError('');
    if (value.length === OTP_LENGTH) handleVerify(value);
  };

  const handleResend = async () => {
    if (timer > 0 || resending) return;
    setResending(true);
    try {
      await api.post('/auth/send-otp', { phone });
      setTimer(RESEND_SECONDS);
      setCode('');
      setError('');
    } catch (e) {
      setError(friendlyError(e) ?? '');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top', 'bottom']}>
      <ScreenHeader back title="" />
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.headingBlock}>
            <Text style={[styles.heading, { color: Colors.foreground }]}>Enter code</Text>
            <Text style={[styles.sub, { color: Colors.mutedForeground }]}>
              We sent a 6-digit code to {formatPhone(phone)}
            </Text>
          </View>

          <OtpInput length={OTP_LENGTH} value={code} onChange={handleChange} autoFocus hasError={!!error} />

          {error ? <Text style={[styles.error, { color: Colors.error }]}>{error}</Text> : null}

          <Button
            title="Verify"
            onPress={() => handleVerify()}
            disabled={code.length < OTP_LENGTH}
            loading={loading}
          />

          <View style={styles.resendRow}>
            {timer > 0 ? (
              <Text style={[styles.resendText, { color: Colors.mutedForeground }]}>
                Resend code in {timer}s
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={resending} activeOpacity={0.7} hitSlop={8}>
                <Text style={[styles.resendLink, { color: resending ? Colors.mutedForeground : Colors.primary }]}>
                  {resending ? 'Sending...' : 'Resend code'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  flex:         { flex: 1 },
  scroll:       { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.base, paddingBottom: Spacing.xl, gap: Spacing.xl },
  headingBlock: { gap: Spacing.xs },
  heading:      { fontSize: FontSize.h1, fontWeight: FontWeight.bold },
  sub:          { fontSize: FontSize.body, lineHeight: 22 },
  error:        { fontSize: FontSize.sm, textAlign: 'center', marginTop: -Spacing.sm },
  resendRow:    { alignItems: 'center' },
  resendText:   { fontSize: FontSize.sm },
  resendLink:   { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
