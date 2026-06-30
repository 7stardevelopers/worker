import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';

export default function BankScreen() {
  const { Colors } = useTheme();
  const { token } = useAuth();
  const [accountNumber,  setAccountNumber]  = useState('');
  const [confirmAccount, setConfirmAccount] = useState('');
  const [ifsc,           setIfsc]           = useState('');
  const [accountName,    setAccountName]    = useState('');
  const [saving,         setSaving]         = useState(false);

  const handleNext = async () => {
    if (!accountNumber || !ifsc || !accountName) {
      Alert.alert('Required', 'Please fill all bank details');
      return;
    }
    if (accountNumber !== confirmAccount) {
      Alert.alert('Mismatch', 'Account numbers do not match');
      return;
    }
    if (ifsc.length !== 11) {
      Alert.alert('Invalid IFSC', 'IFSC code must be 11 characters');
      return;
    }
    setSaving(true);
    try {
      await api.patch('/providers/me/bank', {
        bank_account_number: accountNumber,
        bank_ifsc: ifsc.toUpperCase(),
        bank_account_name: accountName,
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.title, { color: Colors.foreground }]}>Bank Account</Text>
            <Text style={[styles.sub, { color: Colors.mutedForeground }]}>For receiving payouts</Text>
          </View>
        </View>

        <View style={[styles.notice, { backgroundColor: Colors.success + '12', borderColor: Colors.success + '40' }]}>
          <Ionicons name="lock-closed-outline" size={16} color={Colors.success} />
          <Text style={[styles.noticeText, { color: Colors.success }]}>
            Your bank details are encrypted and used only for payouts.
          </Text>
        </View>

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
            <Text style={styles.nextText}>{saving ? 'Saving...' : 'Next: Availability'}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  scroll:     { padding: Spacing.base, paddingBottom: 120, gap: Spacing.base },
  header:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingBottom: Spacing.md },
  title:      { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  sub:        { fontSize: FontSize.sm },
  notice:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md },
  noticeText: { flex: 1, fontSize: FontSize.sm },
  form:       { gap: Spacing.base },
  label:      { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: 6 },
  input:      { borderRadius: Radius.md, borderWidth: 1.5, height: 52, paddingHorizontal: Spacing.md, fontSize: FontSize.body },
  footer:     { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.base, paddingBottom: 36, borderTopWidth: StyleSheet.hairlineWidth },
  nextBtn:    { borderRadius: Radius.lg, overflow: 'hidden', height: 56 },
  nextGrad:   { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  nextText:   { color: '#FFF', fontSize: FontSize.body, fontWeight: FontWeight.bold },
});
