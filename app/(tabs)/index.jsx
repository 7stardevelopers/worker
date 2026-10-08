import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { alertError } from '@utils/errors';
import { api } from '@utils/api';
import { formatINR } from '@utils/money';
import { groupJobs, todaySummary, isLiveJob } from '@utils/jobs';
import useJobFeed from '@utils/useJobFeed';
import useScreenFocus from '@utils/useScreenFocus';
import JobCard from '@components/JobCard';
import ActiveJobCard from '@components/ActiveJobCard';
import OnlineToggle from '@components/OnlineToggle';
import JobRequestModal from '@components/JobRequestModal';
import Skeleton from '@components/Skeleton';
import EmptyState from '@components/EmptyState';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function Section({ title, count, children, Colors }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: Colors.foreground }]}>{title}</Text>
        {count ? (
          <View style={[styles.countPill, { backgroundColor: Colors.primary + '20' }]}>
            <Text style={[styles.countText, { color: Colors.primary }]}>{count}</Text>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export default function JobsScreen() {
  const { Colors } = useTheme();
  const { token, user } = useAuth();
  const { profile, isAvailable, toggleAvailability, loading: provLoading, fetchProfile, locationOk } = useProvider();
  const focused = useScreenFocus();
  const [incomingJob, setIncomingJob] = useState(null);
  const [accepting,   setAccepting]   = useState(false);
  const [declined,    setDeclined]    = useState(() => new Set());
  const [refreshing,  setRefreshing]  = useState(false);
  const [unread,      setUnread]      = useState(0);

  const hasLiveJob = useCallback(list => list.some(isLiveJob), []);

  const { jobs, loading, error, refresh } = useJobFeed({
    token,
    isAvailable,
    onNewRequest: job => {
      // Don't interrupt a worker who is on the way to / working at a customer's home.
      if (hasLiveJob(jobs) || declined.has(job.id)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      Vibration.vibrate([0, 300, 150, 300]);
      setIncomingJob(job);
    },
  });

  const groups = useMemo(() => {
    const g = groupJobs(jobs);
    return { ...g, requests: g.requests.filter(j => !declined.has(j.id)) };
  }, [jobs, declined]);
  const today = useMemo(() => todaySummary(jobs), [jobs]);

  useFocusEffect(useCallback(() => {
    refresh();
    api.get('/notifications', token)
      .then(res => setUnread((res.data ?? []).filter(n => !n.read_ind).length))
      .catch(() => {});
  }, [refresh, token]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), fetchProfile()]);
    setRefreshing(false);
  }, [refresh, fetchProfile]);

  const onToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    toggleAvailability();
  }, [toggleAvailability]);

  const handleAccept = async () => {
    if (!incomingJob) return;
    setAccepting(true);
    try {
      // Broadcast jobs have no provider yet — /accept atomically claims it (first worker wins).
      await api.patch(`/bookings/${incomingJob.id}/accept`, {}, token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const id = incomingJob.id;
      setIncomingJob(null);
      refresh();
      router.push(`/job/${id}`);
    } catch (e) {
      alertError('Job unavailable', e, 'Another partner may have already accepted it.');
      setIncomingJob(null);
      refresh();
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = () => {
    // No per-worker decline on the backend — hide it here so it stays open for others.
    if (incomingJob) setDeclined(prev => new Set(prev).add(incomingJob.id));
    setIncomingJob(null);
  };

  const firstName = user?.name?.split(' ')[0] ?? 'Partner';
  const rating = Number(profile?.avg_rating ?? 0);
  const showSkeleton = loading && jobs.length === 0;
  const loadFailed = !!error && jobs.length === 0;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: Colors.mutedForeground }]}>{greeting()}</Text>
          <Text style={[styles.name, { color: Colors.foreground }]} numberOfLines={1}>{firstName}</Text>
        </View>
        <TouchableOpacity
          style={[styles.bell, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
          onPress={() => router.push('/notifications')}
          accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        >
          <Ionicons name="notifications-outline" size={20} color={Colors.mutedForeground} />
          {unread > 0 && (
            <View style={[styles.badge, { backgroundColor: Colors.error }]}>
              <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
      >
        <OnlineToggle isOnline={isAvailable} onToggle={onToggle} loading={provLoading} />

        {!locationOk && (
          <TouchableOpacity
            style={[styles.banner, { backgroundColor: Colors.warning + '18', borderColor: Colors.warning + '40' }]}
            onPress={() => router.push('/permissions')}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Ionicons name="location-outline" size={16} color={Colors.warning} />
            <Text style={[styles.bannerText, { color: Colors.foreground }]}>
              Turn on location access to go online and receive jobs.
            </Text>
            <Text style={[styles.bannerCta, { color: Colors.warning }]}>Enable</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.today, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          {[
            { label: 'Jobs today',   value: String(today.count) },
            { label: 'Earned today', value: formatINR(today.earned) },
            { label: 'Rating',       value: rating ? `${rating.toFixed(1)}★` : '—' },
          ].map((s, i) => (
            <View key={s.label} style={[styles.todayItem, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: Colors.border }]}>
              <Text style={[styles.todayValue, { color: Colors.foreground }]}>{s.value}</Text>
              <Text style={[styles.todayLabel, { color: Colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {showSkeleton ? (
          <View style={styles.section}>{Array.from({ length: 3 }).map((_, i) => <Skeleton.BookingCard key={i} />)}</View>
        ) : loadFailed ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load your jobs"
            subtitle="Check your connection and try again."
            cta={{ label: 'Retry', onPress: refresh }}
          />
        ) : (
          <>
            {groups.active && <ActiveJobCard job={groups.active} paused={!focused} />}

            <Section title="New requests" count={isAvailable ? groups.requests.length : 0} Colors={Colors}>
              {!isAvailable ? (
                <EmptyState compact icon="moon-outline" title="You're offline" subtitle="Go online to receive job requests near you." />
              ) : groups.requests.length === 0 ? (
                <EmptyState compact icon="radio-outline" title="Waiting for requests" subtitle="New jobs near you will pop up here automatically." />
              ) : (
                groups.requests.map(job => <JobCard key={job.id} job={job} />)
              )}
            </Section>

            {groups.upcoming.length > 0 && (
              <Section title="Upcoming" count={groups.upcoming.length} Colors={Colors}>
                {groups.upcoming.map(job => <JobCard key={job.id} job={job} />)}
              </Section>
            )}

            {groups.recent.length > 0 && (
              <Section title="Recent" Colors={Colors}>
                {groups.recent.map(job => <JobCard key={job.id} job={job} />)}
              </Section>
            )}
          </>
        )}
      </ScrollView>

      <JobRequestModal
        visible={!!incomingJob}
        job={incomingJob}
        accepting={accepting}
        onAccept={handleAccept}
        onReject={handleDecline}
        onExpire={() => setIncomingJob(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, gap: Spacing.md },
  greeting:     { fontSize: FontSize.sm },
  name:         { fontSize: FontSize.h1, fontWeight: FontWeight.bold },
  bell:         { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  badge:        { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText:    { color: '#FFF', fontSize: 10, fontWeight: FontWeight.bold },
  scroll:       { paddingBottom: 120 },
  banner:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.base, marginTop: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  bannerText:   { flex: 1, fontSize: FontSize.sm },
  bannerCta:    { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  today:        { flexDirection: 'row', marginHorizontal: Spacing.base, marginTop: Spacing.md, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, paddingVertical: Spacing.md },
  todayItem:    { flex: 1, alignItems: 'center', gap: 2 },
  todayValue:   { fontSize: FontSize.h3, fontWeight: FontWeight.bold },
  todayLabel:   { fontSize: FontSize.xs },
  section:      { marginTop: Spacing.lg },
  sectionHead:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.base, marginBottom: Spacing.xs },
  sectionTitle: { fontSize: FontSize.h3, fontWeight: FontWeight.semibold },
  countPill:    { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  countText:    { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
});
