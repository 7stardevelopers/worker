import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl, Switch, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
<<<<<<< HEAD
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { formatPhone } from '@utils/format';
import ScreenHeader from '@components/ScreenHeader';
=======
import { FontSize, FontWeight, Spacing, Radius, Shadow } from '@constants/theme';
import { APP_NAME, APP_VERSION } from '@constants/brand';
>>>>>>> e26961c635b60a007766324f445890a2e88d7232

const STATUS_LABEL = {
  PENDING:   'Under review',
  APPROVED:  'Verified',
  SUSPENDED: 'Suspended',
  REJECTED:  'Rejected',
};

<<<<<<< HEAD
function Row({ icon, label, value, onPress, danger, last }) {
=======
function Row({ icon, label, sub, onPress, danger, right }) {
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
  const { Colors } = useTheme();
  const color = danger ? Colors.error : Colors.foreground;

  return (
    <TouchableOpacity
      style={[styles.row, !last && [styles.rowDivider, { borderBottomColor: Colors.borderLight }]]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
    >
<<<<<<< HEAD
      <Ionicons name={icon} size={20} color={danger ? Colors.error : Colors.mutedForeground} />
      <Text style={[styles.rowLabel, { color }]} numberOfLines={1}>{label}</Text>
      {value ? <Text style={[styles.rowValue, { color: Colors.mutedForeground }]} numberOfLines={1}>{value}</Text> : null}
      {!danger ? <Ionicons name="chevron-forward" size={16} color={Colors.subtleForeground} /> : null}
=======
      <View style={[styles.rowIcon, { backgroundColor: (danger ? Colors.error : Colors.primary) + '15' }]}>
        <Ionicons name={icon} size={20} color={danger ? Colors.error : Colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: danger ? Colors.error : Colors.foreground }]}>{label}</Text>
        {sub ? <Text style={[styles.rowSub, { color: Colors.mutedForeground }]}>{sub}</Text> : null}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={18} color={Colors.subtleForeground} />}
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { Colors, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
<<<<<<< HEAD
  const { profile, fetchProfile } = useProvider();
  const [refreshing, setRefreshing] = useState(false);
=======
  const { profile, fetchProfile, loading, locationOk } = useProvider();
  // The fresh profile wins (null after an admin reset); the cached login user is only a fallback.
  const photoUrl = profile ? profile.photo_url ?? null : user?.photo_url ?? null;
  const [refreshing, setRefreshing] = React.useState(false);
>>>>>>> e26961c635b60a007766324f445890a2e88d7232

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
<<<<<<< HEAD
  const reviews     = profile?.total_reviews ?? 0;
=======
  const totalReviews = profile?.total_reviews ?? 0;
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
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
<<<<<<< HEAD
        <View style={[styles.card, styles.identity, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: Colors.primary }]}>
            <Text style={[styles.avatarText, { color: Colors.onPrimary }]}>{initials || 'P'}</Text>
          </View>
          <View style={styles.identityInfo}>
            <Text style={[styles.name, { color: Colors.foreground }]} numberOfLines={1}>{name}</Text>
            <Text style={[styles.phone, { color: Colors.mutedForeground }]}>{formatPhone(user?.phone)}</Text>
            <View style={styles.statusRow}>
=======
        <View style={styles.header}>
          <Text style={[styles.title, { color: Colors.foreground }]}>Profile</Text>
        </View>

        {/* Avatar card */}
        <View style={[styles.avatarCard, { backgroundColor: Colors.surface, borderColor: Colors.border }, Shadow.md]}>
          <LinearGradient colors={['rgba(99,102,241,0.12)', 'transparent']} style={StyleSheet.absoluteFill} />
          {/* Registration selfie — locked; only an admin reset allows a new one. */}
          <View style={styles.avatarWrap}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} accessibilityLabel="Your profile photo" />
            ) : (
              <View style={[styles.avatar, { backgroundColor: Colors.primary + '25' }]}>
                <Text style={[styles.avatarText, { color: Colors.primary }]}>
                  {(user?.name ?? 'P').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {photoUrl && (
              <View style={[styles.lockBadge, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                <Ionicons name="lock-closed" size={11} color={Colors.mutedForeground} />
              </View>
            )}
          </View>
          <View style={styles.avatarInfo}>
            <Text style={[styles.name, { color: Colors.foreground }]}>{user?.name ?? 'Provider'}</Text>
            <Text style={[styles.phone, { color: Colors.mutedForeground }]}>+91 {user?.phone ?? ''}</Text>
            {photoUrl && (
              <Text style={[styles.lockCaption, { color: Colors.subtleForeground }]}>Photo locked · contact support to change</Text>
            )}
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '18', borderColor: statusColor + '40' }]}>
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABEL[status] ?? status}</Text>
            </View>
          </View>
        </View>

