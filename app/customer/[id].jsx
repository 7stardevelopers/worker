import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { api } from '@utils/api';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import ScreenHeader from '@components/ScreenHeader';
import LoadingScreen from '@components/LoadingScreen';
import EmptyState from '@components/EmptyState';

export default function CustomerProfile() {
  const { id } = useLocalSearchParams();
  const { token } = useAuth();
  const { Colors } = useTheme();

  const [customer, setCustomer] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/customers/${id}/profile`, token);
      setCustomer(res.data);
    } catch (e) {
      setError(e.message ?? 'Could not load this profile');
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => { load(); }, [load]);

  const memberSince = customer?.member_since
    ? new Date(customer.member_since).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      {loading ? <LoadingScreen overlay /> : null}
      <ScreenHeader back title="Customer" />

      {loading ? null : error || !customer ? (
        <View style={styles.centerFill}>
          <EmptyState
            icon="alert-circle-outline"
            title="Profile unavailable"
            subtitle={error ?? 'This customer profile could not be loaded.'}
            cta={{ label: 'Try again', onPress: load }}
          />
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          {customer.photo_url ? (
            <Image source={{ uri: customer.photo_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: Colors.surfaceRaised }]}>
              <Ionicons name="person" size={32} color={Colors.mutedForeground} />
            </View>
          )}
          <Text style={[styles.name, { color: Colors.foreground }]}>{customer.name ?? 'Customer'}</Text>
          {memberSince ? (
            <Text style={[styles.since, { color: Colors.mutedForeground }]}>Customer since {memberSince}</Text>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1 },
  centerFill:     { flex: 1, justifyContent: 'center' },
  card:           { margin: Spacing.base, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.xl, alignItems: 'center', gap: Spacing.xs },
  avatar:         { width: 80, height: 80, borderRadius: 40, marginBottom: Spacing.sm },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  name:           { fontSize: FontSize.h2, fontWeight: FontWeight.semibold },
  since:          { fontSize: FontSize.sm },
});
