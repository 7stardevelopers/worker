import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';
import { alertError } from '@utils/errors';
import { compressImage } from '@utils/image';
import { uploadToS3 } from '@utils/s3Upload';
import { goBackFrom } from '@utils/onboarding';

// Small enough for a fast upload, sharp enough for customers and admin review.
const PHOTO_EDGE = 800;
const TIPS = ['Good light, face the camera', 'Whole face inside the oval', 'No sunglasses, mask or cap'];

/**
 * Last registration step: a live front-camera selfie (no gallery) that becomes the
 * worker's profile photo. Saving it submits the application, and it is locked from
 * then on — only an admin reset (backend) lets the worker take a new one.
 * `mode=required`: an existing / reset worker sent here by the auth gate.
 */
export default function PhotoScreen() {
  const { Colors } = useTheme();
  const { token, updateUser } = useAuth();
  const { fetchProfile } = useProvider();
  const required = useLocalSearchParams().mode === 'required';
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [shot, setShot] = useState(null); // { uri, width, height }
  const [capturing, setCapturing] = useState(false);
  const [saving, setSaving] = useState(false);

  const capture = async () => {
    if (!cameraRef.current || !ready || capturing) return;
    setCapturing(true);
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setShot(pic);
    } catch (e) {
      alertError("Couldn't take photo", e);
    } finally {
      setCapturing(false);
    }
  };

  const confirm = async () => {
    if (!shot || saving) return;
    setSaving(true);
    try {
      const small = await compressImage(shot.uri, { width: shot.width, height: shot.height, maxEdge: PHOTO_EDGE });
      const presign = await api.post('/media/presign', { content_type: 'image/jpeg', folder: 'profile' }, token);
      const { upload_url, object_url } = presign.data;
      await uploadToS3(upload_url, small.uri, 'image/jpeg');
      await api.post('/providers/me/photo', { photo_url: object_url }, token);
      await updateUser({ photo_url: object_url });
      await fetchProfile();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (required) {
        Alert.alert('Photo saved', 'This is now your profile photo.', [{ text: 'OK', onPress: () => router.replace('/') }]);
      } else {
        Alert.alert(
          'Application Submitted!',
          "Your profile is under review. You'll be notified within 24 hours once approved.",
          [{ text: 'OK', onPress: () => router.replace('/') }],
        );
      }
    } catch (e) {
      alertError("Couldn't save photo", e);
    } finally {
      setSaving(false);
    }
  };

  const renderCamera = () => {
    if (!permission) return <ActivityIndicator color={Colors.primary} />;
    if (!permission.granted) {
      const blocked = !permission.canAskAgain;
      return (
        <View style={styles.permission}>
          <Ionicons name="camera-outline" size={40} color={Colors.mutedForeground} />
          <Text style={[styles.permText, { color: Colors.foreground }]}>
            Camera access is needed to take your profile photo.
          </Text>
          <TouchableOpacity
            onPress={blocked ? () => Linking.openSettings() : requestPermission}
            style={[styles.permBtn, { backgroundColor: Colors.primary }]}
            activeOpacity={0.85}
          >
            <Text style={styles.permBtnText}>{blocked ? 'Open Settings' : 'Allow camera'}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return shot ? (
      <Image source={{ uri: shot.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
    ) : (
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="front"
        mirror
        onCameraReady={() => setReady(true)}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <View style={styles.header}>
        {!required && (
          <TouchableOpacity onPress={() => goBackFrom('photo')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: Colors.foreground }]}>{required ? 'Take your profile photo' : 'Profile photo'}</Text>
          <Text style={[styles.sub, { color: Colors.mutedForeground }]}>
            Take a clear photo of your face. Customers see this before you arrive.
          </Text>
        </View>
      </View>

      <View style={[styles.frame, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        {renderCamera()}
        {permission?.granted && (
          <View pointerEvents="none" style={styles.ovalWrap}>
            <View style={[styles.oval, { borderColor: shot ? Colors.success : '#FFFFFFCC' }]} />
          </View>
        )}
      </View>

      <View style={styles.tips}>
        {TIPS.map(t => (
          <View key={t} style={styles.tipRow}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
            <Text style={[styles.tipText, { color: Colors.mutedForeground }]}>{t}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.lockNote, { backgroundColor: Colors.warning + '14', borderColor: Colors.warning + '44' }]}>
        <Ionicons name="lock-closed" size={16} color={Colors.warning} />
        <Text style={[styles.lockText, { color: Colors.foreground }]}>
          You can't change this photo later. Only support can reset it.
        </Text>
      </View>

      <View style={[styles.footer, { borderTopColor: Colors.border }]}>
        {shot ? (
          <View style={styles.row}>
            <TouchableOpacity
              onPress={() => setShot(null)}
              disabled={saving}
              style={[styles.retake, { borderColor: Colors.border }]}
              activeOpacity={0.85}
              accessibilityLabel="Retake photo"
            >
              <Ionicons name="refresh" size={18} color={Colors.foreground} />
              <Text style={[styles.retakeText, { color: Colors.foreground }]}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, { opacity: saving ? 0.6 : 1 }]} onPress={confirm} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={Colors.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGrad}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />}
                <Text style={styles.primaryText}>
                  {saving ? 'Saving…' : required ? 'Use this photo' : 'Use photo & submit'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={capture}
            disabled={!permission?.granted || !ready || capturing}
            style={[styles.shutterRing, { borderColor: Colors.primary, opacity: permission?.granted && ready ? 1 : 0.4 }]}
            accessibilityLabel="Take photo"
            activeOpacity={0.8}
          >
            <View style={[styles.shutter, { backgroundColor: Colors.primary }]}>
              {capturing ? <ActivityIndicator color="#FFF" /> : <Ionicons name="camera" size={26} color="#FFF" />}
            </View>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingHorizontal: Spacing.base, paddingTop: Spacing.sm },
  title:       { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  sub:         { fontSize: FontSize.sm, marginTop: 4 },
  frame:       { marginHorizontal: Spacing.base, marginTop: Spacing.base, aspectRatio: 3 / 4, maxHeight: '52%', alignSelf: 'center', width: '88%', borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  ovalWrap:    { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  oval:        { width: '68%', height: '74%', borderRadius: 999, borderWidth: 3, borderStyle: 'dashed' },
  permission:  { alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  permText:    { fontSize: FontSize.body, textAlign: 'center' },
  permBtn:     { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.md },
  permBtnText: { color: '#FFF', fontWeight: FontWeight.semibold },
  tips:        { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, gap: 6 },
  tipRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipText:     { fontSize: FontSize.sm },
  lockNote:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.base, marginTop: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  lockText:    { flex: 1, fontSize: FontSize.sm },
  footer:      { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.base, paddingBottom: 36, borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  row:         { flexDirection: 'row', gap: Spacing.md, alignSelf: 'stretch' },
  retake:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 56, paddingHorizontal: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1.5 },
  retakeText:  { fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  primaryBtn:  { flex: 1, borderRadius: Radius.lg, overflow: 'hidden', height: 56 },
  primaryGrad: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  primaryText: { color: '#FFF', fontSize: FontSize.body, fontWeight: FontWeight.bold },
  shutterRing: { width: 76, height: 76, borderRadius: 38, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  shutter:     { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
});
