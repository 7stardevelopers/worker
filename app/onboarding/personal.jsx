import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
<<<<<<< HEAD
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
=======
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { alertError } from '@utils/errors';
import { api } from '@utils/api';

const STEPS = ['Personal', 'Services', 'Documents', 'Bank', 'Availability', 'Photo'];

export default function PersonalScreen() {
  const { Colors } = useTheme();
  const { user, updateUser } = useAuth();
  const { profile, fetchProfile } = useProvider();
  // Opened from Profile → save and return instead of continuing onboarding.
  const editing = useLocalSearchParams().mode === 'edit';
  const { token } = useAuth();
>>>>>>> e26961c635b60a007766324f445890a2e88d7232

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
      if (editing) { await fetchProfile(); router.back(); }
      else router.push('/onboarding/services');
    } catch (e) {
      alertError('Error', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <OnboardingHeader step={1} title="Personal details" subtitle="Tell customers a little about yourself." />

<<<<<<< HEAD
          <View style={styles.form}>
            <TextField
              label="Full name"
=======
        {editing ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.editBack} accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
          </TouchableOpacity>
        ) : (
          <View style={styles.progress}>
            {STEPS.map((s, i) => (
              <View key={s} style={[styles.stepDot, { backgroundColor: i === 0 ? Colors.primary : Colors.border }]} />
            ))}
          </View>
        )}

        <View style={styles.headerSection}>
          <View style={[styles.stepIcon, { backgroundColor: Colors.primary + '20' }]}>
            <Ionicons name="person-outline" size={28} color={Colors.primary} />
          </View>
          <Text style={[styles.title, { color: Colors.foreground }]}>Personal Details</Text>
          <Text style={[styles.sub, { color: Colors.mutedForeground }]}>Tell customers a bit about yourself</Text>
        </View>

        <View style={styles.form}>
          <View>
            <Text style={[styles.label, { color: Colors.mutedForeground }]}>Full Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.foreground }]}
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
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

<<<<<<< HEAD
        <FooterBar>
          <Button title="Continue" onPress={handleNext} loading={loading} />
        </FooterBar>
      </KeyboardAvoidingView>
=======
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: Colors.border }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { opacity: !loading ? 1 : 0.6 }]}
          onPress={handleNext}
          disabled={loading}
          activeOpacity={0.85}
        >
          <LinearGradient colors={Colors.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextGrad}>
            <Text style={styles.nextText}>{loading ? 'Saving...' : editing ? 'Save' : 'Next: Services'}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
  root:   { flex: 1 },
  flex:   { flex: 1 },
  scroll: { padding: Spacing.base, paddingTop: 0, gap: Spacing.lg },
  form:   { gap: Spacing.lg },
=======
  root:          { flex: 1 },
  scroll:        { padding: Spacing.base, paddingBottom: 120, gap: Spacing.xl },
  progress:      { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  editBack:      { width: 40, height: 40, justifyContent: 'center' },
  stepDot:       { width: 8, height: 8, borderRadius: 4 },
  headerSection: { alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.md },
  stepIcon:      { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  title:         { fontSize: FontSize.h1, fontWeight: FontWeight.bold },
  sub:           { fontSize: FontSize.body, textAlign: 'center' },
  form:          { gap: Spacing.base },
  label:         { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: 6 },
  input:         { borderRadius: Radius.md, borderWidth: 1.5, height: 52, paddingHorizontal: Spacing.md, fontSize: FontSize.body },
  textarea:      { borderRadius: Radius.md, borderWidth: 1.5, padding: Spacing.md, fontSize: FontSize.body, minHeight: 100 },
  charCount:     { fontSize: FontSize.xs, textAlign: 'right', marginTop: 4 },
  footer:        { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.base, paddingBottom: 36, borderTopWidth: StyleSheet.hairlineWidth },
  nextBtn:       { borderRadius: Radius.lg, overflow: 'hidden', height: 56 },
  nextGrad:      { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  nextText:      { color: '#FFF', fontSize: FontSize.body, fontWeight: FontWeight.bold },
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
});
