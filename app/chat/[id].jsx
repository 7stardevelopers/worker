import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { api } from '@utils/api';
import { alertError } from '@utils/errors';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';

const WSS_URL = process.env.EXPO_PUBLIC_WSS_URL ?? null;
const POLL_MS = 4000;
const QUICK_REPLIES = [
  "I'm on my way",
  'Reached your location',
  'Running 10 minutes late, sorry',
  'Please share the door OTP when I arrive',
  'Work is complete, please check',
];

const toMessage = (m, myId) => ({
  id:     m.message_id,
  text:   m.text,
  sentAt: m.created_at,
  isOwn:  m.from_id === myId,
});

function timeLabel(iso) {
  return iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '';
}

export default function ChatScreen() {
  const { id, name } = useLocalSearchParams();
  const { Colors } = useTheme();
  const { token, user } = useAuth();
  const myId = user?.user_id;
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [connected, setConnected] = useState(false);
  const [loading,   setLoading]   = useState(true);
  const listRef = useRef(null);

  // Merge by id so poll results, socket frames and optimistic sends never duplicate.
  const merge = useCallback(incoming => {
    setMessages(prev => {
      const map = new Map(prev.map(m => [m.id, m]));
      incoming.forEach(m => map.set(m.id, m));
      return [...map.values()].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/bookings/${id}/messages`, token);
      merge((res.data ?? []).map(m => toMessage(m, myId)));
    } catch { /* keep what we have; the next poll retries */ }
    finally { setLoading(false); }
  }, [id, token, myId, merge]);

  useEffect(() => { load(); }, [load]);

  // Live delivery over the booking socket.
  useEffect(() => {
    if (!WSS_URL || !token) return undefined;
    let ws = null;
    let closed = false;
    const connect = () => {
      ws = new WebSocket(`${WSS_URL}?token=${token}`);
      ws.onopen = () => {
        setConnected(true);
        ws.send(JSON.stringify({ action: 'joinBooking', booking_id: id }));
      };
      ws.onmessage = e => {
        try {
          const data = JSON.parse(e.data);
          if (data.message_type === 'chat' && data.booking_id === id) {
            merge([toMessage(data, myId)]);
            if (data.from_id !== myId) Haptics.selectionAsync().catch(() => {});
          }
        } catch {}
      };
      ws.onclose = () => { setConnected(false); if (!closed) setTimeout(() => !closed && connect(), 3000); };
      ws.onerror = () => setConnected(false);
    };
    connect();
    return () => { closed = true; ws?.close(); };
  }, [id, token, myId, merge]);

  // Polling fallback whenever the socket is down (and catch-up on foreground).
  useEffect(() => {
    if (connected) return undefined;
    const timer = setInterval(load, POLL_MS);
    const sub = AppState.addEventListener('change', s => { if (s === 'active') load(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [connected, load]);

  useEffect(() => {
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);

  const send = async (text) => {
    const body = text.trim();
    if (!body) return;
    setInput('');
    const tempId = `local-${Date.now()}`;
    merge([{ id: tempId, text: body, sentAt: new Date().toISOString(), isOwn: true, pending: true }]);
    try {
      const res = await api.post(`/bookings/${id}/messages`, { text: body, message_type: 'text' }, token);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      merge([toMessage(res.data, myId)]);
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInput(body);
      alertError('Message not sent', e);
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.bubbleRow, item.isOwn && styles.bubbleRowOwn]}>
      <View style={[
        styles.bubble,
        item.isOwn
          ? { backgroundColor: Colors.primary, borderBottomRightRadius: 4 }
          : { backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: StyleSheet.hairlineWidth, borderBottomLeftRadius: 4 },
      ]}>
        <Text style={[styles.bubbleText, { color: item.isOwn ? '#FFF' : Colors.foreground }]}>{item.text}</Text>
        <View style={styles.bubbleMeta}>
          <Text style={[styles.time, { color: item.isOwn ? 'rgba(255,255,255,0.7)' : Colors.subtleForeground }]}>{timeLabel(item.sentAt)}</Text>
          {item.isOwn && <Ionicons name={item.pending ? 'time-outline' : 'checkmark-done'} size={12} color="rgba(255,255,255,0.7)" />}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: Colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.avatar, { backgroundColor: Colors.primary + '20' }]}>
          <Text style={[styles.avatarText, { color: Colors.primary }]}>{(name ?? 'C')[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: Colors.foreground }]} numberOfLines={1}>{name ?? 'Customer'}</Text>
          <Text style={[styles.sub, { color: connected ? Colors.success : Colors.mutedForeground }]}>
            {connected ? 'Live' : 'Updates every few seconds'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, messages.length === 0 && styles.listEmpty]}
          ListEmptyComponent={!loading ? (
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={40} color={Colors.subtleForeground} />
              <Text style={[styles.emptyText, { color: Colors.mutedForeground }]}>
                Message the customer about timing, access or the job.
              </Text>
            </View>
          ) : null}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow} keyboardShouldPersistTaps="handled">
          {QUICK_REPLIES.map(q => (
            <TouchableOpacity key={q} onPress={() => send(q)} style={[styles.quick, { borderColor: Colors.primary + '40', backgroundColor: Colors.primary + '10' }]}>
              <Text style={[styles.quickText, { color: Colors.primary }]}>{q}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[styles.inputRow, { borderTopColor: Colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.foreground }]}
            placeholder="Type a message"
            placeholderTextColor={Colors.subtleForeground}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: input.trim() ? Colors.primary : Colors.border }]}
            onPress={() => send(input)}
            disabled={!input.trim()}
            accessibilityLabel="Send message"
          >
            <Ionicons name="send" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  back:         { width: 32 },
  avatar:       { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: FontSize.body, fontWeight: FontWeight.bold },
  name:         { fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  sub:          { fontSize: FontSize.xs, marginTop: 1 },
  list:         { padding: Spacing.base, gap: Spacing.sm },
  listEmpty:    { flexGrow: 1, justifyContent: 'center' },
  empty:        { alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl },
  emptyText:    { fontSize: FontSize.sm, textAlign: 'center' },
  bubbleRow:    { flexDirection: 'row' },
  bubbleRowOwn: { justifyContent: 'flex-end' },
  bubble:       { maxWidth: '80%', borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: 2 },
  bubbleText:   { fontSize: FontSize.body, lineHeight: 20 },
  bubbleMeta:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  time:         { fontSize: 10 },
  quickRow:     { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, gap: Spacing.sm },
  quick:        { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 7 },
  quickText:    { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  inputRow:     { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, padding: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  input:        { flex: 1, borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: 10, maxHeight: 110, fontSize: FontSize.body },
  sendBtn:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
