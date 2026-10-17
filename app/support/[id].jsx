import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { api } from '@utils/api';
import { alertError, friendlyError } from '@utils/errors';
import ScreenHeader from '@components/ScreenHeader';
import LoadingScreen from '@components/LoadingScreen';
import EmptyState from '@components/EmptyState';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';

const POLL_MS = 10000;
const CLOSED = ['RESOLVED', 'CLOSED'];
const STATUS_COLOR_KEY = { OPEN: 'warning', IN_PROGRESS: 'info', RESOLVED: 'success', CLOSED: 'mutedForeground' };

function stamp(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`;
}

/** One support ticket as a conversation with the support team. */
export default function TicketScreen() {
  const { id } = useLocalSearchParams();
  const { Colors } = useTheme();
  const { token, user } = useAuth();
  const [ticket,  setTicket]  = useState(null);
  const [error,   setError]   = useState(null);
  const [input,   setInput]   = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/support/tickets/${id}`, token);
      setTicket(res.data);
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [id, token]);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS); // support replies arrive without a push here
    return () => clearInterval(timer);
  }, [load]);

  const messages = (ticket?.messages ?? []).filter(m => !m.is_internal);

  useEffect(() => {
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);

  const send = async () => {
    const content = input.trim();
    if (!content) return;
    setSending(true);
    try {
      await api.post(`/support/tickets/${id}/messages`, { content }, token);
      setInput('');
      await load();
    } catch (e) {
      alertError('Message not sent', e);
    } finally {
      setSending(false);
    }
  };

  const statusLabel = ticket
    ? ticket.status.charAt(0) + ticket.status.slice(1).toLowerCase().replace('_', ' ')
    : '';
  const header = (
    <View style={[styles.header, { borderBottomColor: Colors.border }]}>
      <ScreenHeader
        back
        title={ticket?.subject ?? 'Support'}
        subtitle={ticket ? `${statusLabel} · #${String(id).slice(0, 8).toUpperCase()}` : undefined}
        right={ticket ? <View style={[styles.statusDot, { backgroundColor: Colors[STATUS_COLOR_KEY[ticket.status]] ?? Colors.mutedForeground }]} /> : null}
      />
    </View>
  );

  if (!ticket) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top', 'bottom']}>
        {error ? null : <LoadingScreen overlay />}
        {header}
        {error ? (
          <View style={styles.center}>
            <EmptyState icon="alert-circle-outline" title="Couldn't load this ticket"
              subtitle={friendlyError(error) ?? ''} cta={{ label: 'Try again', onPress: load }} />
          </View>
        ) : null}
      </SafeAreaView>
    );
  }

  const closed = CLOSED.includes(ticket.status);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top', 'bottom']}>
      {header}
      {/* Padding on both platforms: Android is edge-to-edge, so the window no longer resizes for the keyboard. */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.message_id}
          contentContainerStyle={styles.list}
          ListFooterComponent={messages.every(m => m.sender_id === user?.user_id) && !closed ? (
            <Text style={[styles.waiting, { color: Colors.mutedForeground }]}>
              Our support team usually replies within a few hours.
            </Text>
          ) : null}
          renderItem={({ item }) => {
            const own = item.sender_id === user?.user_id;
            return (
              <View style={[styles.row, own && styles.rowOwn]}>
                <View style={[
                  styles.bubble,
                  own
                    ? { backgroundColor: Colors.primary, borderBottomRightRadius: 4 }
                    : { backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: StyleSheet.hairlineWidth, borderBottomLeftRadius: 4 },
                ]}>
                  {!own && <Text style={[styles.sender, { color: Colors.primary }]}>{item.sender_name ?? 'Support'}</Text>}
                  <Text style={[styles.text, { color: own ? Colors.onPrimary : Colors.foreground }]}>{item.content}</Text>
                  <Text style={[styles.time, { color: own ? Colors.onPrimary + 'B3' : Colors.subtleForeground }]}>{stamp(item.created_at)}</Text>
                </View>
              </View>
            );
          }}
        />
        {closed ? (
          <View style={[styles.closedBar, { borderTopColor: Colors.border }]}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={[styles.closedText, { color: Colors.mutedForeground }]}>
              This ticket is {ticket.status.toLowerCase()}. Raise a new ticket if you still need help.
            </Text>
          </View>
        ) : (
          <View style={[styles.inputRow, { borderTopColor: Colors.border }]}>
            <TextInput
              style={[styles.input, { backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.foreground }]}
              placeholder="Write a reply"
              placeholderTextColor={Colors.subtleForeground}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: input.trim() && !sending ? Colors.primary : Colors.border }]}
              onPress={send}
              disabled={!input.trim() || sending}
              accessibilityRole="button"
              accessibilityLabel="Send reply"
            >
              <Ionicons name="send" size={18} color={Colors.onPrimary} />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  flex:       { flex: 1 },
  center:     { flex: 1, justifyContent: 'center' },
  header:     { borderBottomWidth: StyleSheet.hairlineWidth },
  statusDot:  { width: 8, height: 8, borderRadius: 4 },
  list:       { padding: Spacing.base, gap: Spacing.sm },
  waiting:    { fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.md },
  row:        { flexDirection: 'row' },
  rowOwn:     { justifyContent: 'flex-end' },
  bubble:     { maxWidth: '82%', borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: 3 },
  sender:     { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  text:       { fontSize: FontSize.body, lineHeight: 20 },
  time:       { fontSize: 10, alignSelf: 'flex-end' },
  inputRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, padding: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  input:      { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: 10, maxHeight: 110, fontSize: FontSize.body },
  sendBtn:    { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  closedBar:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.base, borderTopWidth: StyleSheet.hairlineWidth },
  closedText: { flex: 1, fontSize: FontSize.sm },
});
