import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, RefreshControl, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const { isAvailable, toggleAvailability, loading: provLoading, fetchProfile } = useProvider();

  const [jobs,        setJobs]        = useState([]);
  const [filter,      setFilter]      = useState('All');
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [incomingJob, setIncomingJob] = useState(null);

  const fetchJobs = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/bookings', token);
      const raw = Array.isArray(res.data) ? res.data : [];
      setJobs(raw.map(normalizeJob));
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
      if (notif.request.content.data?.type === 'job_request') {
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
      await api.patch(`/bookings/${incomingJob.id}/status`, { status: 'ACCEPTED' }, token);
      setIncomingJob(null);
      fetchJobs();
    } catch (e) {
      console.warn('[Jobs] accept failed:', e.message);
    }
  };

  const handleReject = async () => {
    if (!incomingJob) return;
    try {
      await api.patch(`/bookings/${incomingJob.id}/status`, { status: 'REJECTED' }, token);
    } catch {}
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
  filterChip: { borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  filterText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});
