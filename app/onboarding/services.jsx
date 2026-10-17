import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
<<<<<<< HEAD
import { router } from 'expo-router';
=======
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { alertError } from '@utils/errors';
import { api } from '@utils/api';
import { goBackFrom } from '@utils/onboarding';
import { normalizeService } from '@utils/normalize';
import OnboardingHeader from '@components/OnboardingHeader';
import LoadingScreen from '@components/LoadingScreen';
import EmptyState from '@components/EmptyState';
import FooterBar from '@components/FooterBar';
import Button from '@components/Button';

export default function ServicesScreen() {
  const { Colors } = useTheme();
  const { token } = useAuth();
  const { profile, fetchProfile } = useProvider();
  const editing = useLocalSearchParams().mode === 'edit';

  const [services, setServices] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (Array.isArray(profile?.services)) {
      setSelected(new Set(profile.services.map(s => s.service_id)));
    }
  }, [profile]);

  useEffect(() => {
    api.get('/services', token)
      .then(res => {
        const raw = Array.isArray(res.data) ? res.data : [];
        setServices(raw.map(normalizeService));
      })
      .catch(e => alertError('Error', e))
      .finally(() => setLoading(false));
  }, [token]);

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleNext = async () => {
    if (selected.size === 0) { Alert.alert('Required', 'Select at least one service.'); return; }
    setSaving(true);
    try {
      await api.patch('/providers/me/services', { service_ids: Array.from(selected) }, token);
      if (editing) { await fetchProfile(); router.back(); }
      else router.push('/onboarding/documents');
    } catch (e) {
      alertError('Error', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
<<<<<<< HEAD
      {loading ? <LoadingScreen overlay /> : null}
=======
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackFrom('services')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: Colors.foreground }]}>Services You Offer</Text>
          <Text style={[styles.sub, { color: Colors.mutedForeground }]}>{selected.size} selected</Text>
        </View>
      </View>
>>>>>>> e26961c635b60a007766324f445890a2e88d7232

      <FlatList
        data={loading ? [] : services}
        keyExtractor={item => String(item.id)}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <OnboardingHeader
            step={2}
            title="Services you offer"
            subtitle={selected.size > 0 ? `${selected.size} selected` : 'Select everything you can do.'}
          />
        }
        ListEmptyComponent={
          loading ? null : (
            <EmptyState icon="construct-outline" title="No services available" subtitle="Please try again later." compact />
          )
        }
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id);
          return (
            <TouchableOpacity
              style={[
                styles.tile,
                {
                  backgroundColor: isSelected ? Colors.primary + '14' : Colors.surface,
                  borderColor: isSelected ? Colors.primary : Colors.border,
                },
              ]}
              onPress={() => toggle(item.id)}
              activeOpacity={0.75}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
            >
              <Text style={[styles.tileText, { color: Colors.foreground }]} numberOfLines={2}>
                {item.name}
              </Text>
              <Ionicons
                name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={isSelected ? Colors.primary : Colors.subtleForeground}
              />
            </TouchableOpacity>
          );
        }}
      />

<<<<<<< HEAD
      <FooterBar>
        <Button title="Continue" onPress={handleNext} loading={saving} disabled={selected.size === 0} />
      </FooterBar>
=======
      <View style={[styles.footer, { borderTopColor: Colors.border }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { opacity: !saving ? 1 : 0.6 }]}
          onPress={handleNext}
          disabled={saving}
          activeOpacity={0.85}
        >
          <LinearGradient colors={Colors.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextGrad}>
            <Text style={styles.nextText}>{saving ? 'Saving...' : editing ? 'Save' : 'Next: Documents'}</Text>
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
  list:     { padding: Spacing.base, paddingTop: 0, gap: Spacing.sm },
  row:      { gap: Spacing.sm },
  tile:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.md, minHeight: 60 },
  tileText: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium, lineHeight: 18 },
});
