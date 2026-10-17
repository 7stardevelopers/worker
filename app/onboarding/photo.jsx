import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Image, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
import OnboardingHeader from '@components/OnboardingHeader';
import FooterBar from '@components/FooterBar';
import Button from '@components/Button';

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
          'Application submitted',
          "Your profile is under review. We'll notify you within 24 hours once it is approved.",
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
          <Button
            title={blocked ? 'Open Settings' : 'Allow camera'}
            compact
            onPress={blocked ? () => Linking.openSettings() : requestPermission}
          />
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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <OnboardingHeader
        stepKey="photo"
        editing={required}
        back={!required}
        title={required ? 'Take your profile photo' : 'Profile photo'}
        subtitle="Take a clear photo of your face. Customers see it before you arrive."
      />

      <View style={[styles.frame, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        {renderCamera()}
        {permission?.granted && (
          <View pointerEvents="none" style={styles.ovalWrap}>
            <View style={[styles.oval, { borderColor: shot ? Colors.success : Colors.onPrimary + 'CC' }]} />
          </View>
        )}
      </View>

      <View style={styles.tips}>
        {TIPS.map(t => (
          <View key={t} style={styles.tipRow}>
            <Ionicons name="checkmark" size={14} color={Colors.mutedForeground} />
            <Text style={[styles.tipText, { color: Colors.mutedForeground }]}>{t}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.lockNote, { backgroundColor: Colors.warning + '1A' }]}>
        <Ionicons name="lock-closed-outline" size={16} color={Colors.warning} />
        <Text style={[styles.lockText, { color: Colors.foreground }]}>
          You can't change this photo later. Only support can reset it.
        </Text>
      </View>

      </ScrollView>

      <FooterBar>
        {shot ? (
          <View style={styles.row}>
            <Button title="Retake" icon="refresh" variant="secondary" onPress={() => setShot(null)} disabled={saving} style={styles.retake} />
            <Button
              title={required ? 'Use this photo' : 'Use photo and submit'}
              onPress={confirm}
              loading={saving}
              style={styles.primaryBtn}
            />
          </View>
        ) : (
          <TouchableOpacity
            onPress={capture}
            disabled={!permission?.granted || !ready || capturing}
            style={[styles.shutterRing, { borderColor: Colors.primary, opacity: permission?.granted && ready ? 1 : 0.4 }]}
            accessibilityRole="button"
            accessibilityLabel="Take photo"
            activeOpacity={0.8}
          >
            <View style={[styles.shutter, { backgroundColor: Colors.primary }]}>
              {capturing ? <ActivityIndicator color={Colors.onPrimary} /> : <Ionicons name="camera-outline" size={26} color={Colors.onPrimary} />}
            </View>
          </TouchableOpacity>
        )}
      </FooterBar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  scroll:      { paddingHorizontal: Spacing.base, paddingBottom: Spacing.lg },
  frame:       { marginTop: Spacing.sm, aspectRatio: 3 / 4, alignSelf: 'center', width: '80%', maxWidth: 340, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  ovalWrap:    { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  oval:        { width: '68%', height: '74%', borderRadius: 999, borderWidth: 2, borderStyle: 'dashed' },
  permission:  { alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  permText:    { fontSize: FontSize.body, textAlign: 'center' },
  tips:        { paddingHorizontal: Spacing.sm, paddingTop: Spacing.base, gap: 6 },
  tipRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipText:     { fontSize: FontSize.sm },
  lockNote:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.base, padding: Spacing.md, borderRadius: Radius.md },
  lockText:    { flex: 1, fontSize: FontSize.sm },
  row:         { flexDirection: 'row', gap: Spacing.sm },
  retake:      { flex: 1 },
  primaryBtn:  { flex: 2 },
  shutterRing: { width: 76, height: 76, borderRadius: 38, borderWidth: 3, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  shutter:     { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
});
