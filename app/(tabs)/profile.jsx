import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { formatPhone } from '@utils/format';
import ScreenHeader from '@components/ScreenHeader';

const STATUS_LABEL = {
  PENDING:   'Under review',
  APPROVED:  'Verified',
  SUSPENDED: 'Suspended',
  REJECTED:  'Rejected',
};

function Row({ icon, label, value, onPress, danger, last }) {
  const { Colors } = useTheme();
  const color = danger ? Colors.error : Colors.foreground;

  return (
    <TouchableOpacity
      style={[styles.row, !last && [styles.rowDivider, { borderBottomColor: Colors.borderLight }]]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={20} color={danger ? Colors.error : Colors.mutedForeground} />
      <Text style={[styles.rowLabel, { color }]} numberOfLines={1}>{label}</Text>
      {value ? <Text style={[styles.rowValue, { color: Colors.mutedForeground }]} numberOfLines={1}>{value}</Text> : null}
      {!danger ? <Ionicons name="chevron-forward" size={16} color={Colors.subtleForeground} /> : null}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { Colors } = useTheme();
  const { user, logout } = useAuth();
  const { profile, fetchProfile } = useProvider();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => { fetchProfile(); }, [fetchProfile])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, [fetchProfile]);

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  const status      = profile?.status ?? 'PENDING';
  const statusColor = status === 'APPROVED' ? Colors.success : status === 'PENDING' ? Colors.warning : Colors.error;
  const avgRating   = Number(profile?.avg_rating ?? 0);
  const reviews     = profile?.total_reviews ?? 0;
  const acceptance  = Number(profile?.acceptance_rate ?? 1);
  const name        = user?.name || 'Provider';
  const initials    = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const bankLast4   = profile?.bank_account_number ? `•••• ${profile.bank_account_number.slice(-4)}` : 'Not set';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <ScreenHeader large title="Profile" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
      >
        <View style={[styles.card, styles.identity, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: Colors.primary }]}>
            <Text style={[styles.avatarText, { color: Colors.onPrimary }]}>{initials || 'P'}</Text>
          </View>
          <View style={styles.identityInfo}>
            <Text style={[styles.name, { color: Colors.foreground }]} numberOfLines={1}>{name}</Text>
            <Text style={[styles.phone, { color: Colors.mutedForeground }]}>{formatPhone(user?.phone)}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABEL[status] ?? status}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, styles.stats, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <View style={styles.stat}>
            <View style={styles.statValueRow}>
              <Text style={[styles.statValue, { color: Colors.foreground }]}>{avgRating.toFixed(1)}</Text>
              <Ionicons name="star" size={14} color={Colors.accent} />
            </View>
            <Text style={[styles.statLabel, { color: Colors.mutedForeground }]}>Rating</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: Colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: Colors.foreground }]}>{reviews}</Text>
            <Text style={[styles.statLabel, { color: Colors.mutedForeground }]}>Reviews</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: Colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: Colors.foreground }]}>{Math.round(acceptance * 100)}%</Text>
            <Text style={[styles.statLabel, { color: Colors.mutedForeground }]}>Acceptance</Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: Colors.mutedForeground }]}>Account</Text>
        <View style={[styles.card, styles.group, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Row icon="person-outline"   label="Edit profile"  onPress={() => router.push('/onboarding/personal')} />
          <Row icon="document-outline" label="Documents"     onPress={() => router.push('/onboarding/documents')} />
          <Row icon="card-outline"     label="Bank account"  value={bankLast4} onPress={() => router.push('/onboarding/bank')} last />
        </View>

        <Text style={[styles.sectionLabel, { color: Colors.mutedForeground }]}>Help</Text>
        <View style={[styles.card, styles.group, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Row icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} />
          <Row icon="help-circle-outline"   label="Support"       onPress={() => router.push('/support')} last />
        </View>

        <View style={[styles.card, styles.group, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Row icon="log-out-outline" label="Log out" onPress={handleLogout} danger last />
        </View>

        <Text style={[styles.version, { color: Colors.subtleForeground }]}>7StarWorker v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  scroll:       { paddingTop: Spacing.xs, paddingBottom: Spacing.xl, gap: Spacing.md },
  card:         { marginHorizontal: Spacing.base, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth },
  identity:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.base, padding: Spacing.base },
  avatar:       { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  avatarText:   { fontSize: FontSize.h2, fontWeight: FontWeight.semibold },
  identityInfo: { flex: 1, gap: 2 },
  name:         { fontSize: FontSize.h3, fontWeight: FontWeight.semibold },
  phone:        { fontSize: FontSize.sm },
  statusRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.xs },
  statusDot:    { width: 6, height: 6, borderRadius: 3 },
  statusText:   { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  stats:        { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.base },
  stat:         { flex: 1, alignItems: 'center', gap: 2 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue:    { fontSize: FontSize.h3, fontWeight: FontWeight.semibold },
  statLabel:    { fontSize: FontSize.xs },
  statDivider:  { width: StyleSheet.hairlineWidth, height: 28 },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, textTransform: 'uppercase', letterSpacing: 0.6, marginHorizontal: Spacing.base + Spacing.xs, marginTop: Spacing.sm, marginBottom: -Spacing.xs },
  group:        { overflow: 'hidden' },
  row:          { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.base, minHeight: 52 },
  rowDivider:   { borderBottomWidth: StyleSheet.hairlineWidth },
  rowLabel:     { flex: 1, fontSize: FontSize.body },
  rowValue:     { fontSize: FontSize.sm, maxWidth: '40%' },
  version:      { textAlign: 'center', fontSize: FontSize.xs, marginTop: Spacing.sm },
});
