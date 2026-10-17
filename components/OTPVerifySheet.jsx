import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing } from '@constants/theme';
import BottomSheet from '@components/BottomSheet';
import OtpInput from '@components/OtpInput';
import Button from '@components/Button';

const OTP_LENGTH = 4;

export default function OTPVerifySheet({ visible, onVerify, onClose, loading, apiError }) {
  const { Colors } = useTheme();
  const [code, setCode] = useState('');

  useEffect(() => {
    if (visible) setCode('');
  }, [visible]);

  const isComplete = code.length === OTP_LENGTH;

  return (
    <BottomSheet visible={visible} onClose={onClose} dismissible={!loading}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: Colors.foreground }]}>Door code</Text>
        <Text style={[styles.sub, { color: Colors.mutedForeground }]}>
          Ask the customer for the 4-digit code shown in their app.
        </Text>
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
