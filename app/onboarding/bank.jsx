import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
<<<<<<< HEAD
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { FontSize, Spacing } from '@constants/theme';
import { api } from '@utils/api';
import OnboardingHeader from '@components/OnboardingHeader';
import TextField from '@components/TextField';
import FooterBar from '@components/FooterBar';
import Button from '@components/Button';
=======
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { alertError } from '@utils/errors';
import { api } from '@utils/api';
import { goBackFrom } from '@utils/onboarding';
>>>>>>> e26961c635b60a007766324f445890a2e88d7232

export default function BankScreen() {
  const { Colors } = useTheme();
  const { token } = useAuth();
<<<<<<< HEAD
  const [accountName,    setAccountName]    = useState('');
  const [accountNumber,  setAccountNumber]  = useState('');
  const [confirmAccount, setConfirmAccount] = useState('');
  const [ifsc,           setIfsc]           = useState('');
=======
  const { profile, fetchProfile } = useProvider();
  const editing = useLocalSearchParams().mode === 'edit';
  // Pre-fill what's on file so a worker fixing one field doesn't retype everything.
  const [accountNumber,  setAccountNumber]  = useState(profile?.bank_account_number ?? '');
  const [confirmAccount, setConfirmAccount] = useState(profile?.bank_account_number ?? '');
  const [ifsc,           setIfsc]           = useState(profile?.bank_ifsc ?? '');
  const [accountName,    setAccountName]    = useState(profile?.bank_account_name ?? '');
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
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
      if (editing) { await fetchProfile(); router.back(); }
      else router.push('/onboarding/availability');
    } catch (e) {
      alertError('Error', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <OnboardingHeader step={4} title="Bank account" subtitle="Where we send your payouts." />

<<<<<<< HEAD
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
=======
        <View style={styles.header}>
          <TouchableOpacity onPress={() => goBackFrom('bank')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.title, { color: Colors.foreground }]}>Bank Account</Text>
            <Text style={[styles.sub, { color: Colors.mutedForeground }]}>For receiving payouts</Text>
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
          </View>

          <View style={styles.note}>
            <Ionicons name="lock-closed-outline" size={14} color={Colors.mutedForeground} />
            <Text style={[styles.noteText, { color: Colors.mutedForeground }]}>
              Bank details are encrypted and used only for payouts.
            </Text>
          </View>
        </ScrollView>

<<<<<<< HEAD
        <FooterBar>
          <Button title="Continue" onPress={handleNext} loading={saving} />
        </FooterBar>
      </KeyboardAvoidingView>
=======
        <View style={styles.form}>
          {[
            { label: 'Account Holder Name', value: accountName, onChange: setAccountName, placeholder: 'As on bank passbook' },
            { label: 'Account Number',       value: accountNumber,  onChange: setAccountNumber,  placeholder: 'Enter account number', keyboardType: 'numeric' },
            { label: 'Confirm Account Number', value: confirmAccount, onChange: setConfirmAccount, placeholder: 'Re-enter account number', keyboardType: 'numeric' },
            { label: 'IFSC Code',            value: ifsc,          onChange: v => setIfsc(v.toUpperCase()), placeholder: 'e.g. SBIN0001234', maxLength: 11, autoCapitalize: 'characters' },
          ].map(field => (
            <View key={field.label}>
              <Text style={[styles.label, { color: Colors.mutedForeground }]}>{field.label}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.foreground }]}
                placeholder={field.placeholder}
                placeholderTextColor={Colors.subtleForeground}
                value={field.value}
                onChangeText={field.onChange}
                keyboardType={field.keyboardType ?? 'default'}
                maxLength={field.maxLength}
                autoCapitalize={field.autoCapitalize ?? 'none'}
                secureTextEntry={field.label === 'Account Number'}
              />
            </View>
          ))}
        </View>

      </ScrollView>

      <View style={[styles.footer, { borderTopColor: Colors.border }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { opacity: !saving ? 1 : 0.6 }]}
          onPress={handleNext}
          disabled={saving}
          activeOpacity={0.85}
        >
          <LinearGradient colors={Colors.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextGrad}>
            <Text style={styles.nextText}>{saving ? 'Saving...' : editing ? 'Save' : 'Next: Availability'}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
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
