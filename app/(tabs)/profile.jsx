import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl, Switch, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { APP_NAME, APP_VERSION } from '@constants/brand';
import { formatPhone } from '@utils/format';
import ScreenHeader from '@components/ScreenHeader';

const STATUS = {
  PENDING:   { tone: 'warning', label: 'Under review' },
  APPROVED:  { tone: 'success', label: 'Approved' },
  SUSPENDED: { tone: 'error',   label: 'Suspended' },
  REJECTED:  { tone: 'error',   label: 'Rejected' },
};

function Row({ icon, label, sub, onPress, danger, right, last }) {
  const { Colors } = useTheme();
  const color = danger ? Colors.error : Colors.foreground;
  return (
    <TouchableOpacity
      style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
    >
      <Ionicons name={icon} size={20} color={danger ? Colors.error : Colors.mutedForeground} />
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color }]}>{label}</Text>
        {sub ? <Text style={[styles.rowSub, { color: Colors.mutedForeground }]} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {right ?? (danger ? null : <Ionicons name="chevron-forward" size={18} color={Colors.subtleForeground} />)}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { Colors, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { profile, fetchProfile, locationOk } = useProvider();
  // The fresh profile wins (null after an admin reset); the cached login user is only a fallback.
  const photoUrl = profile ? profile.photo_url ?? null : user?.photo_url ?? null;
  const [refreshing, setRefreshing] = React.useState(false);

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

  const status       = STATUS[profile?.status] ?? STATUS.PENDING;
  const statusColor  = Colors[status.tone];
  const avgRating    = Number(profile?.avg_rating ?? 0);
  const totalReviews = profile?.total_reviews ?? 0;
  const acceptance   = Number(profile?.acceptance_rate ?? 1);
  const initials     = (user?.name ?? 'P').trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');

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
        <View style={[styles.identity, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          {/* Registration selfie — locked; only an admin reset allows a new one. */}
          <View style={styles.avatarWrap}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} accessibilityLabel="Your profile photo" />
            ) : (
              <View style={[styles.avatar, { backgroundColor: Colors.surfaceRaised }]}>
                <Text style={[styles.avatarText, { color: Colors.foreground }]}>{initials}</Text>
              </View>
            )}
            {photoUrl ? (
              <View style={[styles.lockBadge, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                <Ionicons name="lock-closed" size={10} color={Colors.mutedForeground} />
              </View>
            ) : null}
          </View>
          <View style={styles.identityInfo}>
            <Text style={[styles.name, { color: Colors.foreground }]} numberOfLines={1}>{user?.name ?? 'Partner'}</Text>
            <Text style={[styles.phone, { color: Colors.mutedForeground }]}>{formatPhone(user?.phone)}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: Colors.mutedForeground }]}>{status.label}</Text>
            </View>
          </View>
        </View>
        {photoUrl ? (
          <Text style={[styles.lockCaption, { color: Colors.subtleForeground }]}>
            Your photo is locked. Contact support to change it.
          </Text>
        ) : null}

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color={Colors.accent} />
              <Text style={[styles.statValue, { color: Colors.foreground }]}>{avgRating ? avgRating.toFixed(1) : '—'}</Text>
            </View>
            <Text style={[styles.statLabel, { color: Colors.mutedForeground }]}>Rating</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <Text style={[styles.statValue, { color: Colors.foreground }]}>{totalReviews}</Text>
            <Text style={[styles.statLabel, { color: Colors.mutedForeground }]}>Reviews</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <Text style={[styles.statValue, { color: Colors.foreground }]}>{Math.round(acceptance * 100)}%</Text>
            <Text style={[styles.statLabel, { color: Colors.mutedForeground }]}>Acceptance</Text>
          </View>
        </View>

        <Text style={[styles.groupLabel, { color: Colors.mutedForeground }]}>Account</Text>
        <View style={[styles.group, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Row icon="person-outline"    label="Personal details" onPress={() => router.push('/onboarding/personal?mode=edit')} />
          <Row icon="construct-outline" label="My services"      sub={profile?.services?.length ? `${profile.services.length} selected` : 'Not set'} onPress={() => router.push('/onboarding/services?mode=edit')} />
          <Row icon="document-outline"  label="My documents"     sub="Aadhaar and PAN" onPress={() => router.push('/onboarding/documents?mode=edit')} />
          <Row icon="card-outline"      label="Bank account"     sub={profile?.bank_account_number ? `Ending ${(profile.bank_account_number).slice(-4)}` : 'Not set'} onPress={() => router.push('/onboarding/bank?mode=edit')} last />
        </View>

        <Text style={[styles.groupLabel, { color: Colors.mutedForeground }]}>App</Text>
        <View style={[styles.group, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Row icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} />
          <Row icon="location-outline"      label="Location access" sub={locationOk ? 'Allowed' : 'Needed to go online'} onPress={() => router.push('/permissions')} />
          <Row
            icon={isDark ? 'moon-outline' : 'sunny-outline'}
            label="Dark mode"
            onPress={toggleTheme}
            right={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ true: Colors.primary, false: Colors.surfaceRaised }}
                thumbColor={Colors.onPrimary}
                ios_backgroundColor={Colors.surfaceRaised}
                accessibilityLabel="Dark mode"
              />
            }
          />
          <Row icon="help-circle-outline" label="Help and support" onPress={() => router.push('/support')} last />
        </View>

        <View style={[styles.group, styles.logoutGroup, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Row icon="log-out-outline" label="Log out" onPress={handleLogout} danger last />
        </View>

        <Text style={[styles.version, { color: Colors.subtleForeground }]}>{APP_NAME} {APP_VERSION}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  scroll:       { paddingTop: Spacing.xs, paddingBottom: Spacing.xl, gap: Spacing.md },
  identity:     { marginHorizontal: Spacing.base, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base, flexDirection: 'row', alignItems: 'center', gap: Spacing.base },
  avatarWrap:   { width: 64, height: 64 },
  avatar:       { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  avatarText:   { fontSize: FontSize.h2, fontWeight: FontWeight.semibold },
  lockBadge:    { position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  identityInfo: { flex: 1, gap: 2 },
  name:         { fontSize: FontSize.h3, fontWeight: FontWeight.semibold },
  phone:        { fontSize: FontSize.sm },
  statusRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.xs },
  statusDot:    { width: 8, height: 8, borderRadius: 4 },
  statusText:   { fontSize: FontSize.sm },
  lockCaption:  { fontSize: FontSize.xs, marginHorizontal: Spacing.base, marginTop: -Spacing.xs },
  statsRow:     { flexDirection: 'row', marginHorizontal: Spacing.base, gap: Spacing.sm },
  statCard:     { flex: 1, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.md, gap: 2 },
  ratingRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue:    { fontSize: FontSize.h3, fontWeight: FontWeight.semibold },
  statLabel:    { fontSize: FontSize.xs },
  groupLabel:   { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginHorizontal: Spacing.base, marginTop: Spacing.sm, marginBottom: -Spacing.xs },
  group:        { marginHorizontal: Spacing.base, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  logoutGroup:  { marginTop: Spacing.sm },
  row:          { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, gap: Spacing.md },
  rowText:      { flex: 1, gap: 2 },
  rowLabel:     { fontSize: FontSize.body },
  rowSub:       { fontSize: FontSize.xs },
  version:      { textAlign: 'center', fontSize: FontSize.xs, marginTop: Spacing.sm },
});
