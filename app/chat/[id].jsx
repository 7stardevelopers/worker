import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, AppState, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { api, getAccessToken } from '@utils/api';
import { alertError } from '@utils/errors';
import { setActiveChat, clearActiveChat } from '@utils/chatPresence';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';

const WSS_URL = process.env.EXPO_PUBLIC_WSS_URL ?? null;
const POLL_MS = 4000;          // while the socket is down
const SAFETY_POLL_MS = 15000;  // while connected — catches anything the socket missed
const PAGE_SIZE = 50;
const MAX_LENGTH = 1000;       // matches the backend limit
const CHAT_OPEN_STATUSES = ['ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS'];
// Once the job ends the chat is hidden (support can still read it).
const CHAT_ENDED_STATUSES = ['COMPLETED', 'CANCELLED', 'REJECTED'];
const QUICK_REPLIES = [
  "I'm on my way",
  'Reached your location',
  'Running 10 minutes late, sorry',
  'Please share the door OTP when I arrive',
  'Work is complete, please check',
];

const toMessage = (m, myId) => ({
  id:          m.message_id,
  text:        m.text,
  sentAt:      m.created_at,
  seenAt:      m.seen_at,
  deliveredAt: m.delivered_at,
  isOwn:       m.from_id === myId,
});

const newClientId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function timeLabel(iso) {
  return iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '';
}

const sortByTime = (a, b) => (new Date(a.sentAt) - new Date(b.sentAt)) || String(a.id).localeCompare(String(b.id));