<<<<<<< HEAD
        <View style={[styles.card, styles.stats, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <View style={styles.stat}>
            <View style={styles.statValueRow}>
              <Text style={[styles.statValue, { color: Colors.foreground }]}>{avgRating.toFixed(1)}</Text>
              <Ionicons name="star" size={14} color={Colors.accent} />
=======
        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Reviews',       value: totalReviews },
            { label: 'Avg Rating',    value: avgRating.toFixed(1) + '★' },
            { label: 'Acceptance',    value: Math.round(acceptance * 100) + '%' },
          ].map(s => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
              <Text style={[styles.statValue, { color: Colors.foreground }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: Colors.mutedForeground }]}>{s.label}</Text>
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
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

<<<<<<< HEAD
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
=======
        {/* Settings */}
        <View style={[styles.section, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Row icon="person-outline"     label="Edit Profile"   onPress={() => router.push('/onboarding/personal?mode=edit')} />
          <Row icon="construct-outline"  label="My Services"    sub={profile?.services?.length ? `${profile.services.length} selected` : 'Not set'} onPress={() => router.push('/onboarding/services?mode=edit')} />
          <Row icon="document-outline"   label="My Documents"   sub="Aadhaar & PAN" onPress={() => router.push('/onboarding/documents?mode=edit')} />
          <Row icon="card-outline"       label="Bank Account"   sub={profile?.bank_account_number ? `****${(profile.bank_account_number).slice(-4)}` : 'Not set'} onPress={() => router.push('/onboarding/bank?mode=edit')} />
          <Row icon="headset-outline"    label="Support"        onPress={() => router.push('/support/index')} />
          <Row icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} />
          <Row icon="location-outline"   label="Location access" sub={locationOk ? 'Allowed' : 'Needed to go online'} onPress={() => router.push('/permissions')} />
          <Row
            icon={isDark ? 'moon-outline' : 'sunny-outline'}
            label="Dark mode"
            onPress={toggleTheme}
            right={<Switch value={isDark} onValueChange={toggleTheme} trackColor={{ true: Colors.primary + '80', false: Colors.border }} thumbColor={isDark ? Colors.primary : undefined} />}
          />
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
        </View>

        <View style={[styles.card, styles.group, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Row icon="log-out-outline" label="Log out" onPress={handleLogout} danger last />
        </View>

        <Text style={[styles.version, { color: Colors.subtleForeground }]}>{APP_NAME} v{APP_VERSION}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
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
=======
  root:        { flex: 1 },
  scroll:      { paddingBottom: 120, gap: Spacing.md },
  header:      { paddingHorizontal: Spacing.base, paddingVertical: Spacing.md },
  title:       { fontSize: FontSize.h1, fontWeight: FontWeight.bold },
  avatarCard:  { marginHorizontal: Spacing.base, borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base, flexDirection: 'row', alignItems: 'center', gap: Spacing.base, overflow: 'hidden' },
  avatarWrap:  { width: 72, height: 72 },
  avatar:      { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  lockBadge:   { position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  lockCaption: { fontSize: FontSize.xs },
  avatarText:  { fontSize: FontSize.display, fontWeight: FontWeight.bold },
  avatarInfo:  { flex: 1, gap: 4 },
  name:        { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  phone:       { fontSize: FontSize.sm },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  statusDot:   { width: 6, height: 6, borderRadius: 3 },
  statusText:  { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  statsRow:    { flexDirection: 'row', marginHorizontal: Spacing.base, gap: Spacing.sm },
  statCard:    { flex: 1, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.md, alignItems: 'center', gap: 3 },
  statValue:   { fontSize: FontSize.h3, fontWeight: FontWeight.bold },
  statLabel:   { fontSize: FontSize.xs, textAlign: 'center' },
  section:     { marginHorizontal: Spacing.base, borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row:         { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.md },
  rowIcon:     { width: 38, height: 38, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  rowText:     { flex: 1, gap: 2 },
  rowLabel:    { fontSize: FontSize.body, fontWeight: FontWeight.medium },
  rowSub:      { fontSize: FontSize.xs },
  version:     { textAlign: 'center', fontSize: FontSize.xs, paddingBottom: Spacing.xl },
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
});
