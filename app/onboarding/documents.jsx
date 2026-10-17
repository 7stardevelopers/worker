import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';
import { alertError } from '@utils/errors';
import { compressImage } from '@utils/image';
import { fetchMyDocuments } from '@utils/onboarding';
import DocumentUploadCard from '@components/DocumentUploadCard';
import OnboardingHeader from '@components/OnboardingHeader';
import FooterBar from '@components/FooterBar';
import Button from '@components/Button';

const DOCS = [
  { type: 'AADHAAR_FRONT', title: 'Aadhaar front', subtitle: 'Front side of your Aadhaar card' },
  { type: 'AADHAAR_BACK',  title: 'Aadhaar back',  subtitle: 'Back side of your Aadhaar card'  },
  { type: 'PAN',           title: 'PAN card',      subtitle: 'A clear photo of your PAN card'  },
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

  const isSatisfied = (type) => !!files[type] || (onFile[type] && onFile[type].status !== 'REJECTED');

  const handleNext = async () => {
    const missing = DOCS.filter(d => !isSatisfied(d.type));
    if (missing.length > 0) {
      Alert.alert('Required', `Please upload: ${missing.map(d => d.title).join(', ')}`);
      return;
    }
    const toUpload = DOCS.filter(d => files[d.type]);
    setSaving(true);
    try {
      for (let i = 0; i < toUpload.length; i++) {
        const doc = toUpload[i];
        setUploadStatus(`${doc.title} (${i + 1} of ${toUpload.length})`);
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
      alertError('Upload failed', e, "Couldn't upload your documents. Please try again.");
    } finally {
      setSaving(false);
      setUploadStatus('');
    }
  };

  const buttonTitle = editing ? (Object.keys(files).length ? 'Upload' : 'Done') : 'Continue';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <OnboardingHeader
          stepKey="documents"
          editing={editing}
          title={editing ? 'My documents' : 'Documents'}
          subtitle="Needed to verify your identity."
        />

        <View style={styles.docList}>
          {DOCS.map(doc => (
            <DocumentUploadCard
              key={doc.type}
              title={doc.title}
              subtitle={onFile[doc.type]?.status === 'REJECTED' && !files[doc.type]
                ? (onFile[doc.type].rejection_reason || 'Rejected. Please upload a clearer photo.')
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
            Reviewed within 24 hours. Your documents are encrypted and stored securely.
          </Text>
        </View>
      </ScrollView>

      <FooterBar>
        <Button title={buttonTitle} onPress={handleNext} loading={saving} />
      </FooterBar>

      <Modal visible={saving} transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
        <View style={[styles.loaderOverlay, { backgroundColor: Colors.backdrop }]}>
          <View style={[styles.loaderCard, { backgroundColor: Colors.surface }]}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[styles.loaderTitle, { color: Colors.foreground }]}>Uploading documents</Text>
            {uploadStatus ? <Text style={[styles.loaderSub, { color: Colors.mutedForeground }]}>{uploadStatus}</Text> : null}
            <Text style={[styles.loaderHint, { color: Colors.subtleForeground }]}>Please keep the app open</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  scroll:        { padding: Spacing.base, paddingTop: 0, gap: Spacing.lg },
  docList:       { gap: Spacing.sm },
  note:          { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  noteText:      { flex: 1, fontSize: FontSize.sm, lineHeight: 18 },
  loaderOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  loaderCard:    { width: '100%', maxWidth: 320, borderRadius: Radius.lg, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  loaderTitle:   { fontSize: FontSize.h3, fontWeight: FontWeight.semibold, textAlign: 'center', marginTop: Spacing.sm },
  loaderSub:     { fontSize: FontSize.body, textAlign: 'center' },
  loaderHint:    { fontSize: FontSize.sm, textAlign: 'center' },
});
