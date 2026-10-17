import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';
import { normalizeJob } from '@utils/normalize';
import { formatINR } from '@utils/format';
import { uploadToS3 } from '@utils/s3Upload';
import { startLocationTracking, stopLocationTracking } from '@utils/location';
import ScreenHeader from '@components/ScreenHeader';
import StatusPill from '@components/StatusPill';
import OTPVerifySheet from '@components/OTPVerifySheet';
import LoadingScreen from '@components/LoadingScreen';
import EmptyState from '@components/EmptyState';
import FooterBar from '@components/FooterBar';
import Button from '@components/Button';

const MAX_PROOF_PHOTOS = 2;

// Opens the native Maps app for turn-by-turn directions to the job's fixed
// address. Background location tracking (started separately) keeps running
// as an OS-level service regardless of which app is in the foreground.
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
  PENDING:     { label: 'Accept job',      icon: 'checkmark',          isAccept: true },
  ACCEPTED:    { label: 'Start trip',      icon: 'navigate-outline',   next: 'EN_ROUTE' },
  EN_ROUTE:    { label: 'Enter door code', icon: 'keypad-outline',     next: 'IN_PROGRESS', needsDoorOtp: true },
  IN_PROGRESS: { label: 'Complete job',    icon: 'checkmark-done',     next: 'COMPLETED', needsProof: true },
};

