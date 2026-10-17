import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';

// One hidden TextInput behind N display boxes. Supports paste and SMS
// autofill on both platforms, and the boxes flex so they never overflow
// narrow screens.
export default function OtpInput({ length, value, onChange, autoFocus = false, focusDelay = 0, hasError = false }) {
  const { Colors } = useTheme();
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!autoFocus) return undefined;
    const t = setTimeout(() => inputRef.current?.focus(), focusDelay);
    return () => clearTimeout(t);
  }, [autoFocus, focusDelay]);

  const handleChange = (text) => {
    onChange(text.replace(/[^0-9]/g, '').slice(0, length));
  };

  return (
    <Pressable style={styles.row} onPress={() => inputRef.current?.focus()}>
      {Array.from({ length }).map((_, i) => {
        const digit = value[i] ?? '';
        const isActive = focused && i === Math.min(value.length, length - 1);
        const borderColor = hasError
          ? Colors.error
          : isActive ? Colors.primary : digit ? Colors.foreground + '40' : Colors.border;
        return (
          <View key={i} style={[styles.box, { backgroundColor: Colors.inputBg, borderColor }]}>
            <Text style={[styles.digit, { color: Colors.foreground }]}>{digit}</Text>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        importantForAutofill="yes"
        maxLength={length}
        caretHidden
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row:    { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  box:    { flex: 1, maxWidth: 56, height: 56, borderRadius: Radius.md, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  digit:  { fontSize: FontSize.h2, fontWeight: FontWeight.semibold, includeFontPadding: false },
  hidden: { ...StyleSheet.absoluteFillObject, opacity: 0 },
});