export default function ChatScreen() {
  const { id, name } = useLocalSearchParams();
  const { Colors } = useTheme();
  const { token, user } = useAuth();
  const myId = user?.user_id;
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [connected, setConnected] = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [booking,   setBooking]   = useState(null);
  const [hasMore,   setHasMore]   = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [endedByServer, setEndedByServer] = useState(false);  // 403 — job ended mid-session
  const listRef = useRef(null);
  const wsRef = useRef(null);
  const skipAutoScroll = useRef(false);

  const customerName = name || booking?.customer_name || 'Customer';
  const isClosed = booking ? !CHAT_OPEN_STATUSES.includes(booking.status) : false;
  const isEnded = endedByServer || CHAT_ENDED_STATUSES.includes(booking?.status);
  useEffect(() => { if (isEnded) setMessages([]); }, [isEnded]);

  // While this screen is focused, its own new-message pushes are hidden.
  useFocusEffect(useCallback(() => {
    setActiveChat(id);
    return () => clearActiveChat(id);
  }, [id]));

  // Booking status (chat is read-only once the job is closed) + customer name
  // when opened from a notification.
  const loadBooking = useCallback(async () => {
    try {
      const res = await api.get(`/bookings/${id}`, token);
      setBooking(res.data ?? null);
    } catch { /* header falls back to the route param */ }
  }, [id, token]);
  useEffect(() => { loadBooking(); }, [loadBooking]);

  // Merge by id so poll results, socket frames and optimistic sends never duplicate.
  // A server copy carrying our client_id replaces the optimistic bubble.
  const merge = useCallback((incoming, clientId) => {
    setMessages(prev => {
      const map = new Map(prev.map(m => [m.id, m]));
      if (clientId) map.delete(clientId);
      incoming.forEach(m => map.set(m.id, { ...map.get(m.id), ...m }));
      return [...map.values()].sort(sortByTime);
    });
  }, []);

  // ── Read receipts ─────────────────────────────────────────────────────────
  const seenTimer = useRef(null);
  const markSeen = useCallback(() => {
    clearTimeout(seenTimer.current);
    seenTimer.current = setTimeout(() => {
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ action: 'markSeen', booking_id: id }));
      else api.post(`/bookings/${id}/messages/seen`, {}, token).catch(() => {});
    }, 600);
  }, [id, token]);
  useEffect(() => () => clearTimeout(seenTimer.current), []);

  const load = useCallback(async () => {
    if (isEnded) { setLoading(false); return; }
    try {
      const res = await api.get(`/bookings/${id}/messages?limit=${PAGE_SIZE}`, token);
      const list = (res.data ?? []).map(m => toMessage(m, myId));
      merge(list);
      setHasMore(prev => prev || list.length >= PAGE_SIZE);
      if (list.some(m => !m.isOwn && !m.seenAt)) markSeen();
    } catch (e) {
      if (e?.status === 403) setEndedByServer(true);
      /* otherwise keep what we have; the next poll retries */
    } finally { setLoading(false); }
  }, [id, token, myId, merge, markSeen, isEnded]);

  useEffect(() => { load(); }, [load]);

  const loadOlder = async () => {
    const first = messages.find(m => !String(m.id).startsWith('local-'));
    if (!first || loadingOlder) return;
    setLoadingOlder(true);
    skipAutoScroll.current = true;
    try {
      const res = await api.get(`/bookings/${id}/messages?limit=${PAGE_SIZE}&before=${encodeURIComponent(first.id)}`, token);
      const older = (res.data ?? []).map(m => toMessage(m, myId));
      merge(older);
      setHasMore(older.length >= PAGE_SIZE);
    } catch (e) {
      alertError("Couldn't load earlier messages", e);
    } finally {
      setLoadingOlder(false);
    }
  };

  // Live delivery over the booking socket.
  useEffect(() => {
    if (!WSS_URL || !token || isEnded) return undefined;
    let ws = null;
    let closed = false;
    const connect = async () => {
      // Use the latest stored token — the one captured here expires after 15 min.
      const current = (await getAccessToken()) || token;
      if (closed) return;
      ws = new WebSocket(`${WSS_URL}?token=${current}`);
      wsRef.current = ws;
      ws.onopen = () => {
        setConnected(true);
        ws.send(JSON.stringify({ action: 'joinBooking', booking_id: id }));
      };
      ws.onmessage = e => {
        try {
          const data = JSON.parse(e.data);
          if (String(data.booking_id) !== String(id)) return;
          if (data.message_type === 'chat' && data.message_id) {
            merge([toMessage(data, myId)], data.client_id);
            if (data.from_id !== myId) {
              Haptics.selectionAsync().catch(() => {});
              markSeen();
            }
          } else if (data.message_type === 'chat_seen') {
            setMessages(prev => prev.map(m => (m.isOwn && !m.seenAt && !m.pending ? { ...m, seenAt: data.seen_at } : m)));
          }
        } catch {}
      };
      ws.onclose = () => { setConnected(false); if (!closed) setTimeout(() => !closed && connect(), 3000); };
      ws.onerror = () => setConnected(false);
    };
    connect();
    return () => { closed = true; wsRef.current = null; ws?.close(); setConnected(false); };
  }, [id, token, myId, merge, markSeen, isEnded]);

  // Polling: fast while the socket is down, slow safety net while up; catch-up on foreground.
  useEffect(() => {
    if (isEnded) return undefined;
    const timer = setInterval(load, connected ? SAFETY_POLL_MS : POLL_MS);
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') { load(); loadBooking(); }
    });
    return () => { clearInterval(timer); sub.remove(); };
  }, [connected, load, loadBooking, isEnded]);

  useEffect(() => {
    if (skipAutoScroll.current) { skipAutoScroll.current = false; return; }
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);

  const send = async (text) => {
    const body = text.trim();
    if (!body || isClosed) return;
    setInput('');
    const clientId = newClientId();
    merge([{ id: clientId, text: body, sentAt: new Date().toISOString(), isOwn: true, pending: true }]);
    try {
      const res = await api.post(`/bookings/${id}/messages`, { text: body, message_type: 'text', client_id: clientId }, token);
      merge([toMessage(res.data, myId)], clientId);
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== clientId));
      setInput(body);
      alertError('Message not sent', e);
      loadBooking(); // the job may have just been closed
    }
  };

  // sending → sent ✓ → delivered ✓✓ → seen ✓✓ (green)
  const tickFor = item => {
    if (item.pending) return { name: 'time-outline', color: 'rgba(255,255,255,0.7)', label: 'Sending' };
    if (item.seenAt) return { name: 'checkmark-done', color: '#A7F3D0', label: 'Seen' };
    if (item.deliveredAt) return { name: 'checkmark-done', color: 'rgba(255,255,255,0.7)', label: 'Delivered' };
    return { name: 'checkmark', color: 'rgba(255,255,255,0.7)', label: 'Sent' };
  };

  const renderItem = ({ item }) => {
    const tick = item.isOwn ? tickFor(item) : null;
    return (
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
            {tick && <Ionicons name={tick.name} size={12} color={tick.color} accessibilityLabel={tick.label} />}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: Colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.avatar, { backgroundColor: Colors.primary + '20' }]}>
          <Text style={[styles.avatarText, { color: Colors.primary }]}>{customerName[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: Colors.foreground }]} numberOfLines={1}>{customerName}</Text>
          <Text style={[styles.sub, { color: connected && !isClosed ? Colors.success : Colors.mutedForeground }]}>
            {isEnded ? 'Chat ended' : isClosed ? 'Chat closed' : connected ? 'Live' : 'Updates every few seconds'}
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
          ListHeaderComponent={hasMore && messages.length > 0 ? (
            <TouchableOpacity onPress={loadOlder} disabled={loadingOlder} style={styles.olderBtn}
              accessibilityLabel="Load earlier messages">
              {loadingOlder
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <Text style={[styles.olderText, { color: Colors.primary }]}>Load earlier messages</Text>}
            </TouchableOpacity>
          ) : null}
          ListEmptyComponent={isEnded ? (
            <View style={styles.empty}>
              <Ionicons name="lock-closed-outline" size={40} color={Colors.subtleForeground} />
              <Text style={[styles.endedTitle, { color: Colors.foreground }]}>Chat has ended</Text>
              <Text style={[styles.emptyText, { color: Colors.mutedForeground }]}>
                Chat is only available while the job is active. For help with this job, contact support.
              </Text>
              <TouchableOpacity onPress={() => router.push('/support')} accessibilityRole="button"
                style={[styles.supportBtn, { backgroundColor: Colors.primary }]}>
                <Ionicons name="headset-outline" size={16} color="#FFF" />
                <Text style={styles.supportBtnText}>Contact support</Text>
              </TouchableOpacity>
            </View>
          ) : !loading ? (
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={40} color={Colors.subtleForeground} />
              <Text style={[styles.emptyText, { color: Colors.mutedForeground }]}>
                Message the customer about timing, access or the job.
              </Text>
            </View>
          ) : null}
        />

        {isEnded ? null : isClosed ? (
          <View style={[styles.closedBar, { borderTopColor: Colors.border }]}>
            <Ionicons name="lock-closed-outline" size={14} color={Colors.mutedForeground} />
            <Text style={[styles.closedText, { color: Colors.mutedForeground }]}>
              This job is {String(booking?.status ?? '').toLowerCase().replace('_', ' ')} — chat is read-only.
            </Text>
          </View>
        ) : (<>
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
            maxLength={MAX_LENGTH}
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
        </>)}
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
  olderBtn:     { alignSelf: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.base, minHeight: 36, justifyContent: 'center' },
  olderText:    { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  closedBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  closedText:   { fontSize: FontSize.sm },
  endedTitle:   { fontSize: FontSize.h3, fontWeight: FontWeight.bold },
  supportBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  supportBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
});
