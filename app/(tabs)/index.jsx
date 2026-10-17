import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';
import { normalizeJob } from '@utils/normalize';
import ScreenHeader from '@components/ScreenHeader';
import JobCard from '@components/JobCard';
import OnlineToggle from '@components/OnlineToggle';
import JobRequestModal from '@components/JobRequestModal';
import LoadingScreen from '@components/LoadingScreen';
import EmptyState from '@components/EmptyState';

const FILTERS = ['All', 'Pending', 'Active', 'Completed', 'Cancelled'];

const FILTER_STATUSES = {
  All:       null,
  Pending:   ['PENDING'],
  Active:    ['ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS'],
  Completed: ['COMPLETED'],
  Cancelled: ['CANCELLED', 'REJECTED'],
};

export default function JobsScreen() {
  const { Colors } = useTheme();
  const { token } = useAuth();
  const { isAvailable, toggleAvailability, loading: provLoading, fetchProfile, locationOk } = useProvider();

  const [jobs,        setJobs]        = useState([]);
  const [filter,      setFilter]      = useState('All');
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [incomingJob, setIncomingJob] = useState(null);

  const fetchJobs = useCallback(async () => {
    if (!token) return;
    try {
      // "My" jobs (already assigned to this provider) + "available" broadcast
      // jobs (PENDING, unassigned, matched by service — not yet claimed by
      // anyone). Both are needed: list_mine only returns bookings that
      // already have this provider_id set.
      const [mineRes, availableRes] = await Promise.all([
        api.get('/bookings', token),
        api.get('/bookings/available', token).catch(e => {
          console.warn('[Jobs] available fetch failed:', e.message);
          return { data: [] };
        }),
      ]);
      const mine      = Array.isArray(mineRes.data) ? mineRes.data : [];
      const available = Array.isArray(availableRes.data) ? availableRes.data : [];
      const byId = new Map();
      [...mine, ...available].forEach(b => byId.set(b.booking_id, b));
      setJobs(Array.from(byId.values()).map(normalizeJob));
    } catch (e) {
      console.warn('[Jobs] fetch failed:', e.message);
    }
  }, [token]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await fetchJobs();
    setLoading(false);
  }, [fetchJobs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchJobs(), fetchProfile()]);
    setRefreshing(false);
  }, [fetchJobs, fetchProfile]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(async notif => {
      if (notif.request.content.data?.type === 'job_available') {
        const bookingId = notif.request.content.data?.booking_id;
        try {
          const res = await api.get(`/bookings/${bookingId}`, token);
          setIncomingJob(normalizeJob(res.data));
        } catch {}
      }
    });
    return () => sub.remove();
  }, [token]);

  const handleAccept = async () => {
    if (!incomingJob) return;
    try {
      // A broadcast job has no assigned provider yet — /accept atomically
      // claims it (first provider to hit this wins); /status ACCEPTED would
      // 403 here since that path requires already being the assigned provider.
      await api.patch(`/bookings/${incomingJob.id}/accept`, {}, token);
      const acceptedId = incomingJob.id;
      setIncomingJob(null);
      fetchJobs();
      router.push(`/job/${acceptedId}`);
    } catch (e) {
      Alert.alert('Job unavailable', e.message ?? 'Another provider may have already accepted it.');
      setIncomingJob(null);
      fetchJobs();
    }
  };

  const handleReject = () => {
    // Broadcast jobs have no per-provider decline — just dismiss locally so
    // the job stays visible to other nearby providers.
    setIncomingJob(null);
  };

  const filteredJobs = FILTER_STATUSES[filter]
    ? jobs.filter(j => FILTER_STATUSES[filter].includes(j.status))
    : jobs;

  const bell = (
    <TouchableOpacity
      onPress={() => router.push('/notifications')}
      style={styles.iconBtn}
      hitSlop={8}
      activeOpacity={0.7}
      accessibilityLabel="Notifications"
    >
      <Ionicons name="notifications-outline" size={22} color={Colors.foreground} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <ScreenHeader large title="Jobs" right={bell} />

      {loading ? (
        <LoadingScreen overlay />
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <OnlineToggle isOnline={isAvailable} onToggle={toggleAvailability} loading={provLoading} />

              {!locationOk && (
                <View style={[styles.banner, { backgroundColor: Colors.warning + '14', borderColor: Colors.warning + '40' }]}>
                  <Ionicons name="location-outline" size={16} color={Colors.warning} />
                  <Text style={[styles.bannerText, { color: Colors.foreground }]}>
                    Allow location access "All the time" to go online and receive jobs.
                  </Text>
                </View>
              )}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {FILTERS.map(f => {
                  const active = filter === f;
                  return (
                    <TouchableOpacity
                      key={f}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? Colors.primary : Colors.surface,
                          borderColor: active ? Colors.primary : Colors.border,
                        },
                      ]}
                      onPress={() => setFilter(f)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, { color: active ? Colors.onPrimary : Colors.mutedForeground }]}>
                        {f}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="briefcase-outline"
              title={filter === 'All' ? 'No jobs yet' : `No ${filter.toLowerCase()} jobs`}
              subtitle={isAvailable ? 'New job requests will appear here.' : 'Go online to start receiving jobs.'}
            />
          }
          renderItem={({ item }) => <JobCard job={item} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
          }
        />
      )}

      <JobRequestModal
        visible={!!incomingJob}
        job={incomingJob}
        onAccept={handleAccept}
        onReject={handleReject}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  iconBtn:    { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: -Spacing.sm },
  list:       { paddingTop: Spacing.xs, paddingBottom: Spacing.xl },
  listHeader: { gap: Spacing.md, marginBottom: Spacing.md },
  banner:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.base, padding: Spacing.md, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth },
  bannerText: { flex: 1, fontSize: FontSize.sm, lineHeight: 18 },
  filterRow:  { paddingHorizontal: Spacing.base, gap: Spacing.sm },
  chip:       { borderRadius: Radius.full, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.base, height: 34, justifyContent: 'center' },
  chipText:   { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});
