import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image, Linking, Platform, RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { FontSize, FontWeight, Spacing, Radius, Shadow } from '@constants/theme';
import { api } from '@utils/api';
import { alertError, friendlyError } from '@utils/errors';
import { normalizeJob } from '@utils/normalize';
import { formatINR } from '@utils/money';
import { whenLabel, needsCashCollection, OPEN_STATUSES } from '@utils/jobs';
import { uploadToS3 } from '@utils/s3Upload';
import { compressImage } from '@utils/image';
import { startLocationTracking, stopLocationTracking, needsTracking, reconcileTracking } from '@utils/location';
import { useCustomerCall } from '@utils/useCustomerCall';
import StatusPill from '@components/StatusPill';
import OTPVerifySheet from '@components/OTPVerifySheet';
import Skeleton from '@components/Skeleton';
import EmptyState from '@components/EmptyState';
import JobTimeline from '@components/JobTimeline';
import RateCustomerCard from '@components/RateCustomerCard';

// Opens the native Maps app for turn-by-turn directions. Background location
// tracking keeps running as an OS service whichever app is in front.
function openNavigation(lat, lng) {
  if (lat == null || lng == null) return;
  const appUrl = Platform.select({
    ios: `maps://?daddr=${lat},${lng}&dirflg=d`,
    android: `google.navigation:q=${lat},${lng}`,
  });
  const webFallback = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  Linking.openURL(appUrl).catch(() => Linking.openURL(webFallback));
}

const TRANSITION_ACTIONS = {
  PENDING:     { label: 'Accept Job',       icon: 'checkmark-outline',        colorKey: 'success', isAccept: true },
  ACCEPTED:    { next: 'EN_ROUTE',    label: "I'm on my way",   icon: 'navigate-outline',   colorKey: 'info' },
  EN_ROUTE:    { next: 'IN_PROGRESS', label: 'Verify Door OTP', icon: 'keypad-outline',     colorKey: 'secondary', needsDoorOtp: true },
  IN_PROGRESS: { next: 'COMPLETED',   label: 'Mark as Complete', icon: 'checkmark-circle-outline', colorKey: 'success', needsProof: true },
};

