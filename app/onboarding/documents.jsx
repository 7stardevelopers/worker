import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';
import { alertError } from '@utils/errors';
import { compressImage } from '@utils/image';
import { goBackFrom, fetchMyDocuments } from '@utils/onboarding';
import DocumentUploadCard from '@components/DocumentUploadCard';

const DOCS = [
  { type: 'AADHAAR_FRONT', title: 'Aadhaar Front', subtitle: 'Front side of your Aadhaar card' },
  { type: 'AADHAAR_BACK',  title: 'Aadhaar Back',  subtitle: 'Back side of your Aadhaar card'  },
  { type: 'PAN',           title: 'PAN Card',      subtitle: 'Your PAN card photo'              },
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
      setSaving(false);
      setUploadStatus('');
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
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

      </ScrollView>

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

      <Modal visible={saving} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.loaderOverlay}>
          <View style={[styles.loaderCard, { backgroundColor: Colors.surface }]}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[styles.loaderTitle, { color: Colors.foreground }]}>Uploading Documents</Text>
            <Text style={[styles.loaderSub, { color: Colors.mutedForeground }]}>{uploadStatus}</Text>
            <Text style={[styles.loaderHint, { color: Colors.mutedForeground }]}>Please don't close the app</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  scroll:     { padding: Spacing.base, paddingBottom: 120, gap: Spacing.base },
  header:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingBottom: Spacing.md },
  title:      { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  sub:        { fontSize: FontSize.sm },
  notice:     { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md },
  noticeText: { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },
  docList:    { gap: Spacing.sm },
  footer:       { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.base, paddingBottom: 36, borderTopWidth: StyleSheet.hairlineWidth },
  nextBtn:      { borderRadius: Radius.lg, overflow: 'hidden', height: 56 },
  nextGrad:     { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  nextText:     { color: '#FFF', fontSize: FontSize.body, fontWeight: FontWeight.bold },
  loaderOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  loaderCard:   { width: '100%', borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  loaderTitle:  { fontSize: FontSize.h3, fontWeight: FontWeight.bold, textAlign: 'center' },
  loaderSub:    { fontSize: FontSize.body, textAlign: 'center' },
  loaderHint:   { fontSize: FontSize.sm, textAlign: 'center' },
});