const NAV_STATUSES = ['ACCEPTED', 'EN_ROUTE'];

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams();
  const { Colors } = useTheme();
  const { token } = useAuth();

  const [job,           setJob]           = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [loadError,     setLoadError]     = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showOtpSheet,  setShowOtpSheet]  = useState(false);
  const [otpError,      setOtpError]      = useState('');
  const [proofUris,     setProofUris]     = useState([]);

  const fetchJob = useCallback(async () => {
    if (!token || !id) return;
    try {
      const res = await api.get(`/bookings/${id}`, token);
      const j = normalizeJob(res.data);
      setJob(j);
      setLoadError('');
      if (j.status === 'ACCEPTED' && j.scheduledAt) {
        const minsUntil = (new Date(j.scheduledAt).getTime() - Date.now()) / 60000;
        if (minsUntil <= 60) startLocationTracking().catch(() => {});
      }
      // Job may have been cancelled/rejected by someone else (customer, admin)
      // since the last fetch — make sure background GPS isn't left running.
      if (['CANCELLED', 'REJECTED', 'COMPLETED'].includes(j.status)) {
        stopLocationTracking().catch(() => {});
      }
    } catch (e) {
      setLoadError(e.message || 'Could not load this job.');
    }
  }, [id, token]);

  useFocusEffect(
    useCallback(() => {
      fetchJob().finally(() => setLoading(false));
    }, [fetchJob])
  );

  const retry = () => {
    setLoading(true);
    fetchJob().finally(() => setLoading(false));
  };

  const doStatusTransition = async (nextStatus) => {
    setActionLoading(true);
    try {
      await api.patch(`/bookings/${id}/status`, { status: nextStatus }, token);
      if (nextStatus === 'EN_ROUTE') {
        await startLocationTracking().catch(() => {});
        openNavigation(job?.address?.lat, job?.address?.lng);
      }
      if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(nextStatus)) await stopLocationTracking().catch(() => {});
      await fetchJob();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyDoorOtp = async (code) => {
    setActionLoading(true);
    setOtpError('');
    try {
      await api.post(`/bookings/${id}/otp-verify`, { otp: code }, token);
      setShowOtpSheet(false);
      await fetchJob();
    } catch (e) {
      setOtpError(e.message || 'Incorrect code. Try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePickProof = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in Settings to take proof photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setProofUris(prev => [...prev, uri].slice(0, MAX_PROOF_PHOTOS));
  };

  const removeProof = (uri) => setProofUris(prev => prev.filter(u => u !== uri));

  const handleComplete = async () => {
    if (proofUris.length === 0) {
      Alert.alert('Photo required', 'Take at least one photo of the completed work.');
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
      await stopLocationTracking().catch(() => {});
      setProofUris([]);
      await fetchJob();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptJob = async () => {
    setActionLoading(true);
    try {
      await api.patch(`/bookings/${id}/accept`, {}, token);
      await fetchJob();
    } catch (e) {
      Alert.alert('Job unavailable', e.message ?? 'Another provider may have already accepted it.');
      router.back();
    } finally {
      setActionLoading(false);
    }
  };

  const handleCall = async () => {
    try {
      await api.post('/calls/initiate', { booking_id: id, target: 'customer' }, token);
      Alert.alert('Calling', 'Connecting you now. Please answer the incoming call.');
    } catch (e) {
      Alert.alert('Call failed', e.message ?? 'Please try again.');
    }
  };

  const action = TRANSITION_ACTIONS[job?.status];

  const handleAction = () => {
    if (!action) return;
    if (action.isAccept)     { handleAcceptJob(); return; }
    if (action.needsDoorOtp) { setOtpError(''); setShowOtpSheet(true); return; }
    if (action.needsProof)   { handleComplete(); return; }
    doStatusTransition(action.next);
  };

  if (loading || !job) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top', 'bottom']}>
        {loading ? <LoadingScreen overlay /> : null}
        <ScreenHeader back title="Job details" />
        {!loading ? (
          <View style={styles.centerFill}>
            <EmptyState
              icon="alert-circle-outline"
              title="Couldn't load this job"
              subtitle={loadError || 'Please check your connection and try again.'}
              cta={{ label: 'Try again', onPress: retry }}
            />
          </View>
        ) : null}
      </SafeAreaView>
    );
  }

  const scheduled = job.scheduledAt
    ? new Date(job.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'As soon as possible';
  const hasCoords = job.address.lat != null && job.address.lng != null;
  const needsMoreProof = action?.needsProof && proofUris.length === 0;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <ScreenHeader back title="Job details" right={<StatusPill status={job.status} small />} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Summary */}
        <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Text style={[styles.serviceName, { color: Colors.foreground }]}>{job.service.name}</Text>
          <Text style={[styles.meta, { color: Colors.mutedForeground }]}>
            {scheduled} · {job.service.duration} min
          </Text>
          <View style={[styles.earningBlock, { borderTopColor: Colors.borderLight }]}>
            <Text style={[styles.label, { color: Colors.mutedForeground }]}>Your earning</Text>
            <Text style={[styles.earning, { color: Colors.foreground }]}>{formatINR(job.providerEarning)}</Text>
            <Text style={[styles.meta, { color: Colors.mutedForeground }]}>
              Total {formatINR(job.totalAmount)} · Platform fee {formatINR(job.platformFee)}
            </Text>
          </View>
        </View>

        {/* Customer */}
        <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Text style={[styles.label, { color: Colors.mutedForeground }]}>Customer</Text>
          <View style={styles.customerRow}>
            <TouchableOpacity
              style={styles.customerInfo}
              onPress={() => router.push(`/customer/${job.customerId}`)}
              activeOpacity={0.7}
              disabled={!job.customerId}
            >
              {job.customerPhoto ? (
                <Image source={{ uri: job.customerPhoto }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: Colors.surfaceRaised }]}>
                  <Ionicons name="person" size={18} color={Colors.mutedForeground} />
                </View>
              )}
              <Text style={[styles.customerName, { color: Colors.foreground }]} numberOfLines={1}>
                {job.customerName}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { borderColor: Colors.border }]}
              onPress={handleCall}
              activeOpacity={0.7}
              accessibilityLabel="Call customer"
            >
              <Ionicons name="call-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Address */}
        <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Text style={[styles.label, { color: Colors.mutedForeground }]}>Location</Text>
          <View style={styles.addressRow}>
            <Text style={[styles.body, { color: Colors.foreground }]}>{job.address.fullAddress}</Text>
            {hasCoords && NAV_STATUSES.includes(job.status) ? (
              <TouchableOpacity
                style={[styles.iconBtn, { borderColor: Colors.border }]}
                onPress={() => openNavigation(job.address.lat, job.address.lng)}
                activeOpacity={0.7}
                accessibilityLabel="Open directions"
              >
                <Ionicons name="navigate-outline" size={18} color={Colors.primary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Customer notes */}
        {job.customerNotes ? (
          <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <Text style={[styles.label, { color: Colors.mutedForeground }]}>Notes from customer</Text>
            <Text style={[styles.body, { color: Colors.foreground }]}>{job.customerNotes}</Text>
          </View>
        ) : null}

        {/* Proof photos */}
        {job.status === 'IN_PROGRESS' && (
          <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <Text style={[styles.label, { color: Colors.mutedForeground }]}>Proof of work</Text>
            <View style={styles.proofRow}>
              {proofUris.map(uri => (
                <TouchableOpacity key={uri} onPress={() => removeProof(uri)} activeOpacity={0.8} accessibilityLabel="Remove photo">
                  <Image source={{ uri }} style={[styles.proofThumb, { backgroundColor: Colors.surfaceRaised }]} />
                  <View style={[styles.proofRemove, { backgroundColor: Colors.backdrop }]}>
                    <Ionicons name="close" size={14} color={Colors.onPrimary} />
                  </View>
                </TouchableOpacity>
              ))}
              {proofUris.length < MAX_PROOF_PHOTOS && (
                <TouchableOpacity
                  style={[styles.proofThumb, styles.proofAdd, { borderColor: Colors.border }]}
                  onPress={handlePickProof}
                  activeOpacity={0.7}
                  accessibilityLabel="Take photo"
                >
                  <Ionicons name="camera-outline" size={22} color={Colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.meta, { color: Colors.mutedForeground }]}>
              Take 1 or 2 photos of the finished work. Tap a photo to remove it.
            </Text>
          </View>
        )}

      </ScrollView>

      {action ? (
        <FooterBar>
          <Button
            title={action.label}
            icon={action.icon}
            onPress={handleAction}
            loading={actionLoading && !showOtpSheet}
            disabled={needsMoreProof}
          />
        </FooterBar>
      ) : null}

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
  root:           { flex: 1 },
  centerFill:     { flex: 1, justifyContent: 'center' },
  scroll:         { padding: Spacing.base, paddingTop: Spacing.xs, gap: Spacing.md },
  card:           { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base, gap: Spacing.sm },
  label:          { fontSize: FontSize.xs, fontWeight: FontWeight.medium, textTransform: 'uppercase', letterSpacing: 0.6 },
  serviceName:    { fontSize: FontSize.h2, fontWeight: FontWeight.semibold },
  meta:           { fontSize: FontSize.sm, lineHeight: 18 },
  body:           { flex: 1, fontSize: FontSize.body, lineHeight: 22 },
  earningBlock:   { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md, marginTop: Spacing.xs, gap: 2 },
  earning:        { fontSize: FontSize.display, fontWeight: FontWeight.bold, letterSpacing: -0.5 },
  customerRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  customerInfo:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar:         { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  customerName:   { flex: 1, fontSize: FontSize.body, fontWeight: FontWeight.medium },
  iconBtn:        { width: 40, height: 40, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', alignItems: 'center' },
  addressRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  proofRow:       { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  proofThumb:     { width: 84, height: 84, borderRadius: Radius.md },
  proofAdd:       { borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  proofRemove:    { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
});
