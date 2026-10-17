import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';
import ScreenHeader from '@components/ScreenHeader';
import LoadingScreen from '@components/LoadingScreen';
import EmptyState from '@components/EmptyState';
import BottomSheet from '@components/BottomSheet';
import TextField from '@components/TextField';
import Button from '@components/Button';

const CATEGORIES = ['Payment Issue', 'Booking Problem', 'App Issue', 'Verification', 'Other'];

const STATUS_LABEL = {
  OPEN:        'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED:    'Resolved',
  CLOSED:      'Closed',
};

export default function SupportScreen() {
  const { Colors } = useTheme();
  const { token } = useAuth();

  const [tickets,     setTickets]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [showSheet,   setShowSheet]   = useState(false);
  const [category,    setCategory]    = useState(CATEGORIES[0]);
  const [subject,     setSubject]     = useState('');
  const [description, setDescription] = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  const STATUS_COLOR = {
    OPEN:        Colors.warning,
    IN_PROGRESS: Colors.info,
    RESOLVED:    Colors.success,
    CLOSED:      Colors.mutedForeground,
  };

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
      Alert.alert('Required', 'Please fill in the subject and description.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/support/tickets', { category, subject: subject.trim(), description: description.trim() }, token);
      setShowSheet(false);
      setSubject('');
      setDescription('');
      setCategory(CATEGORIES[0]);
      await fetchTickets();
      Alert.alert('Ticket raised', 'Our support team will respond within 24 hours.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const newTicketBtn = (
    <Button title="New ticket" compact variant="secondary" onPress={() => setShowSheet(true)} />
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      {loading ? <LoadingScreen overlay /> : null}
      <ScreenHeader back title="Support" right={newTicketBtn} />

      {loading ? null : (
        <FlatList
          data={tickets}
          keyExtractor={item => String(item.ticket_id ?? item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="help-buoy-outline"
              title="No support tickets"
              subtitle="Having trouble? Raise a ticket and our team will get back to you."
              cta={{ label: 'Raise a ticket', onPress: () => setShowSheet(true) }}
            />
          }
          renderItem={({ item }) => {
            const statusColor = STATUS_COLOR[item.status] ?? Colors.mutedForeground;
            return (
              <View style={[styles.ticket, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                <View style={styles.ticketRow}>
                  <Text style={[styles.ticketSubject, { color: Colors.foreground }]} numberOfLines={1}>
                    {item.subject}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '1A' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.ticketCat, { color: Colors.mutedForeground }]}>{item.category}</Text>
                {item.admin_reply ? (
                  <View style={[styles.reply, { backgroundColor: Colors.surfaceRaised }]}>
                    <Text style={[styles.replyLabel, { color: Colors.mutedForeground }]}>Reply from support</Text>
                    <Text style={[styles.replyText, { color: Colors.foreground }]}>{item.admin_reply}</Text>
                  </View>
                ) : null}
              </View>
            );
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
          }
        />
      )}

      <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)} dismissible={!submitting}>
        <ScrollView
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sheetTitle, { color: Colors.foreground }]}>Raise a ticket</Text>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: Colors.mutedForeground }]}>Category</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map(c => {
                const active = category === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? Colors.primary : Colors.surfaceRaised,
                        borderColor: active ? Colors.primary : Colors.border,
                      },
                    ]}
                    onPress={() => setCategory(c)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, { color: active ? Colors.onPrimary : Colors.mutedForeground }]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TextField
            label="Subject"
            placeholder="Brief summary of the issue"
            value={subject}
            onChangeText={setSubject}
            maxLength={100}
          />

          <TextField
            label="Description"
            placeholder="Describe the issue in detail"
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
  list:          { padding: Spacing.base, paddingTop: Spacing.xs, gap: Spacing.sm, flexGrow: 1 },
  ticket:        { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base, gap: Spacing.xs },
  ticketRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  ticketSubject: { flex: 1, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  statusBadge:   { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  statusText:    { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  ticketCat:     { fontSize: FontSize.sm },
  reply:         { borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.xs, marginTop: Spacing.sm },
  replyLabel:    { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  replyText:     { fontSize: FontSize.sm, lineHeight: 20 },
  sheetContent:  { gap: Spacing.base, paddingBottom: Spacing.xs },
  sheetTitle:    { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  field:         { gap: Spacing.sm },
  fieldLabel:    { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  categoryRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip:          { borderRadius: Radius.full, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.md, height: 32, justifyContent: 'center' },
  chipText:      { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});
