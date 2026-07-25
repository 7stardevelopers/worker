import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image, Linking, Platform, Share,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { FontSize, FontWeight, Spacing, Radius, Shadow } from '@constants/theme';
import { api } from '@utils/api';
import { normalizeJob } from '@utils/normalize';
import { uploadToS3 } from '@utils/s3Upload';
import { startLocationTracking, stopLocationTracking } from '@utils/location';
import StatusPill from '@components/StatusPill';
import OTPVerifySheet from '@components/OTPVerifySheet';
import Skeleton from '@components/Skeleton';

const TRANSITION_ACTIONS = {
  ACCEPTED:    { next: 'EN_ROUTE',    label: 'Navigate to Customer', icon: 'navigate-outline',        color: '#3B82F6', isNavigate: true },
  EN_ROUTE:    { next: 'IN_PROGRESS', label: 'Verify Door OTP',      icon: 'keypad-outline',          color: '#8B5CF6', needsDoorOtp: true },
  IN_PROGRESS: { next: 'COMPLETED',   label: 'Mark as Complete',     icon: 'checkmark-circle-outline', color: '#10B981', needsProof: true },
};

export default function JobDetailScreen() {
  const { id, data: dataParam } = useLocalSearchParams();
  const { Colors } = useTheme();
  const { token } = useAuth();

  const [job, setJob] = useState(() => {
    if (!dataParam) return null;
    try { return JSON.parse(dataParam); } catch { return null; }
  });
  const hasInitialData = useRef(!!dataParam);
  const [loading,       setLoading]       = useState(!hasInitialData.current);
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
      hasInitialData.current = true;
      if (j.status === 'ACCEPTED' && j.scheduledAt) {
        const minsUntil = (new Date(j.scheduledAt) - Date.now()) / 60000;
        if (minsUntil <= 60) startLocationTracking().catch(() => {});
      }
    } catch (e) {
      if (!hasInitialData.current) {
        const isAccessDenied = /access denied|permission|unauthorized/i.test(e.message ?? '');
        if (isAccessDenied) {
          Alert.alert(
            'Access Denied',
            "You don't have permission to view this job.",
            [
              { text: 'Dismiss', style: 'cancel' },
              { text: 'Go to Home', style: 'default', onPress: () => router.replace('/(tabs)') },
            ],
          );
        } else {
          Alert.alert('Error', e.message);
        }
      }
    }
  }, [id, token]);

  useFocusEffect(
    useCallback(() => {
      if (!hasInitialData.current) setLoading(true);
      fetchJob().finally(() => setLoading(false));
    }, [fetchJob])
  );

  const doStatusTransition = async (nextStatus) => {
    setActionLoading(true);
    try {
      await api.patch(`/bookings/${id}/status`, { status: nextStatus }, token);
      if (nextStatus === 'EN_ROUTE') await startLocationTracking().catch(() => {});
      if (nextStatus === 'COMPLETED') await stopLocationTracking().catch(() => {});
      setJob(prev => prev ? { ...prev, status: nextStatus } : prev);
      fetchJob().catch(() => {});
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
      setJob(prev => prev ? { ...prev, status: 'IN_PROGRESS', doorOtpVerified: true } : prev);
      fetchJob().catch(() => {});
    } catch (e) {
      setOtpError(e.message || 'Incorrect OTP. Try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePickProof = async () => {
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setProofUris(prev => [...prev, uri]);
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
      await stopLocationTracking().catch(() => {});
      setJob(prev => prev ? { ...prev, status: 'COMPLETED' } : prev);
      fetchJob().catch(() => {});
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const action = TRANSITION_ACTIONS[job?.status];

  const handleNavigate = useCallback(async () => {
    setActionLoading(true);
    try {
      await api.patch(`/bookings/${id}/status`, { status: 'EN_ROUTE' }, token);
      await startLocationTracking().catch(() => {});
      setJob(prev => prev ? { ...prev, status: 'EN_ROUTE' } : prev);
      if (job?.address?.lat && job?.address?.lng) {
        const { lat, lng } = job.address;
        const url = Platform.OS === 'ios'
          ? `maps://?daddr=${lat},${lng}&dirflg=d`
          : `google.navigation:q=${lat},${lng}`;
        Linking.openURL(url).catch(() =>
          Linking.openURL(`https://maps.google.com/maps?daddr=${lat},${lng}`)
        );
      }
      fetchJob().catch(() => {});
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setActionLoading(false);
    }
  }, [id, token, job]);

  const handleAction = () => {
    if (!action) return;
    if (action.needsDoorOtp) { setOtpError(''); setShowOtpSheet(true); return; }
    if (action.needsProof)   { handleComplete(); return; }
    if (action.isNavigate)   { handleNavigate(); return; }
    doStatusTransition(action.next);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
        {Array.from({ length: 4 }).map((_, i) => <Skeleton.BookingCard key={i} />)}
      </SafeAreaView>
    );
  }

  if (!job) return null;

  const earning = job.providerEarning ?? 0;
  const scheduled = job.scheduledAt
    ? new Date(job.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Immediate';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: Colors.foreground }]}>Job Details</Text>
          <StatusPill status={job.status} />
        </View>

        {/* Earning Hero */}
        <View style={[styles.heroCard, Shadow.lg]}>
          <LinearGradient colors={['#6366F1', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroGrad}>
            <Text style={styles.heroLabel}>Your Earning</Text>
            <Text style={styles.heroAmount}>₹{Number(earning).toLocaleString('en-IN')}</Text>
            <Text style={styles.heroTotal}>Total: ₹{Number(job.totalAmount).toLocaleString('en-IN')} • Platform fee: ₹{Number(job.platformFee ?? 0).toLocaleString('en-IN')}</Text>
          </LinearGradient>
        </View>

        {/* Service Info */}
        <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Text style={[styles.cardTitle, { color: Colors.mutedForeground }]}>SERVICE</Text>
          <Text style={[styles.serviceName, { color: Colors.foreground }]}>{job.service.name}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color={Colors.mutedForeground} />
            <Text style={[styles.metaText, { color: Colors.mutedForeground }]}>{job.service.duration} min • {scheduled}</Text>
          </View>
          {job.customerNotes ? (
            <Text style={[styles.notes, { color: Colors.mutedForeground, borderTopColor: Colors.border }]}>
              📝 {job.customerNotes}
            </Text>
          ) : null}
        </View>

        {/* Customer info */}
        {(job.customerName || job.customerPhone) && (
          <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <Text style={[styles.cardTitle, { color: Colors.mutedForeground }]}>CUSTOMER</Text>
            <View style={styles.customerRow}>
              <View style={[styles.customerAvatar, { backgroundColor: Colors.primary + '18' }]}>
                <Ionicons name="person-outline" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.customerName, { color: Colors.foreground }]}>
                  {job.customerName ?? 'Customer'}
                </Text>
                {!!job.customerPhone && (
                  <Text style={[styles.metaText, { color: Colors.mutedForeground }]}>
                    {job.customerPhone}
                  </Text>
                )}
              </View>
              {!!job.customerPhone && (
                <TouchableOpacity
                  style={[styles.callBtn, { backgroundColor: Colors.success + '15', borderColor: Colors.success + '40' }]}
                  onPress={() => Linking.openURL(`tel:${job.customerPhone}`)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="call-outline" size={16} color={Colors.success} />
                </TouchableOpacity>
              )}
              {['ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED'].includes(job.status) && (
                <TouchableOpacity
                  style={[styles.callBtn, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary + '40' }]}
                  onPress={() => router.push(`/job/chat?bookingId=${id}&customerName=${encodeURIComponent(job.customerName ?? 'Customer')}`)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="chatbubble-outline" size={16} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Address + Map */}
        <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Text style={[styles.cardTitle, { color: Colors.mutedForeground }]}>LOCATION</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={Colors.primary} />
            <Text style={[styles.metaText, { color: Colors.foreground }]}>{job.address.fullAddress}</Text>
          </View>

          {job.address.lat && job.address.lng && (
            <>
              <View style={[styles.mapCard, { borderColor: Colors.border, overflow: 'hidden' }]}>
                <MapView
                  style={StyleSheet.absoluteFill}
                  initialRegion={{
                    latitude: job.address.lat,
                    longitude: job.address.lng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                >
                  <Marker
                    coordinate={{ latitude: job.address.lat, longitude: job.address.lng }}
                    pinColor="#6366F1"
                  />
                </MapView>
              </View>
              <TouchableOpacity
                style={[styles.directionsBtn, { backgroundColor: Colors.primary + '12', borderColor: Colors.primary + '35' }]}
                onPress={() => {
                  const url = Platform.OS === 'ios'
                    ? `maps://?daddr=${job.address.lat},${job.address.lng}`
                    : `geo:${job.address.lat},${job.address.lng}?q=${job.address.lat},${job.address.lng}(Customer)`;
                  Linking.openURL(url).catch(() =>
                    Linking.openURL(`https://maps.google.com/maps?daddr=${job.address.lat},${job.address.lng}`)
                  );
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="navigate-outline" size={16} color={Colors.primary} />
                <Text style={[styles.directionsBtnText, { color: Colors.primary }]}>Get Directions</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Proof photos (when IN_PROGRESS) */}
        {job.status === 'IN_PROGRESS' && (
          <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <Text style={[styles.cardTitle, { color: Colors.mutedForeground }]}>PROOF PHOTOS</Text>
            <View style={styles.proofRow}>
              {proofUris.map((uri, i) => (
                <Image key={i} source={{ uri }} style={[styles.proofThumb, { borderColor: Colors.border }]} />
              ))}
              {proofUris.length < 2 && (
                <TouchableOpacity
                  style={[styles.proofAdd, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary + '40' }]}
                  onPress={handlePickProof}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-outline" size={22} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.proofHint, { color: Colors.mutedForeground }]}>
              Take 1–2 photos of the completed work
            </Text>
          </View>
        )}

      </ScrollView>

      {/* Action Button */}
      {action && (
        <View style={[styles.actionBar, { backgroundColor: Colors.background, borderTopColor: Colors.border }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { opacity: actionLoading ? 0.6 : 1 }]}
            onPress={handleAction}
            disabled={actionLoading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[action.color, action.color + 'CC']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.actionGrad}
            >
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
  root:       { flex: 1 },
  scroll:     { paddingBottom: 120, gap: Spacing.md },
  header:     { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, gap: Spacing.md },
  backBtn:    { width: 40, height: 40, justifyContent: 'center' },
  title:      { flex: 1, fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  heroCard:   { marginHorizontal: Spacing.base, borderRadius: Radius.xl, overflow: 'hidden' },
  heroGrad:   { padding: Spacing.xl, gap: 4 },
  heroLabel:  { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.sm },
  heroAmount: { color: '#FFF', fontSize: 44, fontWeight: FontWeight.bold, letterSpacing: -1 },
  heroTotal:  { color: 'rgba(255,255,255,0.65)', fontSize: FontSize.xs },
  card:       { marginHorizontal: Spacing.base, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base, gap: Spacing.sm },
  cardTitle:  { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1 },
  serviceName:{ fontSize: FontSize.h3, fontWeight: FontWeight.semibold },
  metaRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  metaText:   { flex: 1, fontSize: FontSize.sm },
  notes:      { fontSize: FontSize.sm, lineHeight: 20, paddingTop: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, marginTop: Spacing.sm },
  proofRow:   { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  proofThumb: { width: 80, height: 80, borderRadius: Radius.md, borderWidth: 1 },
  proofAdd:   { width: 80, height: 80, borderRadius: Radius.md, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  proofHint:  { fontSize: FontSize.xs },
  customerRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  customerAvatar:  { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  customerName:    { fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  callBtn:         { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', borderWidth: 1, flexShrink: 0 },

  mapCard:         { height: 160, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, marginTop: Spacing.sm },
  directionsBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: Radius.md, borderWidth: 1, paddingVertical: 10, marginTop: Spacing.sm },
  directionsBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  actionBar:  { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.base, paddingBottom: 36, borderTopWidth: StyleSheet.hairlineWidth },
  actionBtn:  { borderRadius: Radius.lg, overflow: 'hidden', height: 56 },
  actionGrad: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  actionText: { color: '#FFF', fontSize: FontSize.body, fontWeight: FontWeight.bold },
});
