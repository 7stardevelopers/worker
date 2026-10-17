import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { FontSize, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';
import OnboardingHeader from '@components/OnboardingHeader';
import DocumentUploadCard from '@components/DocumentUploadCard';
import LoadingScreen from '@components/LoadingScreen';
import FooterBar from '@components/FooterBar';
import Button from '@components/Button';

const DOCS = [
  { key: 'aadhaar_front', title: 'Aadhaar (front)', subtitle: 'Front side of your Aadhaar card' },
  { key: 'aadhaar_back',  title: 'Aadhaar (back)',  subtitle: 'Back side of your Aadhaar card'  },
  { key: 'pan',           title: 'PAN card',        subtitle: 'A clear photo of your PAN card'  },
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

  const allPicked = DOCS.every(d => files[d.key]);

  const handleNext = async () => {
    const missing = DOCS.filter(d => !files[d.key]);
    if (missing.length > 0) {
      Alert.alert('Required', `Please add: ${missing.map(d => d.title).join(', ')}`);
      return;
    }
    setSaving(true);
    try {
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
      setSaving(false);
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploadStatus('');
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <OnboardingHeader step={3} title="Documents" subtitle="Needed to verify your identity." />

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

        <View style={styles.note}>
          <Ionicons name="lock-closed-outline" size={14} color={Colors.mutedForeground} />
          <Text style={[styles.noteText, { color: Colors.mutedForeground }]}>
            Documents are encrypted and reviewed within 24 hours.
          </Text>
        </View>
      </ScrollView>

      <FooterBar>
        <Button title="Upload and continue" onPress={handleNext} disabled={!allPicked} loading={saving} />
      </FooterBar>

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
