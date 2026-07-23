import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';
import DocumentUploadCard from '@components/DocumentUploadCard';

const DOCS = [
  { key: 'aadhaar_front', title: 'Aadhaar Front', subtitle: 'Front side of your Aadhaar card' },
  { key: 'aadhaar_back',  title: 'Aadhaar Back',  subtitle: 'Back side of your Aadhaar card'  },
  { key: 'pan',           title: 'PAN Card',       subtitle: 'Your PAN card photo'              },
];

export default function DocumentsScreen() {
  const { Colors } = useTheme();
  const { token } = useAuth();
  const [files,        setFiles]        = useState({});
  const [saving,       setSaving]       = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const pickDocument = async (key) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setFiles(prev => ({ ...prev, [key]: { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' } }));
  };

  const handleNext = async () => {
    const missing = DOCS.filter(d => !files[d.key]);
    if (missing.length > 0) {
      Alert.alert('Required', `Please upload: ${missing.map(d => d.title).join(', ')}`);
      return;
    }
    setSaving(true);
    try {
      for (let i = 0; i < DOCS.length; i++) {
        const doc = DOCS[i];
        setUploadStatus(`Uploading ${doc.title} (${i + 1} of ${DOCS.length})...`);
        const { uri, mimeType } = files[doc.key];
        const doc_type = doc.key.toUpperCase();
        const file_content = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await api.post('/documents/upload', { doc_type, content_type: mimeType, file_content }, token);
      }
      setUploadStatus('Done!');
      router.push('/onboarding/bank');
    } catch (e) {
      Alert.alert('Upload Failed', e.message);
    } finally {
      setSaving(false);
      setUploadStatus('');
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.title, { color: Colors.foreground }]}>Upload Documents</Text>
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
              key={doc.key}
              title={doc.title}
              subtitle={doc.subtitle}
              uri={files[doc.key]?.uri ?? null}
              status={files[doc.key] ? 'pending' : 'empty'}
              onPress={() => pickDocument(doc.key)}
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
            <Text style={styles.nextText}>{saving ? 'Uploading...' : 'Next: Bank Details'}</Text>
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
