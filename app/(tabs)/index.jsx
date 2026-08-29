import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, RefreshControl, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';
import { normalizeJob } from '@utils/normalize';
import JobCard from '@components/JobCard';
import OnlineToggle from '@components/OnlineToggle';
import JobRequestModal from '@components/JobRequestModal';
import Skeleton from '@components/Skeleton';
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
      setIncomingJob(null);
      fetchJobs();
    } catch (e) {
      Alert.alert('Job unavailable', e.message ?? 'Another provider may have already accepted it.');
      setIncomingJob(null);
      fetchJobs();
    }
  };

  const handleReject = async () => {
    // Broadcast jobs have no per-provider decline — just dismiss locally so
    // the job stays visible to other nearby providers.
    setIncomingJob(null);
  };

  const filteredJobs = FILTER_STATUSES[filter]
    ? jobs.filter(j => FILTER_STATUSES[filter].includes(j.status))
    : jobs;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: Colors.foreground }]}>My Jobs</Text>
      </View>

      <FlatList
        data={loading ? [] : filteredJobs}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <OnlineToggle
              isOnline={isAvailable}
              onToggle={toggleAvailability}
              loading={provLoading}
            />
            {!locationOk && (
              <View style={[styles.locationBanner, { backgroundColor: '#F59E0B18', borderColor: '#F59E0B40' }]}>
                <Ionicons name="location-outline" size={16} color="#F59E0B" />
                <Text style={[styles.locationBannerText, { color: Colors.foreground }]}>
                  Turn on location access (including "Allow all the time") to go online and receive jobs.
                </Text>
              </View>
            )}
            <View style={styles.filterRow}>
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterChip,
                    { borderColor: Colors.border, backgroundColor: filter === f ? Colors.primary : Colors.surface },
                  ]}
                  onPress={() => setFilter(f)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterText, { color: filter === f ? '#FFF' : Colors.mutedForeground }]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          loading
            ? <View>{Array.from({ length: 4 }).map((_, i) => <Skeleton.BookingCard key={i} />)}</View>
            : <EmptyState
                icon="briefcase-outline"
                title="No jobs yet"
                subtitle={isAvailable ? 'Job requests will appear here' : 'Go online to start receiving jobs'}
              />
        }
        renderItem={({ item }) => <JobCard job={item} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      />

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
  header:     { paddingHorizontal: Spacing.base, paddingVertical: Spacing.md },
  title:      { fontSize: FontSize.h1, fontWeight: FontWeight.bold },
  list:       { paddingBottom: 100, gap: 0 },
  filterRow:  { flexDirection: 'row', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, gap: Spacing.sm, flexWrap: 'wrap' },
  locationBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.base, marginTop: Spacing.sm,
    padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1,
  },
  locationBannerText: { flex: 1, fontSize: FontSize.sm },
  filterChip: { borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  filterText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});
