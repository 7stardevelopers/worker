import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, RefreshControl, StyleSheet,
  TouchableOpacity, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';
import { normalizeJob } from '@utils/normalize';
import JobCard from '@components/JobCard';
import AvailableJobCard from '@components/AvailableJobCard';
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

  const [jobs,          setJobs]          = useState([]);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [filter,        setFilter]        = useState('All');
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [incomingJob,   setIncomingJob]   = useState(null);

  // Location state
  const [locStatus,    setLocStatus]    = useState('checking'); // 'checking' | 'granted' | 'denied'
  const [workerCoords, setWorkerCoords] = useState(null);

  // ── Location permission + position ──────────────────────────────────────────
  const requestLocation = useCallback(async () => {
    setLocStatus('checking');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocStatus('denied'); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setWorkerCoords(coords);
      setLocStatus('granted');
    } catch {
      setLocStatus('denied');
    }
  }, []);

  useEffect(() => { requestLocation(); }, []);

  // ── Job fetches ──────────────────────────────────────────────────────────────
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

  const fetchAvailableJobs = useCallback(async () => {
    if (!token) return;
    try {
      const qs = workerCoords ? `?lat=${workerCoords.lat}&lng=${workerCoords.lng}` : '';
      const res = await api.get(`/bookings/available${qs}`, token);
      const raw = Array.isArray(res.data) ? res.data : [];
      setAvailableJobs(raw);
    } catch (e) {
      console.warn('[AvailableJobs] fetch failed:', e.message);
    }
  }, [token, workerCoords]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchJobs(), fetchAvailableJobs()]);
    setLoading(false);
  }, [fetchJobs, fetchAvailableJobs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchJobs(), fetchAvailableJobs(), fetchProfile()]);
    setRefreshing(false);
  }, [fetchJobs, fetchAvailableJobs, fetchProfile]);

  useEffect(() => { if (locStatus === 'granted') loadAll(); }, [loadAll, locStatus]);

  // ── Toggle online — also push current location when going online ─────────────
  const handleToggleAvailability = useCallback(async () => {
    const goingOnline = !isAvailable;
    await toggleAvailability();
    if (goingOnline && workerCoords && token) {
      api.patch('/providers/me/location', { lat: workerCoords.lat, lng: workerCoords.lng }, token)
        .catch(() => {});
    }
  }, [isAvailable, toggleAvailability, workerCoords, token]);

  // ── Push notification for incoming job request ───────────────────────────────
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(async notif => {
      const { type } = notif.request.content.data ?? {};
      if (type === 'job_available') {
        // New job nearby — refresh the available list so it appears instantly
        fetchAvailableJobs();
      } else if (type === 'job_request') {
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

  // ── Location denied gate ─────────────────────────────────────────────────────
  if (locStatus === 'checking') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.checkingText, { color: Colors.mutedForeground }]}>
            Checking location…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (locStatus === 'denied') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
        <View style={styles.centered}>
          <View style={[styles.gateCard, { backgroundColor: Colors.surface, borderColor: Colors.primary + '30' }]}>
            <View style={[styles.gateIconBox, { backgroundColor: Colors.primary + '15' }]}>
              <Text style={styles.gateEmoji}>📍</Text>
            </View>
            <Text style={[styles.gateTitle, { color: Colors.foreground }]}>Location Required</Text>
            <Text style={[styles.gateSub, { color: Colors.mutedForeground }]}>
              7StarWorker needs your location to show you nearby job requests. Without it, you won't receive any jobs.
            </Text>
            <TouchableOpacity
              style={[styles.gateBtn, { backgroundColor: Colors.primary }]}
              onPress={() => Linking.openSettings()}
              activeOpacity={0.85}
            >
              <Text style={styles.gateBtnText}>Open Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={requestLocation} activeOpacity={0.7} style={styles.retryBtn}>
              <Text style={[styles.retryText, { color: Colors.primary }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main screen ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: Colors.foreground }]}>My Jobs</Text>
        {workerCoords && (
          <View style={[styles.locBadge, { backgroundColor: Colors.success + '18', borderColor: Colors.success + '40' }]}>
            <View style={[styles.locDot, { backgroundColor: Colors.success }]} />
            <Text style={[styles.locText, { color: Colors.success }]}>Location On</Text>
          </View>
        )}
      </View>

      <FlatList
        data={loading ? [] : filteredJobs}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <OnlineToggle
              isOnline={isAvailable}
              onToggle={handleToggleAvailability}
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

            {availableJobs.length > 0 && (
              <View style={styles.availSection}>
                <View style={styles.availHeader}>
                  <View style={[styles.availDot, { backgroundColor: Colors.success }]} />
                  <Text style={[styles.availTitle, { color: Colors.foreground }]}>
                    Jobs Available Near You
                  </Text>
                  <Text style={[styles.availCount, { backgroundColor: Colors.primary, color: '#FFF' }]}>
                    {availableJobs.length}
                  </Text>
                </View>
                <View style={styles.availList}>
                  {availableJobs.map(b => (
                    <AvailableJobCard
                      key={b.booking_id}
                      booking={b}
                      onAccepted={() => { fetchJobs(); fetchAvailableJobs(); }}
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          loading
            ? <View>{Array.from({ length: 4 }).map((_, i) => <Skeleton.BookingCard key={i} />)}</View>
            : availableJobs.length > 0
              ? null
              : <EmptyState
                  icon="briefcase-outline"
                  title="No jobs yet"
                  subtitle={isAvailable ? 'Job requests will appear here' : 'Go online to start receiving jobs'}
                />
        }
        renderItem={({ item }) => <JobCard job={item} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
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
  root:    { flex: 1 },
  header:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md },
  title:   { flex: 1, fontSize: FontSize.h1, fontWeight: FontWeight.bold },
  list:    { paddingBottom: 100 },

  locBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  locDot:   { width: 6, height: 6, borderRadius: 3 },
  locText:  { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  filterRow:  { flexDirection: 'row', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, gap: Spacing.sm, flexWrap: 'wrap' },
  filterChip: { borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  filterText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },

  availSection: { marginBottom: Spacing.sm },
  availHeader:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.base, marginBottom: Spacing.md },
  availDot:     { width: 8, height: 8, borderRadius: 4 },
  availTitle:   { flex: 1, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  availCount:   { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, fontSize: FontSize.xs, fontWeight: FontWeight.bold, overflow: 'hidden' },
  availList:    { paddingHorizontal: Spacing.base },

  // Location gate
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  checkingText:{ marginTop: Spacing.md, fontSize: FontSize.body },
  gateCard:    { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md, width: '100%' },
  gateIconBox: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  gateEmoji:   { fontSize: 36 },
  gateTitle:   { fontSize: FontSize.h2, fontWeight: FontWeight.bold, textAlign: 'center' },
  gateSub:     { fontSize: FontSize.body, textAlign: 'center', lineHeight: 22 },
  gateBtn:     { borderRadius: Radius.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, width: '100%', alignItems: 'center', marginTop: Spacing.sm },
  gateBtnText: { color: '#FFF', fontSize: FontSize.body, fontWeight: FontWeight.bold },
  retryBtn:    { paddingVertical: Spacing.sm },
  retryText:   { fontSize: FontSize.body, fontWeight: FontWeight.medium },
});
