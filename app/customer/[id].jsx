import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useColors } from '@context/theme';
import { useAuth } from '@context/auth';
import { api } from '@utils/api';
import EmptyState from '@components/EmptyState';
import { FontSize, FontWeight, Spacing, Radius, Shadow } from '@constants/theme';
import { friendlyError } from '@utils/errors';

export default function CustomerProfile() {
  const { id } = useLocalSearchParams();
  const { token } = useAuth();
  const Colors = useColors();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/customers/${id}/profile`, token);
      setCustomer(res.data);
    } catch (e) {
      setError(friendlyError(e, 'Could not load this profile') ?? 'Could not load this profile');
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => { load(); }, [load]);

  const memberSince = customer?.member_since
    ? new Date(customer.member_since).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null;

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.background }}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
          >
            <Ionicons name="arrow-back" size={18} color={Colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: Colors.foreground }]}>Customer</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error || !customer ? (
        <View style={styles.centered}>
          <EmptyState
            icon="alert-circle-outline"
            title="Profile unavailable"
            subtitle={error ?? 'This customer profile could not be loaded.'}
          />
        </View>
      ) : (
        <View style={[styles.card, Shadow.md, { backgroundColor: Colors.surface, borderColor: Colors.border, margin: Spacing.base }]}>
          {customer.photo_url ? (
            <Image source={{ uri: customer.photo_url }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: Colors.primary + '18' }]}>
              <Ionicons name="person" size={36} color={Colors.primary} />
            </View>
          )}
          <Text style={[styles.name, { color: Colors.foreground }]}>{customer.name ?? 'Customer'}</Text>
          {memberSince ? (
            <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 4 }}>
              Customer since {memberSince}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: Radius.md, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: FontSize.h3, fontWeight: FontWeight.semibold },
  card: {
    borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.lg,
    alignItems: 'center',
  },
  avatar:    { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 84, height: 84, borderRadius: 42 },
  name:      { fontSize: FontSize.h2, fontWeight: FontWeight.bold, marginTop: Spacing.sm },
});
