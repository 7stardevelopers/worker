import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView, ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { APP_NAME } from '@constants/brand';
import { friendlyError } from '@utils/errors';
import { api } from '@utils/api';
import BrandMark from '@components/BrandMark';
import Button from '@components/Button';

export default function LoginScreen() {
  const { Colors } = useTheme();
  const [phone,   setPhone]   = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const shake = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 6,  duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 4,  duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0,  duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const isValid = phone.length === 10;

  const handleSendOtp = async () => {
    if (!isValid) { triggerShake(); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/send-otp', { phone });
      router.push({ pathname: '/(auth)/otp', params: { phone } });
    } catch (e) {
      setError(friendlyError(e) ?? '');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.brand}>
            <BrandMark size={56} />
            <Text style={[styles.appName, { color: Colors.foreground }]}>{APP_NAME}</Text>
            <Text style={[styles.tagline, { color: Colors.mutedForeground }]}>Partner app</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.headingBlock}>
              <Text style={[styles.heading, { color: Colors.foreground }]}>Sign in</Text>
              <Text style={[styles.sub, { color: Colors.mutedForeground }]}>
                Enter your mobile number. We'll send you a one-time code.
              </Text>
            </View>

            <Animated.View
              style={[
                styles.inputBox,
                {
                  backgroundColor: Colors.inputBg,
                  borderColor: error ? Colors.error : focused ? Colors.primary : Colors.border,
                  transform: [{ translateX: shake }],
                },
              ]}
            >
              <Text style={[styles.prefix, { color: Colors.mutedForeground }]}>+91</Text>
              <View style={[styles.divider, { backgroundColor: Colors.border }]} />
              <TextInput
                style={[styles.input, { color: Colors.foreground }]}
                placeholder="Mobile number"
                placeholderTextColor={Colors.subtleForeground}
                keyboardType="number-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                maxLength={10}
                value={phone}
                onChangeText={v => { setPhone(v.replace(/\D/g, '')); if (error) setError(''); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onSubmitEditing={handleSendOtp}
                returnKeyType="done"
              />
            </Animated.View>

            {error ? <Text style={[styles.error, { color: Colors.error }]}>{error}</Text> : null}

            <Button title="Continue" onPress={handleSendOtp} disabled={!isValid} loading={loading} />
          </View>

          <Text style={[styles.terms, { color: Colors.subtleForeground }]}>
            By continuing you agree to our{' '}
            <Text style={{ color: Colors.mutedForeground }}>Terms of Service</Text>
            {' and '}
            <Text style={{ color: Colors.mutedForeground }}>Privacy Policy</Text>.
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  flex:         { flex: 1 },
  scroll:       { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl4, paddingBottom: Spacing.xl, gap: Spacing.xl3 },
  brand:        { alignItems: 'center', gap: Spacing.sm },
  appName:      { fontSize: FontSize.h2, fontWeight: FontWeight.bold, marginTop: Spacing.sm },
  tagline:      { fontSize: FontSize.sm },
  form:         { gap: Spacing.base },
  headingBlock: { gap: Spacing.xs, marginBottom: Spacing.xs },
  heading:      { fontSize: FontSize.h1, fontWeight: FontWeight.bold },
  sub:          { fontSize: FontSize.body, lineHeight: 22 },
  inputBox:     { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, borderWidth: 1, height: 52, paddingHorizontal: Spacing.md, gap: Spacing.md },
  prefix:       { fontSize: FontSize.body, fontWeight: FontWeight.medium },
  divider:      { width: StyleSheet.hairlineWidth, height: 24 },
  input:        { flex: 1, height: '100%', fontSize: FontSize.h3, letterSpacing: 0.5, paddingVertical: 0 },
  error:        { fontSize: FontSize.sm },
  terms:        { marginTop: 'auto', fontSize: FontSize.xs, textAlign: 'center', lineHeight: 18 },
});
