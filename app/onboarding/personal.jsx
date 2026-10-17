import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { Spacing } from '@constants/theme';
import { api } from '@utils/api';
import OnboardingHeader from '@components/OnboardingHeader';
import TextField from '@components/TextField';
import FooterBar from '@components/FooterBar';
import Button from '@components/Button';

export default function PersonalScreen() {
  const { Colors } = useTheme();
  const { user, token, updateUser } = useAuth();
  const { profile } = useProvider();

  const [name,    setName]    = useState(user?.name ?? '');
  const [bio,     setBio]     = useState(profile?.bio ?? '');
  const [years,   setYears]   = useState(profile?.years_experience != null ? String(profile.years_experience) : '');
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter your name.'); return; }
    setLoading(true);
    try {
      await Promise.all([
        api.patch('/auth/me', { name: name.trim() }, token),
        api.patch('/providers/me', { bio: bio.trim(), years_experience: parseInt(years, 10) || 0 }, token),
      ]);
      await updateUser({ name: name.trim() });
      router.push('/onboarding/services');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <OnboardingHeader step={1} title="Personal details" subtitle="Tell customers a little about yourself." />

          <View style={styles.form}>
            <TextField
              label="Full name"
              placeholder="Your full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              textContentType="name"
              autoComplete="name"
            />
            <TextField
              label="Years of experience"
              placeholder="e.g. 3"
              value={years}
              onChangeText={v => setYears(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={2}
            />
            <TextField
              label="Short bio (optional)"
              placeholder="Your experience and expertise"
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={250}
              hint={`${bio.length}/250`}
            />
          </View>
        </ScrollView>

        <FooterBar>
          <Button title="Continue" onPress={handleNext} loading={loading} />
        </FooterBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  flex:   { flex: 1 },
  scroll: { padding: Spacing.base, paddingTop: 0, gap: Spacing.lg },
  form:   { gap: Spacing.lg },
});
