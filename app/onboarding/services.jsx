import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { alertError } from '@utils/errors';
import { api } from '@utils/api';
import { normalizeService } from '@utils/normalize';
import OnboardingHeader from '@components/OnboardingHeader';
import LoadingScreen from '@components/LoadingScreen';
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
      {loading ? <LoadingScreen overlay /> : null}
      <FlatList
        data={loading ? [] : services}
        keyExtractor={item => String(item.id)}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          <OnboardingHeader
            stepKey="services"
            editing={editing}
            title="Your services"
            subtitle={selected.size ? `${selected.size} selected` : 'Choose the work you can do.'}
          />
        }
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id);
          return (
            <TouchableOpacity
              style={[
                styles.tile,
                {
                  backgroundColor: Colors.surface,
                  borderColor: isSelected ? Colors.primary : Colors.border,
                },
                isSelected && styles.tileSelected,
              ]}
              onPress={() => toggle(item.id)}
              activeOpacity={0.75}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={item.name}
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

      <FooterBar>
        <Button
          title={editing ? 'Save' : 'Continue'}
          onPress={handleNext}
          disabled={selected.size === 0}
          loading={saving}
        />
      </FooterBar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  grid:         { padding: Spacing.base, paddingTop: 0, gap: Spacing.sm },
  row:          { gap: Spacing.sm },
  tile:         { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 60, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  tileSelected: { borderWidth: 1.5 },
  tileText:     { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});
