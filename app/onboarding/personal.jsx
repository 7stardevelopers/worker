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
import { useProvider } from '@context/provider';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';

const STEPS = ['Personal', 'Services', 'Documents', 'Bank', 'Availability'];

export default function PersonalScreen() {
  const { Colors } = useTheme();
  const { user, updateUser } = useAuth();
  const { profile } = useProvider();
  const { token } = useAuth();

  const [name, setName]   = useState(user?.name ?? '');
  const [bio,  setBio]    = useState(profile?.bio ?? '');
  const [years, setYears] = useState(String(profile?.years_experience ?? ''));
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter your name'); return; }
    setLoading(true);
    try {
      await api.patch('/providers/me', {
        name: name.trim(),
        bio: bio.trim(),
        years_experience: parseInt(years) || 0,
      }, token);
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Progress */}
        <View style={styles.progress}>
          {STEPS.map((s, i) => (
            <View key={s} style={[styles.stepDot, { backgroundColor: i === 0 ? Colors.primary : Colors.border }]} />
          ))}
        </View>

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
              placeholder="Your full name"
              placeholderTextColor={Colors.subtleForeground}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View>
            <Text style={[styles.label, { color: Colors.mutedForeground }]}>Years of Experience</Text>
            <TextInput
              style={[styles.input, { backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.foreground }]}
              placeholder="e.g. 3"
              placeholderTextColor={Colors.subtleForeground}
              value={years}
              onChangeText={setYears}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>

          <View>
            <Text style={[styles.label, { color: Colors.mutedForeground }]}>Short Bio (optional)</Text>
            <TextInput
              style={[styles.textarea, { backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.foreground }]}
              placeholder="Briefly describe your experience and expertise..."
              placeholderTextColor={Colors.subtleForeground}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={250}
            />
            <Text style={[styles.charCount, { color: Colors.subtleForeground }]}>{bio.length}/250</Text>
          </View>
        </View>

      </ScrollView>

      <View style={[styles.footer, { borderTopColor: Colors.border }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { opacity: !loading ? 1 : 0.6 }]}
          onPress={handleNext}
          disabled={loading}
          activeOpacity={0.85}
        >
          <LinearGradient colors={Colors.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextGrad}>
            <Text style={styles.nextText}>{loading ? 'Saving...' : 'Next: Services'}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  scroll:        { padding: Spacing.base, paddingBottom: 120, gap: Spacing.xl },
  progress:      { flexDirection: 'row', gap: 6, justifyContent: 'center' },
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
});
