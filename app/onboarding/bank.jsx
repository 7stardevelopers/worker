import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { FontSize, Spacing } from '@constants/theme';
import { api } from '@utils/api';
import OnboardingHeader from '@components/OnboardingHeader';
import TextField from '@components/TextField';
import FooterBar from '@components/FooterBar';
import Button from '@components/Button';

export default function BankScreen() {
  const { Colors } = useTheme();
  const { token } = useAuth();
  const [accountName,    setAccountName]    = useState('');
  const [accountNumber,  setAccountNumber]  = useState('');
  const [confirmAccount, setConfirmAccount] = useState('');
  const [ifsc,           setIfsc]           = useState('');
  const [saving,         setSaving]         = useState(false);

  const handleNext = async () => {
    if (!accountNumber || !ifsc || !accountName) {
      Alert.alert('Required', 'Please fill in all bank details.');
      return;
    }
    if (accountNumber !== confirmAccount) {
      Alert.alert('Mismatch', 'Account numbers do not match.');
      return;
    }
    if (ifsc.length !== 11) {
      Alert.alert('Invalid IFSC', 'IFSC code must be 11 characters.');
      return;
    }
    setSaving(true);
    try {
      await api.patch('/providers/me', {
        bank_account_number: accountNumber,
        bank_ifsc: ifsc.toUpperCase(),
        bank_account_name: accountName.trim(),
      }, token);
      router.push('/onboarding/availability');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <OnboardingHeader step={4} title="Bank account" subtitle="Where we send your payouts." />

          <View style={styles.form}>
            <TextField
              label="Account holder name"
              placeholder="As shown on your passbook"
              value={accountName}
              onChangeText={setAccountName}
              autoCapitalize="words"
            />
            <TextField
              label="Account number"
              placeholder="Account number"
              value={accountNumber}
              onChangeText={v => setAccountNumber(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
              secureTextEntry
            />
            <TextField
              label="Confirm account number"
              placeholder="Re-enter account number"
              value={confirmAccount}
              onChangeText={v => setConfirmAccount(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
            />
            <TextField
              label="IFSC code"
              placeholder="e.g. SBIN0001234"
              value={ifsc}
              onChangeText={v => setIfsc(v.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={11}
            />
          </View>

          <View style={styles.note}>
            <Ionicons name="lock-closed-outline" size={14} color={Colors.mutedForeground} />
            <Text style={[styles.noteText, { color: Colors.mutedForeground }]}>
              Bank details are encrypted and used only for payouts.
            </Text>
          </View>
        </ScrollView>

        <FooterBar>
          <Button title="Continue" onPress={handleNext} loading={saving} />
        </FooterBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:     { flex: 1 },
  flex:     { flex: 1 },
  scroll:   { padding: Spacing.base, paddingTop: 0, gap: Spacing.lg },
  form:     { gap: Spacing.lg },
  note:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  noteText: { flex: 1, fontSize: FontSize.sm, lineHeight: 18 },
});
