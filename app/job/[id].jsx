import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image, Linking, Platform, RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';
import Notifications from '@utils/notifications';
import { alertError, friendlyError } from '@utils/errors';
import { normalizeJob } from '@utils/normalize';
import { formatINR } from '@utils/money';
import { whenLabel, needsCashCollection, OPEN_STATUSES } from '@utils/jobs';
import { uploadToS3 } from '@utils/s3Upload';
import { compressImage } from '@utils/image';
import { startLocationTracking, stopLocationTracking, needsTracking, reconcileTracking } from '@utils/location';
import { useCustomerCall } from '@utils/useCustomerCall';
import StatusPill from '@components/StatusPill';
import PaymentBadge from '@components/PaymentBadge';
import OTPVerifySheet from '@components/OTPVerifySheet';
import ScreenHeader from '@components/ScreenHeader';
import LoadingScreen from '@components/LoadingScreen';
import FooterBar from '@components/FooterBar';
import Button from '@components/Button';
import EmptyState from '@components/EmptyState';
import JobTimeline from '@components/JobTimeline';
import RateCustomerCard from '@components/RateCustomerCard';
import BatteryBanner from '@components/BatteryBanner';
import { toast } from '@components/Toast';

// Opens the native Maps app for turn-by-turn directions. Background location
// tracking keeps running as an OS service whichever app is in front.
// Addresses saved without a map pin navigate by their text instead.
function openNavigation(address) {
  const { lat, lng, fullAddress } = address ?? {};
  const hasPin = lat != null && lng != null;
  const text = fullAddress && fullAddress !== 'Address on file' ? fullAddress : null;
  if (!hasPin && !text) {
    toast.error("Can't open Maps", 'This job has no address location.');
    return;
  }
  const dest = hasPin ? `${lat},${lng}` : encodeURIComponent(text);
  const appUrl = Platform.select({
    ios: `maps://?daddr=${dest}&dirflg=d`,
    android: `google.navigation:q=${dest}&mode=d`,
  });
  const webFallback = `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
  Linking.openURL(appUrl).catch(() => Linking.openURL(webFallback));
}

const TRANSITION_ACTIONS = {
  PENDING:     { label: 'Accept job',         icon: 'checkmark-outline',        isAccept: true },
  ACCEPTED:    { next: 'EN_ROUTE',    label: "I'm on my way",   icon: 'navigate-outline' },
  EN_ROUTE:    { next: 'IN_PROGRESS', label: 'Enter door code', icon: 'keypad-outline',           needsDoorOtp: true },
  IN_PROGRESS: { next: 'COMPLETED',   label: 'Complete job',    icon: 'checkmark-circle-outline', needsProof: true },
};

function QuickAction({ icon, label, onPress, Colors, loading }) {
  return (
    <TouchableOpacity style={[styles.quick, { backgroundColor: Colors.surfaceRaised, borderColor: Colors.border }]}
      onPress={onPress} disabled={loading} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ busy: !!loading }}>
      {loading
        ? <ActivityIndicator size="small" color={Colors.foreground} />
        : <Ionicons name={icon} size={18} color={Colors.foreground} />}
      <Text style={[styles.quickText, { color: Colors.foreground }]} numberOfLines={1}>{label}</Text>
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
  // "I'm on my way" sent the worker to grant location first — open Maps once they're back.
  const navAfterPermission = useRef(false);
  const jobRef = useRef(null);
  jobRef.current = job;

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
      // Taken by another partner / cancelled since we opened it — show "no longer available".
      if (e?.status === 403 || e?.status === 404) setJob(null);
      setLoadError(e);
    }
  }, [id, token]);

  // A request this worker is looking at was accepted by someone else (silent push).
  useEffect(() => {
    if (!Notifications) return undefined;
    const sub = Notifications.addNotificationReceivedListener(n => {
      const { type, booking_id: bookingId } = n.request.content.data ?? {};
      if (type === 'job_taken' && bookingId === id) fetchJob();
    });
    return () => sub.remove();
  }, [id, fetchJob]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchJob().finally(() => setLoading(false));
      if (navAfterPermission.current) {
        navAfterPermission.current = false;
        startLocationTracking({ silent: true, enRoute: true }).catch(() => false).then((ok) => {
          if (ok) toast.success('Sharing live location', 'The customer can now track you.');
          else toast.warning('Location is off', "The customer can't see you on the map until you allow it.");
          openNavigation(jobRef.current?.address);
        });
      }
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
        // Start sharing before Maps takes over: Android won't start the location
        // service once this app is in the background. Without permission the
        // worker goes to the explainer and Maps opens when they come back.
        const sharing = await startLocationTracking({ enRoute: true }).catch(() => false);
        if (sharing) {
          toast.success("You're on your way", 'Live location is shared with the customer.');
          openNavigation(job?.address);
        } else {
          navAfterPermission.current = true;
        }
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
      toast.success('Job started', 'Door code verified.');
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
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in Settings to take proof photos.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled) return;
    const { uri, width, height } = result.assets[0];
    // Shrink right away so the upload at "Mark as Complete" is quick on mobile data.
    const small = await compressImage(uri, { width, height }).catch(() => ({ uri }));
    setProofUris(prev => [...prev, small.uri]);
  };

  const handleComplete = async () => {
    if (proofUris.length === 0) {
      Alert.alert('Proof required', 'Take at least one photo of the finished work.');
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
      toast.success('Marked as done', 'Waiting for the customer to confirm.');
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
      toast.success(job?.isInstant ? 'Instant job accepted' : 'Job accepted',
        job?.isInstant ? 'Head out now and tap "I\'m on my way".'
          : `${job?.service?.name ?? 'Job'} • ${whenLabel(job?.scheduledAt)}`);
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
    ? { ...baseAction, label: 'Customer confirmed. Complete job' }
    : baseAction;
  const handleAction = () => {
    if (!action) return;
    if (action.isAccept)     { handleAcceptJob(); return; }
    if (action.needsDoorOtp) { setOtpError(''); setShowOtpSheet(true); return; }
    if (action.needsProof)   { handleComplete(); return; }
    doStatusTransition(action.next);
  };

  const header = (
    <ScreenHeader
      back
      title="Job details"
      subtitle={`#${String(id).slice(0, 8).toUpperCase()}`}
      right={job ? <StatusPill status={job.status} /> : null}
    />
  );

  if (loading && !job) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
        <LoadingScreen overlay />
        {header}
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
        {header}
        <View style={styles.center}>
        <EmptyState
          icon="alert-circle-outline"
          // A request opened from a push may already be taken or cancelled.
          title={loadError?.status === 403 || loadError?.status === 404 ? 'Job no longer available' : "Couldn't load this job"}
          subtitle={loadError?.status === 403 || loadError?.status === 404
            ? 'Another partner accepted it or the customer cancelled.'
            : friendlyError(loadError, 'Check your connection and try again.') ?? ''}
          cta={{ label: 'Try again', onPress: () => { setLoading(true); fetchJob().finally(() => setLoading(false)); } }}
        />
        </View>
      </SafeAreaView>
    );
  }

  const isAssigned = OPEN_STATUSES.includes(job.status) || job.status === 'COMPLETED';
  const isOpen = OPEN_STATUSES.includes(job.status);
  const canNavigate = (job.address.lat != null && job.address.lng != null) || job.address.fullAddress !== 'Address on file';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      {header}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
      >
        {needsTracking({ status: job.status, scheduled_at: job.scheduledAt, providerDoneAt: job.providerDoneAt }) && (
          <BatteryBanner style={styles.batteryBanner} />
        )}

        {/* Earning */}
        <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Text style={[styles.cardTitle, { color: Colors.mutedForeground }]}>Your earning</Text>
          <Text style={[styles.heroAmount, { color: Colors.foreground }]} numberOfLines={1} adjustsFontSizeToFit>
            {formatINR(job.providerEarning)}
          </Text>
          <Text style={[styles.heroTotal, { color: Colors.mutedForeground }]}>
            Job price {formatINR(job.jobPrice ?? job.totalAmount)} · Platform fee {formatINR(job.platformFee)}
          </Text>
          <PaymentBadge job={job} />
        </View>

        <JobTimeline status={job.status} />


        {needsCashCollection(job) && (
          <View style={[styles.banner, { backgroundColor: Colors.warning + '1A' }]}>
            <Ionicons name="cash-outline" size={20} color={Colors.warning} />
            <View style={styles.flex}>
              <Text style={[styles.bannerTitle, { color: Colors.foreground }]}>
                Collect {formatINR(job.totalAmount)} from the customer
              </Text>
              <Text style={[styles.bannerSub, { color: Colors.mutedForeground }]}>
                They chose to pay after the job. Collect cash unless they pay online in their app.
              </Text>
            </View>
          </View>
        )}

        {/* Service & items */}
        <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Text style={[styles.cardTitle, { color: Colors.mutedForeground }]}>Service</Text>
          <Text style={[styles.serviceName, { color: Colors.foreground }]}>{job.service.name}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color={Colors.mutedForeground} />
            <Text style={[styles.metaText, { color: Colors.mutedForeground }]}>{job.isInstant ? `Instant · booked ${whenLabel(job.scheduledAt)}` : whenLabel(job.scheduledAt)} · about {job.service.duration} min</Text>
          </View>
          {job.items.length > 0 && (
            <View style={[styles.items, { borderTopColor: Colors.border }]}>
              {job.items.map(item => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={[styles.qty, { backgroundColor: Colors.surfaceRaised }]}>
                    <Text style={[styles.qtyText, { color: Colors.foreground }]}>{item.quantity}×</Text>
                  </View>
                  <Text style={[styles.itemName, { color: Colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.itemPrice, { color: Colors.mutedForeground }]}>{formatINR(item.price * item.quantity)}</Text>
                </View>
              ))}
            </View>
          )}
          {job.customerNotes ? (
            <View style={[styles.notes, { backgroundColor: Colors.surfaceRaised }]}>
              <Ionicons name="chatbox-ellipses-outline" size={14} color={Colors.mutedForeground} />
              <Text style={[styles.notesText, { color: Colors.foreground }]}>{job.customerNotes}</Text>
            </View>
          ) : null}
        </View>

        {/* Customer */}
        <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Text style={[styles.cardTitle, { color: Colors.mutedForeground }]}>Customer</Text>
          <TouchableOpacity style={styles.customerRow} onPress={() => router.push(`/customer/${job.customerId}`)} disabled={!isAssigned}>
            {job.customerPhoto ? (
              <Image source={{ uri: job.customerPhoto }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: Colors.surfaceRaised }]}>
                <Ionicons name="person" size={18} color={Colors.mutedForeground} />
              </View>
            )}
            <Text style={[styles.customerName, { color: Colors.foreground }]} numberOfLines={1}>{job.customerName}</Text>
            {isAssigned && <Ionicons name="chevron-forward" size={16} color={Colors.subtleForeground} />}
          </TouchableOpacity>
          {isOpen && (
            <View style={styles.quickRow}>
              <QuickAction icon="call-outline" label={calling ? 'Calling' : 'Call'} onPress={callCustomer} loading={calling} Colors={Colors} />
              <QuickAction icon="chatbubble-ellipses-outline" label="Chat" onPress={() => router.push({ pathname: '/chat/[id]', params: { id, name: job.customerName } })} Colors={Colors} />
              {canNavigate && <QuickAction icon="navigate-outline" label="Navigate" onPress={() => openNavigation(job.address)} Colors={Colors} />}
            </View>
          )}
        </View>

        {/* Address */}
        <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Text style={[styles.cardTitle, { color: Colors.mutedForeground }]}>Location</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={Colors.mutedForeground} />
            <Text style={[styles.metaText, { color: Colors.foreground }]}>{job.address.fullAddress}</Text>
          </View>
          {showEta && eta && (
            <View style={styles.metaRow}>
              <Ionicons name="car-outline" size={14} color={Colors.mutedForeground} />
              <Text style={[styles.metaText, { color: Colors.mutedForeground }]}>
                {eta.distance_km.toFixed(1)} km by road · about {eta.duration_min} min
              </Text>
            </View>
          )}
        </View>

        {/* Two-sided completion status */}
        {job.status === 'IN_PROGRESS' && (job.disputedAt || waitingForCustomer || job.customerDoneAt) && (
          <View style={[styles.card, styles.doneCard, {
            backgroundColor: Colors.surface,
            borderColor: (job.disputedAt ? Colors.error : waitingForCustomer ? Colors.warning : Colors.success) + '66',
          }]}>
            <Ionicons
              name={job.disputedAt ? 'alert-circle-outline' : waitingForCustomer ? 'hourglass-outline' : 'checkmark-done-outline'}
              size={20}
              color={job.disputedAt ? Colors.error : waitingForCustomer ? Colors.warning : Colors.success}
            />
            <View style={styles.flex}>
              <Text style={[styles.doneTitle, { color: Colors.foreground }]}>
                {job.disputedAt ? 'Customer reported a problem'
                  : waitingForCustomer ? 'Waiting for the customer to confirm'
                  : 'Customer confirmed the work is done'}
              </Text>
              <Text style={[styles.doneSub, { color: Colors.mutedForeground }]}>
                {job.disputedAt ? 'Support will contact you about this job.'
                  : waitingForCustomer ? "The job completes when the customer taps Work done in their app. You're free to take your next job."
                  : 'Add proof photos and tap Complete job to finish.'}
              </Text>
            </View>
          </View>
        )}

        {/* Proof photos */}
        {job.status === 'IN_PROGRESS' && !waitingForCustomer && (
          <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <Text style={[styles.cardTitle, { color: Colors.mutedForeground }]}>Proof photos</Text>
            <View style={styles.proofRow}>
              {proofUris.map((uri, i) => (
                <TouchableOpacity
                  key={uri}
                  onPress={() => setProofUris(prev => prev.filter((_, j) => j !== i))}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${i + 1}`}
                >
                  <Image source={{ uri }} style={[styles.proofThumb, { borderColor: Colors.border }]} />
                  <View style={[styles.proofRemove, { backgroundColor: Colors.backdrop }]}>
                    <Ionicons name="close" size={14} color={Colors.onPrimary} />
                  </View>
                </TouchableOpacity>
              ))}
              {proofUris.length < 2 && (
                <TouchableOpacity
                  style={[styles.proofAdd, { backgroundColor: Colors.surfaceRaised, borderColor: Colors.border }]}
                  onPress={handlePickProof}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Take proof photo"
                >
                  <Ionicons name="camera-outline" size={22} color={Colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.proofHint, { color: Colors.mutedForeground }]}>
              Take one or two photos of the finished work. Tap a photo to remove it.
            </Text>
          </View>
        )}
        {(job.status === 'COMPLETED' || waitingForCustomer) && job.proofPhotos.length > 0 && (
          <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <Text style={[styles.cardTitle, { color: Colors.mutedForeground }]}>Proof photos</Text>
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
              {helpLoading ? 'Contacting support' : 'Need help with this job? Contact support'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {action && (
        <FooterBar>
          <Button title={action.label} icon={action.icon} onPress={handleAction} loading={actionLoading} />
        </FooterBar>
      )}

      <OTPVerifySheet
        visible={showOtpSheet}
        onVerify={handleVerifyDoorOtp}
        onClose={() => setShowOtpSheet(false)}
        loading={actionLoading}
        apiError={otpError}
        customerConfirmed={!!job?.identityConfirmedAt}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  flex:          { flex: 1 },
  center:        { flex: 1, justifyContent: 'center' },
  scroll:        { paddingTop: Spacing.xs, paddingBottom: Spacing.xl, gap: Spacing.md },
  heroAmount:    { fontSize: FontSize.display + 4, fontWeight: FontWeight.bold, letterSpacing: -0.5 },
  heroTotal:     { fontSize: FontSize.xs, marginBottom: Spacing.xs },
  batteryBanner: { marginHorizontal: Spacing.base },
  banner:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.base, padding: Spacing.md, borderRadius: Radius.lg },
  bannerTitle:   { fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  bannerSub:     { fontSize: FontSize.xs, marginTop: 2 },
  card:          { marginHorizontal: Spacing.base, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base, gap: Spacing.sm },
  cardTitle:     { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  serviceName:   { fontSize: FontSize.h3, fontWeight: FontWeight.semibold },
  metaRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  metaText:      { flex: 1, fontSize: FontSize.sm },
  items:         { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.sm, gap: Spacing.sm },
  itemRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  qty:           { minWidth: 32, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center' },
  qtyText:       { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  itemName:      { flex: 1, fontSize: FontSize.sm },
  itemPrice:     { fontSize: FontSize.sm },
  notes:         { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md },
  notesText:     { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },
  customerRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar:        { width: 40, height: 40, borderRadius: 20 },
  avatarFallback:{ alignItems: 'center', justifyContent: 'center' },
  customerName:  { flex: 1, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  quickRow:      { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  quick:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, paddingHorizontal: Spacing.sm, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth },
  quickText:     { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  proofRow:      { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  proofThumb:    { width: 80, height: 80, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth },
  proofRemove:   { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  proofAdd:      { width: 80, height: 80, borderRadius: Radius.md, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  proofHint:     { fontSize: FontSize.xs },
  doneCard:      { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  doneTitle:     { fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  doneSub:       { fontSize: FontSize.sm, marginTop: 2, lineHeight: 18 },
  helpRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.md },
  helpText:      { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});
