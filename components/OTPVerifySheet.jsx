import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing } from '@constants/theme';
import BottomSheet from '@components/BottomSheet';
import OtpInput from '@components/OtpInput';
import Button from '@components/Button';

const OTP_LENGTH = 4;

export default function OTPVerifySheet({ visible, onVerify, onClose, loading, apiError, customerConfirmed }) {
  const { Colors } = useTheme();
  const [code, setCode] = useState('');

  useEffect(() => {
    if (visible) setCode('');
  }, [visible]);

  const isComplete = code.length === OTP_LENGTH;

  return (
<<<<<<< HEAD
    <BottomSheet visible={visible} onClose={onClose} dismissible={!loading}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: Colors.foreground }]}>Door code</Text>
        <Text style={[styles.sub, { color: Colors.mutedForeground }]}>
          Ask the customer for the 4-digit code shown in their app.
        </Text>
=======
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.sheet, { backgroundColor: Colors.surface, transform: [{ translateY: slideY }] }, Shadow.lg]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.primary + '20' }]}>
              <Ionicons name="keypad-outline" size={28} color={Colors.primary} />
            </View>
            <Text style={[styles.title, { color: Colors.foreground }]}>Door code</Text>
            <Text style={[styles.sub, { color: Colors.mutedForeground }]}>
              {customerConfirmed
                ? 'The customer confirmed it’s you. Ask them for the 4-digit door code.'
                : 'The customer checks your face against your profile photo in their app. Once they tap “Yes”, they’ll see a 4-digit code. Enter it here.'}
            </Text>
          </View>

          <View style={styles.otpRow}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={r => { inputs.current[i] = r; }}
                style={[styles.box, { backgroundColor: Colors.inputBg, borderColor: d ? Colors.primary : Colors.border, color: Colors.foreground }]}
                value={d}
                onChangeText={v => handleChange(v, i)}
                onKeyPress={e => handleKeyPress(e, i)}
                keyboardType="numeric"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          {(error || apiError) ? (
            <Text style={[styles.error, { color: Colors.error }]}>{error || apiError}</Text>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: Colors.border }]} onPress={onClose} activeOpacity={0.8}>
              <Text style={[styles.cancelText, { color: Colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.verifyBtn, { opacity: isComplete && !loading ? 1 : 0.45, flex: 1 }]}
              onPress={handleSubmit}
              disabled={!isComplete || loading}
              activeOpacity={0.85}
            >
              <LinearGradient colors={Colors.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.verifyGrad}>
                <Text style={styles.verifyText}>{loading ? 'Verifying...' : 'Verify & Start'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
      </View>

      <OtpInput
        length={OTP_LENGTH}
        value={code}
        onChange={setCode}
        autoFocus={visible}
        focusDelay={300}
        hasError={!!apiError}
      />

      {apiError ? <Text style={[styles.error, { color: Colors.error }]}>{apiError}</Text> : null}

      <View style={styles.actions}>
        <Button title="Cancel" variant="secondary" onPress={onClose} disabled={loading} style={styles.cancel} />
        <Button
          title="Verify and start"
          onPress={() => onVerify(code)}
          disabled={!isComplete}
          loading={loading}
          style={styles.verify}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header:  { gap: Spacing.xs },
  title:   { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  sub:     { fontSize: FontSize.sm, lineHeight: 20 },
  error:   { fontSize: FontSize.sm, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  cancel:  { flex: 1 },
  verify:  { flex: 2 },
});
