<<<<<<< HEAD
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
=======
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { FontSize, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';
<<<<<<< HEAD
import OnboardingHeader from '@components/OnboardingHeader';
=======
import { alertError } from '@utils/errors';
import { compressImage } from '@utils/image';
import { goBackFrom, fetchMyDocuments } from '@utils/onboarding';
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
import DocumentUploadCard from '@components/DocumentUploadCard';
import LoadingScreen from '@components/LoadingScreen';
import FooterBar from '@components/FooterBar';
import Button from '@components/Button';

const DOCS = [
<<<<<<< HEAD
  { key: 'aadhaar_front', title: 'Aadhaar (front)', subtitle: 'Front side of your Aadhaar card' },
  { key: 'aadhaar_back',  title: 'Aadhaar (back)',  subtitle: 'Back side of your Aadhaar card'  },
  { key: 'pan',           title: 'PAN card',        subtitle: 'A clear photo of your PAN card'  },
=======
  { type: 'AADHAAR_FRONT', title: 'Aadhaar Front', subtitle: 'Front side of your Aadhaar card' },
  { type: 'AADHAAR_BACK',  title: 'Aadhaar Back',  subtitle: 'Back side of your Aadhaar card'  },
  { type: 'PAN',           title: 'PAN Card',      subtitle: 'Your PAN card photo'              },
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
];

// Backend document status → DocumentUploadCard status
const CARD_STATUS = { PENDING: 'pending', VERIFIED: 'verified', REJECTED: 'rejected' };

export default function DocumentsScreen() {
  const { Colors } = useTheme();
  const { token } = useAuth();
  const editing = useLocalSearchParams().mode === 'edit';
  const [files,        setFiles]        = useState({}); // newly picked, not yet uploaded
  const [onFile,       setOnFile]       = useState({}); // already uploaded, keyed by doc_type
  const [saving,       setSaving]       = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // A worker resuming onboarding may already have uploaded some documents.
  useEffect(() => {
    fetchMyDocuments(token).then(setOnFile).catch(() => {});
  }, [token]);

  const pickDocument = async (type) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled) return;
    const { uri, width, height } = result.assets[0];
    setFiles(prev => ({ ...prev, [type]: { uri, width, height } }));
  };

<<<<<<< HEAD
  const allPicked = DOCS.every(d => files[d.key]);
=======
  const isSatisfied = (type) => !!files[type] || (onFile[type] && onFile[type].status !== 'REJECTED');
>>>>>>> e26961c635b60a007766324f445890a2e88d7232

  const handleNext = async () => {
    const missing = DOCS.filter(d => !isSatisfied(d.type));
    if (missing.length > 0) {
      Alert.alert('Required', `Please add: ${missing.map(d => d.title).join(', ')}`);
      return;
    }
    const toUpload = DOCS.filter(d => files[d.type]);
    setSaving(true);
    try {
<<<<<<< HEAD
      for (let i = 0; i < DOCS.length; i++) {
        const doc = DOCS[i];
        setUploadStatus(`Uploading ${i + 1} of ${DOCS.length}`);
        const { uri, mimeType } = files[doc.key];
        const doc_type = doc.key.toUpperCase();
        const file_content = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await api.post('/documents/upload', { doc_type, content_type: mimeType, file_content }, token);
      }
      setSaving(false);
      router.push('/onboarding/bank');
    } catch (e) {
=======
      for (let i = 0; i < toUpload.length; i++) {
        const doc = toUpload[i];
        setUploadStatus(`Uploading ${doc.title} (${i + 1} of ${toUpload.length})...`);
        // Full-size phone photos exceed the API's ~6 MB request cap once base64-encoded.
        const { base64 } = await compressImage(files[doc.type].uri, { ...files[doc.type], base64: true });
        await api.post('/documents/upload', { doc_type: doc.type, content_type: 'image/jpeg', file_content: base64 }, token);
        // Uploaded — don't send it again if a later document fails and the worker retries.
        setOnFile(prev => ({ ...prev, [doc.type]: { doc_type: doc.type, status: 'PENDING' } }));
        setFiles(prev => { const next = { ...prev }; delete next[doc.type]; return next; });
      }
      if (editing) router.back();
      else router.push('/onboarding/bank');
    } catch (e) {
      alertError('Upload Failed', e, "Couldn't upload your documents. Please try again.");
    } finally {
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
      setSaving(false);
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploadStatus('');
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
<<<<<<< HEAD
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <OnboardingHeader step={3} title="Documents" subtitle="Needed to verify your identity." />
=======
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => goBackFrom('documents')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.title, { color: Colors.foreground }]}>{editing ? 'My Documents' : 'Upload Documents'}</Text>
            <Text style={[styles.sub, { color: Colors.mutedForeground }]}>Required for verification</Text>
          </View>
        </View>

        <View style={[styles.notice, { backgroundColor: Colors.info + '12', borderColor: Colors.info + '40' }]}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.info} />
          <Text style={[styles.noticeText, { color: Colors.info }]}>
            Documents are reviewed within 24 hrs. Your data is encrypted and stored securely.
          </Text>
        </View>
>>>>>>> e26961c635b60a007766324f445890a2e88d7232

        <View style={styles.docList}>
          {DOCS.map(doc => (
            <DocumentUploadCard
              key={doc.type}
              title={doc.title}
              subtitle={onFile[doc.type]?.status === 'REJECTED' && !files[doc.type]
                ? (onFile[doc.type].rejection_reason || 'Rejected — please upload a clearer photo')
                : doc.subtitle}
              uri={files[doc.type]?.uri ?? null}
              status={files[doc.type] ? 'pending' : (CARD_STATUS[onFile[doc.type]?.status] ?? 'empty')}
              onPress={() => pickDocument(doc.type)}
            />
          ))}
        </View>

        <View style={styles.note}>
          <Ionicons name="lock-closed-outline" size={14} color={Colors.mutedForeground} />
          <Text style={[styles.noteText, { color: Colors.mutedForeground }]}>
            Documents are encrypted and reviewed within 24 hours.
          </Text>
        </View>
      </ScrollView>

<<<<<<< HEAD
      <FooterBar>
        <Button title="Upload and continue" onPress={handleNext} disabled={!allPicked} loading={saving} />
      </FooterBar>
=======
      <View style={[styles.footer, { borderTopColor: Colors.border }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { opacity: !saving ? 1 : 0.6 }]}
          onPress={handleNext}
          disabled={saving}
          activeOpacity={0.85}
        >
          <LinearGradient colors={Colors.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextGrad}>
            <Text style={styles.nextText}>{saving ? 'Uploading...' : editing ? (Object.keys(files).length ? 'Upload' : 'Done') : 'Next: Bank Details'}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
>>>>>>> e26961c635b60a007766324f445890a2e88d7232

      <Modal visible={saving} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={[styles.overlay, { backgroundColor: Colors.backdrop }]}>
          <View style={[styles.loaderCard, { backgroundColor: Colors.surface }]}>
            <LoadingScreen overlay label={uploadStatus || 'Uploading documents'} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  scroll:     { padding: Spacing.base, paddingTop: 0, gap: Spacing.lg },
  docList:    { gap: Spacing.sm },
  note:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  noteText:   { flex: 1, fontSize: FontSize.sm, lineHeight: 18 },
  overlay:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderCard: { width: 200, height: 160, borderRadius: Radius.lg },
});
