import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, Modal,
  StyleSheet, Alert, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { FontSize, FontWeight, Spacing, Radius, Shadow } from '@constants/theme';
import { alertError } from '@utils/errors';
import { api } from '@utils/api';
import { timeAgo } from '@utils/normalize';
import EmptyState from '@components/EmptyState';

const CATEGORIES = ['Payment Issue', 'Booking Problem', 'App Issue', 'Verification', 'Other'];

const STATUS_COLOR = {
  OPEN:        '#F59E0B',
  IN_PROGRESS: '#3B82F6',
  RESOLVED:    '#10B981',
  CLOSED:      'rgba(84,84,88,0.6)',
};

export default function SupportScreen() {
  const { Colors } = useTheme();
  const { token } = useAuth();

  const [tickets,     setTickets]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [showModal,   setShowModal]   = useState(false);
  const [category,    setCategory]    = useState(CATEGORIES[0]);
  const [subject,     setSubject]     = useState('');
  const [description, setDescription] = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/support/tickets', token);
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.warn('[Support] fetch failed:', e.message);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchTickets().finally(() => setLoading(false));
    }, [fetchTickets])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  }, [fetchTickets]);

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      Alert.alert('Required', 'Please fill in the subject and description');
      return;
    }
    if (subject.trim().length < 5) {
      Alert.alert('Subject too short', 'Please describe the issue in at least 5 characters.');
      return;
    }
    setSubmitting(true);
    try {
      // The ticket API has no description field — it stores the subject only —
      // so the details go in as the ticket's first message.
      const created = await api.post('/support/tickets', { category, subject: subject.trim() }, token);
      await api.post(`/support/tickets/${created.data.ticket_id}/messages`, { content: description.trim() }, token);
      setShowModal(false);
      setSubject('');
      setDescription('');
      setCategory(CATEGORIES[0]);
      fetchTickets();
      router.push(`/support/${created.data.ticket_id}`);
    } catch (e) {
      alertError('Error', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: Colors.foreground }]}>Support</Text>
        <TouchableOpacity onPress={() => setShowModal(true)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Raise a new ticket">
          <Ionicons name="add-circle-outline" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={tickets}
        keyExtractor={item => String(item.ticket_id ?? item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading
            ? <EmptyState
                icon="headset-outline"
                title="No support tickets"
                subtitle="Tap + to raise a new ticket"
                cta={{ label: 'Raise Ticket', onPress: () => setShowModal(true) }}
              />
            : null
        }
        renderItem={({ item }) => {
          const statusColor = STATUS_COLOR[item.status] ?? Colors.mutedForeground;
          return (
            <TouchableOpacity
              style={[styles.ticket, { backgroundColor: Colors.surface, borderColor: Colors.border }, Shadow.sm]}
              onPress={() => router.push(`/support/${item.ticket_id}`)}
              activeOpacity={0.85}
            >
              <View style={styles.ticketRow}>
                <Text style={[styles.ticketSubject, { color: Colors.foreground }]} numberOfLines={1}>
                  {item.subject}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{item.status.replace('_', ' ')}</Text>
                </View>
              </View>
              <View style={styles.ticketRow}>
                <Text style={[styles.ticketCat, { color: Colors.mutedForeground }]}>
                  {item.category} · {timeAgo(item.updated_at ?? item.created_at)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.subtleForeground} />
              </View>
            </TouchableOpacity>
          );
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
      />

      {/* New ticket modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: Colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: Colors.foreground }]}>Raise a Ticket</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={Colors.foreground} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: Colors.mutedForeground }]}>Category</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.catChip, { backgroundColor: category === c ? Colors.primary : Colors.surfaceRaised, borderColor: category === c ? Colors.primary : Colors.border }]}
                  onPress={() => setCategory(c)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.catChipText, { color: category === c ? '#FFF' : Colors.mutedForeground }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: Colors.mutedForeground }]}>Subject</Text>
            <TextInput
              style={[styles.input, { backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.foreground }]}
              placeholder="Brief summary of your issue"
              placeholderTextColor={Colors.subtleForeground}
              value={subject}
              onChangeText={setSubject}
              maxLength={100}
            />

            <Text style={[styles.fieldLabel, { color: Colors.mutedForeground }]}>Description</Text>
            <TextInput
              style={[styles.textarea, { backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.foreground }]}
              placeholder="Describe your issue in detail..."
              placeholderTextColor={Colors.subtleForeground}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={1000}
            />

            <TouchableOpacity
              style={[styles.submitBtn, { opacity: !submitting ? 1 : 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <LinearGradient colors={Colors.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitGrad}>
                <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit Ticket'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.base },
  title:        { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  list:         { padding: Spacing.base, gap: Spacing.sm, paddingBottom: 40 },
  ticket:       { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base, gap: Spacing.sm },
  ticketRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  ticketSubject:{ flex: 1, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  statusBadge:  { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  statusText:   { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  ticketCat:    { fontSize: FontSize.xs },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet:   { borderTopLeftRadius: Radius.xl2, borderTopRightRadius: Radius.xl2, padding: Spacing.base, paddingBottom: 40, gap: Spacing.md },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle:   { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  fieldLabel:   { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  categoryRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  catChip:      { borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  catChipText:  { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  input:        { borderRadius: Radius.md, borderWidth: 1.5, height: 50, paddingHorizontal: Spacing.md, fontSize: FontSize.body },
  textarea:     { borderRadius: Radius.md, borderWidth: 1.5, padding: Spacing.md, fontSize: FontSize.body, minHeight: 110 },
  submitBtn:    { borderRadius: Radius.lg, overflow: 'hidden', height: 54 },
  submitGrad:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
  submitText:   { color: '#FFF', fontSize: FontSize.body, fontWeight: FontWeight.bold },
});
