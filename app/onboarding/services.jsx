import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';
import { normalizeService } from '@utils/normalize';

export default function ServicesScreen() {
  const { Colors } = useTheme();
  const { token } = useAuth();

  const [services,  setServices]  = useState([]);
  const [selected,  setSelected]  = useState(new Set());
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    api.get('/services', token)
      .then(res => {
        const raw = Array.isArray(res.data) ? res.data : [];
        setServices(raw.map(normalizeService));
      })
      .catch(e => Alert.alert('Error', e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleNext = async () => {
    if (selected.size === 0) { Alert.alert('Required', 'Select at least one service'); return; }
    setSaving(true);
    try {
      await api.patch('/providers/me/services', { service_ids: Array.from(selected) }, token);
      router.push('/onboarding/documents');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: Colors.foreground }]}>Services You Offer</Text>
          <Text style={[styles.sub, { color: Colors.mutedForeground }]}>{selected.size} selected</Text>
        </View>
      </View>

      <FlatList
        data={services}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id);
          return (
            <TouchableOpacity
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? Colors.primary + '20' : Colors.surface,
                  borderColor: isSelected ? Colors.primary : Colors.border,
                },
              ]}
              onPress={() => toggle(item.id)}
              activeOpacity={0.8}
            >
              {isSelected && (
                <View style={[styles.checkMark, { backgroundColor: Colors.primary }]}>
                  <Ionicons name="checkmark" size={10} color="#FFF" />
                </View>
              )}
              <Text style={[styles.chipText, { color: isSelected ? Colors.primary : Colors.foreground }]} numberOfLines={2}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <View style={[styles.footer, { borderTopColor: Colors.border }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { opacity: !saving ? 1 : 0.6 }]}
          onPress={handleNext}
          disabled={saving}
          activeOpacity={0.85}
        >
          <LinearGradient colors={Colors.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextGrad}>
            <Text style={styles.nextText}>{saving ? 'Saving...' : 'Next: Documents'}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:      { flex: 1 },
  header:    { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, gap: Spacing.md },
  headerText:{ flex: 1 },
  title:     { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  sub:       { fontSize: FontSize.sm },
  grid:      { padding: Spacing.base, paddingBottom: 120, gap: Spacing.sm },
  row:       { gap: Spacing.sm },
  chip:      { flex: 1, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, minHeight: 64, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  checkMark: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  chipText:  { fontSize: FontSize.sm, fontWeight: FontWeight.medium, textAlign: 'center' },
  footer:    { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.base, paddingBottom: 36, borderTopWidth: StyleSheet.hairlineWidth },
  nextBtn:   { borderRadius: Radius.lg, overflow: 'hidden', height: 56 },
  nextGrad:  { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  nextText:  { color: '#FFF', fontSize: FontSize.body, fontWeight: FontWeight.bold },
});
