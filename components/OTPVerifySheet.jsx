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
    <BottomSheet visible={visible} onClose={onClose} dismissible={!loading}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: Colors.foreground }]}>Door code</Text>
        <Text style={[styles.sub, { color: Colors.mutedForeground }]}>
          {customerConfirmed
            ? 'The customer confirmed it is you. Ask them for the 4-digit door code.'
            : 'The customer checks your face against your profile photo in their app. Once they tap Yes, they see a 4-digit code. Enter it here.'}
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

      {apiError ? (
        <Text style={[styles.error, { color: Colors.error }]}>{apiError}</Text>
      ) : null}

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
  error:   { textAlign: 'center', fontSize: FontSize.sm },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  cancel:  { flex: 1 },
  verify:  { flex: 2 },
});