function QuickAction({ icon, label, onPress, Colors, loading }) {
  return (
    <TouchableOpacity style={[styles.quick, { backgroundColor: Colors.primary + '12', borderColor: Colors.primary + '30' }]}
      onPress={onPress} disabled={loading} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ busy: !!loading }}>
      {loading
        ? <ActivityIndicator size="small" color={Colors.primary} />
        : <Ionicons name={icon} size={18} color={Colors.primary} />}
      <Text style={[styles.quickText, { color: Colors.primary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams();
  const { Colors } = useTheme();
  const { token } = useAuth();
  const { calling, callCustomer } = useCustomerCall(id, token);
  const [job,           setJob]           = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [loadError,     setLoadError]     = useState(null);
  const [refreshing,    setRefreshing]    = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showOtpSheet,  setShowOtpSheet]  = useState(false);
  const [otpError,      setOtpError]      = useState('');
  const [proofUris,     setProofUris]     = useState([]);
  const [helpLoading,   setHelpLoading]   = useState(false);
  // Road distance/ETA from the backend — the same cached value the customer sees.
  const [eta,           setEta]           = useState(null);

  const fetchEta = useCallback(async () => {
    if (!token || !id) return;
    try {
      const res = await api.get(`/bookings/${id}/eta`, token);
      setEta(res.data?.distance_km != null ? res.data : null);
    } catch {
      // Non-fatal: the card just hides the distance line.
    }
  }, [id, token]);

  const fetchJob = useCallback(async () => {
    if (!token || !id) return;
    try {
      const res = await api.get(`/bookings/${id}`, token);
      const j = normalizeJob(res.data);
      setJob(j);
      setLoadError(null);
      // Keep GPS in step with the job — it may have been cancelled by the
      // customer/admin since the last fetch.
      if (needsTracking({ status: j.status, scheduled_at: j.scheduledAt, providerDoneAt: j.providerDoneAt })) startLocationTracking({ silent: true, enRoute: j.status === 'EN_ROUTE', keepFast: true }).catch(() => {});
      else if (['CANCELLED', 'REJECTED', 'COMPLETED'].includes(j.status)) stopLocationTracking().catch(() => {});
    } catch (e) {
      setLoadError(e);
    }
  }, [id, token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchJob().finally(() => setLoading(false));
    }, [fetchJob])
  );

  const showEta = job?.status === 'ACCEPTED' || job?.status === 'EN_ROUTE';
  useEffect(() => {
    if (!showEta) { setEta(null); return undefined; }
    fetchEta();
    const t = setInterval(fetchEta, 30000);
    return () => clearInterval(t);
  }, [showEta, fetchEta]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchJob(), showEta ? fetchEta() : null]);
    setRefreshing(false);
  };

  const doStatusTransition = async (nextStatus) => {
    setActionLoading(true);
    try {
      await api.patch(`/bookings/${id}/status`, { status: nextStatus }, token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (nextStatus === 'EN_ROUTE') {
        await startLocationTracking({ enRoute: true }).catch(() => {});
        openNavigation(job?.address?.lat, job?.address?.lng);
      }
      await fetchJob();
    } catch (e) {
      alertError('Error', e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyDoorOtp = async (code) => {
    setActionLoading(true);
    setOtpError('');
    try {
      await api.post(`/bookings/${id}/otp-verify`, { otp: code }, token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setShowOtpSheet(false);
      // Arrived: drop back to the slower cadence unless another job is still en route.
      reconcileTracking(token).catch(() => {});
      await fetchJob();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setOtpError(friendlyError(e, 'Incorrect OTP. Try again.') ?? '');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePickProof = async () => {
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled) return;
    const { uri, width, height } = result.assets[0];
    // Shrink right away so the upload at "Mark as Complete" is quick on mobile data.
    const small = await compressImage(uri, { width, height }).catch(() => ({ uri }));
    setProofUris(prev => [...prev, small.uri]);
  };

  const handleComplete = async () => {
    if (proofUris.length === 0) {
      Alert.alert('Proof Required', 'Take at least 1 photo as proof of completion');
      return;
    }
    setActionLoading(true);
    try {
      const uploadedUrls = [];
      for (const uri of proofUris) {
        const presignRes = await api.post('/media/presign', { content_type: 'image/jpeg', folder: 'proof' }, token);
        const { upload_url, object_url } = presignRes.data;
        await uploadToS3(upload_url, uri, 'image/jpeg');
        uploadedUrls.push(object_url);
      }
      await api.post(`/bookings/${id}/complete`, { proof_photos: uploadedUrls }, token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // Done on our side → free for the next job; GPS only if another job needs it.
      await reconcileTracking(token).catch(() => {});
      setProofUris([]);
      await fetchJob();
    } catch (e) {
      alertError('Error', e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptJob = async () => {
    setActionLoading(true);
    try {
      await api.patch(`/bookings/${id}/accept`, {}, token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await fetchJob();
    } catch (e) {
      alertError('Job unavailable', e, 'Another partner may have already accepted it.');
      router.back();
    } finally {
      setActionLoading(false);
    }
  };

  // Workers can't cancel an accepted job themselves — support can.
  const getHelp = async () => {
    setHelpLoading(true);
    try {
      const ref = `#${String(id).slice(0, 8).toUpperCase()}`;
      const created = await api.post('/support/tickets', {
        subject: `Help with job ${ref}`,
        category: 'Booking Problem',
        booking_id: id,
      }, token);
      await api.post(`/support/tickets/${created.data.ticket_id}/messages`, {
        content: `I need help with job ${ref} — ${job.service.name}, ${whenLabel(job.scheduledAt)} (status: ${job.status}).`,
      }, token);
      router.push(`/support/${created.data.ticket_id}`);
    } catch (e) {
      alertError("Couldn't contact support", e);
    } finally {
      setHelpLoading(false);
    }
  };

  // Once the worker has tapped Done, the job waits for the customer — no action left here.
  const waitingForCustomer = job?.status === 'IN_PROGRESS' && !!job?.providerDoneAt;
  const baseAction = waitingForCustomer ? null : TRANSITION_ACTIONS[job?.status];
  const action = baseAction && job?.status === 'IN_PROGRESS' && job?.customerDoneAt
    ? { ...baseAction, label: 'Customer confirmed — Mark as Complete' }
    : baseAction;
  const handleAction = () => {
    if (!action) return;
    if (action.isAccept)     { handleAcceptJob(); return; }
    if (action.needsDoorOtp) { setOtpError(''); setShowOtpSheet(true); return; }
    if (action.needsProof)   { handleComplete(); return; }
    doStatusTransition(action.next);
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back">
        <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: Colors.foreground }]}>Job Details</Text>
        <Text style={[styles.ref, { color: Colors.subtleForeground }]}>#{String(id).slice(0, 8).toUpperCase()}</Text>
      </View>
      {job && <StatusPill status={job.status} />}
    </View>
  );

  if (loading && !job) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
        {header}
        {Array.from({ length: 4 }).map((_, i) => <Skeleton.BookingCard key={i} />)}
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
        {header}
        <EmptyState
          icon="alert-circle-outline"
          title="Couldn't load this job"
          subtitle={friendlyError(loadError, 'Check your connection and try again.') ?? ''}
          cta={{ label: 'Retry', onPress: () => { setLoading(true); fetchJob().finally(() => setLoading(false)); } }}
        />
      </SafeAreaView>
    );
  }

  const isAssigned = OPEN_STATUSES.includes(job.status) || job.status === 'COMPLETED';
  const isOpen = OPEN_STATUSES.includes(job.status);
  const hasCoords = job.address.lat != null && job.address.lng != null;
  const actionColor = action ? (Colors[action.colorKey] ?? Colors.primary) : null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      {header}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
      >
        {/* Earning */}
        <View style={[styles.heroCard, Shadow.lg]}>
          <LinearGradient colors={Colors.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroGrad}>
            <Text style={styles.heroLabel}>Your Earning</Text>
            <Text style={styles.heroAmount}>{formatINR(job.providerEarning)}</Text>
            <Text style={styles.heroTotal}>Total: {formatINR(job.totalAmount)} • Platform fee: {formatINR(job.platformFee)}</Text>
          </LinearGradient>
        </View>

        <JobTimeline status={job.status} />

        {needsCashCollection(job) && (
          <View style={[styles.banner, { backgroundColor: Colors.warning + '16', borderColor: Colors.warning + '50' }]}>
            <Ionicons name="cash-outline" size={20} color={Colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: Colors.foreground }]}>
                Collect {formatINR(job.totalAmount)} from the customer
              </Text>
              <Text style={[styles.bannerSub, { color: Colors.mutedForeground }]}>
                They chose to pay at service — cash or UPI, before you leave.
              </Text>
            </View>
          </View>
        )}

        {/* Service & items */}
        <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Text style={[styles.cardTitle, { color: Colors.mutedForeground }]}>SERVICE</Text>
          <Text style={[styles.serviceName, { color: Colors.foreground }]}>{job.service.name}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color={Colors.mutedForeground} />
            <Text style={[styles.metaText, { color: Colors.mutedForeground }]}>{whenLabel(job.scheduledAt)} • ~{job.service.duration} min</Text>
          </View>
          {job.items.length > 0 && (
            <View style={[styles.items, { borderTopColor: Colors.border }]}>
              {job.items.map(item => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={[styles.qty, { backgroundColor: Colors.primary + '18' }]}>
                    <Text style={[styles.qtyText, { color: Colors.primary }]}>{item.quantity}×</Text>
                  </View>
                  <Text style={[styles.itemName, { color: Colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.itemPrice, { color: Colors.mutedForeground }]}>{formatINR(item.price * item.quantity)}</Text>
                </View>
              ))}
            </View>
          )}
          {job.customerNotes ? (
            <View style={[styles.notes, { backgroundColor: Colors.info + '10', borderColor: Colors.info + '30' }]}>
              <Ionicons name="chatbox-ellipses-outline" size={14} color={Colors.info} />
              <Text style={[styles.notesText, { color: Colors.foreground }]}>{job.customerNotes}</Text>
            </View>
          ) : null}
        </View>

        {/* Customer */}
        <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Text style={[styles.cardTitle, { color: Colors.mutedForeground }]}>CUSTOMER</Text>
          <TouchableOpacity style={styles.customerRow} onPress={() => router.push(`/customer/${job.customerId}`)} disabled={!isAssigned}>
            {job.customerPhoto ? (
              <Image source={{ uri: job.customerPhoto }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: Colors.primary + '18' }]}>
                <Ionicons name="person" size={18} color={Colors.primary} />
              </View>
            )}
            <Text style={[styles.customerName, { color: Colors.foreground }]}>{job.customerName}</Text>
            {isAssigned && <Ionicons name="chevron-forward" size={16} color={Colors.subtleForeground} />}
          </TouchableOpacity>
          {isOpen && (
            <View style={styles.quickRow}>
              <QuickAction icon="call-outline" label={calling ? 'Calling…' : 'Call'} onPress={callCustomer} loading={calling} Colors={Colors} />
              <QuickAction icon="chatbubble-ellipses-outline" label="Chat" onPress={() => router.push({ pathname: '/chat/[id]', params: { id, name: job.customerName } })} Colors={Colors} />
              {hasCoords && <QuickAction icon="navigate-outline" label="Navigate" onPress={() => openNavigation(job.address.lat, job.address.lng)} Colors={Colors} />}
            </View>
          )}
        </View>

        {/* Address */}
        <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Text style={[styles.cardTitle, { color: Colors.mutedForeground }]}>LOCATION</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={Colors.primary} />
            <Text style={[styles.metaText, { color: Colors.foreground }]}>{job.address.fullAddress}</Text>
          </View>
          {showEta && eta && (
            <View style={styles.metaRow}>
              <Ionicons name="car-outline" size={14} color={Colors.mutedForeground} />
              <Text style={[styles.metaText, { color: Colors.mutedForeground }]}>
                {eta.distance_km.toFixed(1)} km by road • ~{eta.duration_min} min
              </Text>
            </View>
          )}
        </View>

        {/* Two-sided completion status */}
        {job.status === 'IN_PROGRESS' && (job.disputedAt || waitingForCustomer || job.customerDoneAt) && (
          <View style={[styles.card, styles.doneCard, {
            backgroundColor: (job.disputedAt ? Colors.error : waitingForCustomer ? Colors.warning : Colors.success) + '14',
            borderColor:     (job.disputedAt ? Colors.error : waitingForCustomer ? Colors.warning : Colors.success) + '55',
          }]}>
            <Ionicons
              name={job.disputedAt ? 'alert-circle-outline' : waitingForCustomer ? 'hourglass-outline' : 'checkmark-done-outline'}
              size={22}
              color={job.disputedAt ? Colors.error : waitingForCustomer ? Colors.warning : Colors.success}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.doneTitle, { color: Colors.foreground }]}>
                {job.disputedAt ? 'Customer reported a problem'
                  : waitingForCustomer ? 'Waiting for the customer to confirm'
                  : 'Customer confirmed the work is done'}
              </Text>
              <Text style={[styles.doneSub, { color: Colors.mutedForeground }]}>
                {job.disputedAt ? 'Support will contact you about this job.'
                  : waitingForCustomer ? "The job completes when the customer taps \"Work done\" in their app. You're free to take your next job."
                  : 'Add proof photos and tap Mark as Complete to finish.'}
              </Text>
            </View>
          </View>
        )}

        {/* Proof photos */}
        {job.status === 'IN_PROGRESS' && !waitingForCustomer && (
          <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <Text style={[styles.cardTitle, { color: Colors.mutedForeground }]}>PROOF PHOTOS</Text>
            <View style={styles.proofRow}>
              {proofUris.map((uri, i) => (
                <TouchableOpacity key={uri} onLongPress={() => setProofUris(prev => prev.filter((_, j) => j !== i))}>
                  <Image source={{ uri }} style={[styles.proofThumb, { borderColor: Colors.border }]} />
                </TouchableOpacity>
              ))}
              {proofUris.length < 2 && (
                <TouchableOpacity
                  style={[styles.proofAdd, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary + '40' }]}
                  onPress={handlePickProof}
                  activeOpacity={0.8}
                  accessibilityLabel="Take proof photo"
                >
                  <Ionicons name="camera-outline" size={22} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.proofHint, { color: Colors.mutedForeground }]}>
              Take 1–2 photos of the completed work. Long-press a photo to remove it.
            </Text>
          </View>
        )}
        {(job.status === 'COMPLETED' || waitingForCustomer) && job.proofPhotos.length > 0 && (
          <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <Text style={[styles.cardTitle, { color: Colors.mutedForeground }]}>PROOF PHOTOS</Text>
            <View style={styles.proofRow}>
              {job.proofPhotos.map(uri => <Image key={uri} source={{ uri }} style={[styles.proofThumb, { borderColor: Colors.border }]} />)}
            </View>
          </View>
        )}

        {job.status === 'COMPLETED' && (
          <RateCustomerCard bookingId={job.id} customerName={job.customerName} token={token} />
        )}

        {isAssigned && (
          <TouchableOpacity style={styles.helpRow} onPress={getHelp} disabled={helpLoading} activeOpacity={0.7}>
            <Ionicons name="help-buoy-outline" size={16} color={Colors.mutedForeground} />
            <Text style={[styles.helpText, { color: Colors.mutedForeground }]}>
              {helpLoading ? 'Contacting support…' : 'Need help with this job? Contact support'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {action && (
        <View style={[styles.actionBar, { backgroundColor: Colors.background, borderTopColor: Colors.border }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { opacity: actionLoading ? 0.6 : 1 }]}
            onPress={handleAction}
            disabled={actionLoading}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[actionColor, actionColor + 'CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionGrad}>
              <Ionicons name={action.icon} size={20} color="#FFF" />
              <Text style={styles.actionText}>{actionLoading ? 'Please wait...' : action.label}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      <OTPVerifySheet
        visible={showOtpSheet}
        onVerify={handleVerifyDoorOtp}
        onClose={() => setShowOtpSheet(false)}
        loading={actionLoading}
        apiError={otpError}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  scroll:        { paddingBottom: 130, gap: Spacing.md },
  header:        { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, gap: Spacing.md },
  backBtn:       { width: 40, height: 40, justifyContent: 'center' },
  title:         { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  ref:           { fontSize: FontSize.xs, marginTop: 1 },
  heroCard:      { marginHorizontal: Spacing.base, borderRadius: Radius.xl, overflow: 'hidden' },
  heroGrad:      { padding: Spacing.xl, gap: 4 },
  heroLabel:     { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.sm },
  heroAmount:    { color: '#FFF', fontSize: 44, fontWeight: FontWeight.bold, letterSpacing: -1 },
  heroTotal:     { color: 'rgba(255,255,255,0.65)', fontSize: FontSize.xs },
  banner:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.base, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1 },
  bannerTitle:   { fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  bannerSub:     { fontSize: FontSize.xs, marginTop: 2 },
  card:          { marginHorizontal: Spacing.base, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base, gap: Spacing.sm },
  cardTitle:     { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1 },
  serviceName:   { fontSize: FontSize.h3, fontWeight: FontWeight.semibold },
  metaRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  metaText:      { flex: 1, fontSize: FontSize.sm },
  items:         { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.sm, gap: Spacing.sm },
  itemRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  qty:           { minWidth: 32, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center' },
  qtyText:       { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  itemName:      { flex: 1, fontSize: FontSize.sm },
  itemPrice:     { fontSize: FontSize.sm },
  notes:         { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  notesText:     { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },
  customerRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar:        { width: 40, height: 40, borderRadius: 20 },
  avatarFallback:{ alignItems: 'center', justifyContent: 'center' },
  customerName:  { flex: 1, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  quickRow:      { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  quick:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: Radius.md, borderWidth: 1 },
  quickText:     { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  proofRow:      { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  proofThumb:    { width: 80, height: 80, borderRadius: Radius.md, borderWidth: 1 },
  proofAdd:      { width: 80, height: 80, borderRadius: Radius.md, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  proofHint:     { fontSize: FontSize.xs },
  doneCard:      { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  doneTitle:     { fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  doneSub:       { fontSize: FontSize.sm, marginTop: 2, lineHeight: 18 },
  helpRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.md },
  helpText:      { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  actionBar:     { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.base, paddingBottom: 36, borderTopWidth: StyleSheet.hairlineWidth },
  actionBtn:     { borderRadius: Radius.lg, overflow: 'hidden', height: 56 },
  actionGrad:    { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  actionText:    { color: '#FFF', fontSize: FontSize.body, fontWeight: FontWeight.bold },
});
