import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ScrollView, StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { alertError } from '@utils/errors';
import { api } from '@utils/api';
import { timeAgo } from '@utils/normalize';
import EmptyState from '@components/EmptyState';
import ScreenHeader from '@components/ScreenHeader';
import LoadingScreen from '@components/LoadingScreen';
import BottomSheet from '@components/BottomSheet';
import TextField from '@components/TextField';
import Button from '@components/Button';

const CATEGORIES = ['Payment Issue', 'Booking Problem', 'App Issue', 'Verification', 'Other'];

const STATUS = {
  OPEN:        { tone: 'warning',         label: 'Open' },
  IN_PROGRESS: { tone: 'info',            label: 'In progress' },
  RESOLVED:    { tone: 'success',         label: 'Resolved' },
  CLOSED:      { tone: 'mutedForeground', label: 'Closed' },
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
  const loadedOnce = useRef(false);

  const fetchTickets = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/support/tickets', token);
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.warn('[Support] fetch failed:', e.message);
    }
  }, [token]);

  // Spinner only on the first load; coming back from a ticket refreshes quietly.
  useFocusEffect(
    useCallback(() => {
      if (!loadedOnce.current) setLoading(true);
      fetchTickets().finally(() => { loadedOnce.current = true; setLoading(false); });
    }, [fetchTickets])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  }, [fetchTickets]);

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      Alert.alert('Required', 'Please fill in the subject and description.');
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

  const newTicketButton = (
    <TouchableOpacity
      onPress={() => setShowModal(true)}
      hitSlop={8}
      style={styles.headerBtn}
      accessibilityRole="button"
      accessibilityLabel="New ticket"
    >
      <Ionicons name="add" size={26} color={Colors.primary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      {loading ? <LoadingScreen overlay /> : null}
      <ScreenHeader back title="Help and support" right={newTicketButton} />

      {loading ? null : (
        <FlatList
          data={tickets}
          keyExtractor={item => String(item.ticket_id ?? item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="No tickets yet"
              subtitle="Raise a ticket and our team will get back to you."
              cta={{ label: 'New ticket', onPress: () => setShowModal(true) }}
            />
          }
          renderItem={({ item }) => {
            const status = STATUS[item.status] ?? { tone: 'mutedForeground', label: item.status };
            const color = Colors[status.tone];
            return (
              <TouchableOpacity
                style={[styles.ticket, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
                onPress={() => router.push(`/support/${item.ticket_id}`)}
                activeOpacity={0.75}
              >
                <View style={styles.ticketRow}>
                  <Text style={[styles.ticketSubject, { color: Colors.foreground }]} numberOfLines={1}>
                    {item.subject}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: color + '1F' }]}>
                    <Text style={[styles.statusText, { color }]}>{status.label}</Text>
                  </View>
                </View>
                <View style={styles.ticketRow}>
                  <Text style={[styles.ticketCat, { color: Colors.mutedForeground }]} numberOfLines={1}>
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
      )}

      <BottomSheet visible={showModal} onClose={() => setShowModal(false)} dismissible={!submitting}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheet} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sheetTitle, { color: Colors.foreground }]}>New ticket</Text>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: Colors.mutedForeground }]}>Category</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map(c => {
                const active = category === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.catChip, { backgroundColor: active ? Colors.primary : Colors.surfaceRaised, borderColor: active ? Colors.primary : Colors.border }]}
                    onPress={() => setCategory(c)}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.catChipText, { color: active ? Colors.onPrimary : Colors.foreground }]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TextField
            label="Subject"
            placeholder="Brief summary of your issue"
            value={subject}
            onChangeText={setSubject}
            maxLength={100}
          />
          <TextField
            label="Description"
            placeholder="Describe your issue in detail"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={1000}
            hint={`${description.length}/1000`}
          />

          <Button title="Submit ticket" onPress={handleSubmit} loading={submitting} />
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  headerBtn:     { width: 40, height: 40, marginRight: -Spacing.sm, justifyContent: 'center', alignItems: 'center' },
  list:          { padding: Spacing.base, paddingTop: Spacing.xs, gap: Spacing.sm, paddingBottom: Spacing.xl3, flexGrow: 1 },
  ticket:        { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base, gap: Spacing.sm },
  ticketRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  ticketSubject: { flex: 1, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  statusBadge:   { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  statusText:    { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  ticketCat:     { flex: 1, fontSize: FontSize.xs },
  sheet:         { gap: Spacing.base, paddingBottom: Spacing.xs },
  sheetTitle:    { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  field:         { gap: Spacing.sm - 2 },
  fieldLabel:    { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  categoryRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  catChip:       { borderRadius: Radius.full, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.md, paddingVertical: 8 },
  catChipText:   { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});
