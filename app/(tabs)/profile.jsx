import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl, Switch, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { FontSize, FontWeight, Spacing, Radius, Shadow } from '@constants/theme';
import { APP_NAME, APP_VERSION } from '@constants/brand';

const STATUS_COLOR = {
  PENDING:   '#F59E0B',
  APPROVED:  '#10B981',
  SUSPENDED: '#EF4444',
  REJECTED:  '#EF4444',
};

function Row({ icon, label, sub, onPress, danger, right }) {
  const { Colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: Colors.borderLight }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
    >
      <View style={[styles.rowIcon, { backgroundColor: (danger ? Colors.error : Colors.primary) + '15' }]}>
        <Ionicons name={icon} size={20} color={danger ? Colors.error : Colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: danger ? Colors.error : Colors.foreground }]}>{label}</Text>
        {sub ? <Text style={[styles.rowSub, { color: Colors.mutedForeground }]}>{sub}</Text> : null}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={18} color={Colors.subtleForeground} />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { Colors, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { profile, fetchProfile, loading, locationOk } = useProvider();
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
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  const statusColor = STATUS_COLOR[profile?.status] ?? Colors.mutedForeground;
  const avgRating   = Number(profile?.avg_rating ?? 0);
  const totalReviews = profile?.total_reviews ?? 0;
  const acceptance  = Number(profile?.acceptance_rate ?? 1);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
      >
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
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {profile?.status ?? 'PENDING'}
              </Text>
            </View>
          </View>
        </View>

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
            </View>
          ))}
        </View>

        {/* Settings */}
        <View style={[styles.section, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Row icon="person-outline"     label="Edit Profile"   onPress={() => router.push('/onboarding/personal?mode=edit')} />
          <Row icon="construct-outline"  label="My Services"    sub={profile?.services?.length ? `${profile.services.length} selected` : 'Not set'} onPress={() => router.push('/onboarding/services?mode=edit')} />
          <Row icon="document-outline"   label="My Documents"   sub="Aadhaar & PAN" onPress={() => router.push('/onboarding/documents?mode=edit')} />
          <Row icon="card-outline"       label="Bank Account"   sub={profile?.bank_account_number ? `****${(profile.bank_account_number).slice(-4)}` : 'Not set'} onPress={() => router.push('/onboarding/bank?mode=edit')} />
          <Row icon="headset-outline"    label="Support"        onPress={() => router.push('/support/index')} />
          <Row icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} />
          <Row icon="location-outline"   label="Location access" sub={locationOk ? 'Allowed all the time' : 'Needed to go online'} onPress={() => router.push('/permissions')} />
          <Row
            icon={isDark ? 'moon-outline' : 'sunny-outline'}
            label="Dark mode"
            onPress={toggleTheme}
            right={<Switch value={isDark} onValueChange={toggleTheme} trackColor={{ true: Colors.primary + '80', false: Colors.border }} thumbColor={isDark ? Colors.primary : undefined} />}
          />
        </View>

        <View style={[styles.section, { backgroundColor: Colors.surface, borderColor: Colors.border, marginTop: Spacing.sm }]}>
          <Row icon="log-out-outline" label="Log Out" onPress={handleLogout} danger />
        </View>

        <Text style={[styles.version, { color: Colors.subtleForeground }]}>{APP_NAME} v{APP_VERSION}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
});
