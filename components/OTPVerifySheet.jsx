import React, { useState, useRef } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius, Shadow } from '@constants/theme';

const OTP_LENGTH = 4;

export default function OTPVerifySheet({ visible, onVerify, onClose, loading }) {
  const { Colors } = useTheme();
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [error, setError]   = useState('');
  const inputs = useRef([]);
  const slideY = useRef(new Animated.Value(300)).current;

  React.useEffect(() => {
    if (visible) {
      setDigits(Array(OTP_LENGTH).fill(''));
      setError('');
      Animated.spring(slideY, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }).start();
      setTimeout(() => inputs.current[0]?.focus(), 300);
    } else {
      slideY.setValue(300);
    }
  }, [visible]);

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

  const handleSubmit = () => {
    const code = digits.join('');
    if (code.length < OTP_LENGTH) { setError('Enter the full 4-digit code'); return; }
    setError('');
    onVerify(code);
  };

  const isComplete = digits.every(d => d !== '');

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.sheet, { backgroundColor: Colors.surface, transform: [{ translateY: slideY }] }, Shadow.lg]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.primary + '20' }]}>
              <Ionicons name="keypad-outline" size={28} color={Colors.primary} />
            </View>
            <Text style={[styles.title, { color: Colors.foreground }]}>Door OTP</Text>
            <Text style={[styles.sub, { color: Colors.mutedForeground }]}>
              Ask the customer for their 4-digit door code
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

          {error ? <Text style={[styles.error, { color: Colors.error }]}>{error}</Text> : null}

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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:      { borderTopLeftRadius: Radius.xl2, borderTopRightRadius: Radius.xl2, padding: Spacing.base, paddingBottom: 40, gap: Spacing.lg },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: Spacing.sm },
  header:     { alignItems: 'center', gap: Spacing.md },
  iconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  title:      { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  sub:        { fontSize: FontSize.body, textAlign: 'center', lineHeight: 22 },
  otpRow:     { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  box:        { width: 64, height: 72, borderRadius: Radius.md, borderWidth: 1.5, textAlign: 'center', fontSize: FontSize.h1, fontWeight: FontWeight.bold },
  error:      { textAlign: 'center', fontSize: FontSize.sm },
  actions:    { flexDirection: 'row', gap: Spacing.sm },
  cancelBtn:  { width: 90, height: 52, borderRadius: Radius.lg, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  cancelText: { fontSize: FontSize.body, fontWeight: FontWeight.medium },
  verifyBtn:  { borderRadius: Radius.lg, overflow: 'hidden', height: 52 },
  verifyGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  verifyText: { color: '#FFF', fontSize: FontSize.body, fontWeight: FontWeight.bold },
});
