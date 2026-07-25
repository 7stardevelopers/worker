import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';

export default function BookingChatScreen() {
  const { Colors }               = useTheme();
  const { token, user }          = useAuth();
  const { bookingId, customerName } = useLocalSearchParams();

  const [messages,  setMessages]  = useState([]);
  const [text,      setText]      = useState('');
  const [sending,   setSending]   = useState(false);
  const [loading,   setLoading]   = useState(true);
  const listRef                   = useRef(null);
  const pollRef                   = useRef(null);

  const fetchMessages = useCallback(async () => {
    if (!token || !bookingId) return;
    try {
      const res = await api.get(`/bookings/${bookingId}/messages`, token);
      const raw = Array.isArray(res.data) ? res.data : [];
      setMessages(raw);
    } catch (e) {
      console.warn('[Chat] fetch failed:', e.message);
    } finally {
      setLoading(false);
    }
  }, [token, bookingId]);

  useEffect(() => {
    fetchMessages();
    // Poll every 4 seconds for new messages
    pollRef.current = setInterval(fetchMessages, 4000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    try {
      await api.post(`/bookings/${bookingId}/messages`, { text: trimmed }, token);
      await fetchMessages();
    } catch (e) {
      console.warn('[Chat] send failed:', e.message);
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMine = item.from_id === user?.user_id;
    return (
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <View style={[
          styles.bubbleInner,
          isMine
            ? { backgroundColor: Colors.primary, borderBottomRightRadius: 4 }
            : { backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1, borderBottomLeftRadius: 4 },
        ]}>
          <Text style={[styles.bubbleText, { color: isMine ? '#FFF' : Colors.foreground }]}>
            {item.text}
          </Text>
          <Text style={[styles.bubbleTime, { color: isMine ? 'rgba(255,255,255,0.6)' : Colors.mutedForeground }]}>
            {new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: Colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: Colors.foreground }]} numberOfLines={1}>
            {customerName ?? 'Customer'}
          </Text>
          <Text style={[styles.headerSub, { color: Colors.mutedForeground }]}>Booking Chat</Text>
        </View>
        <View style={[styles.headerAvatar, { backgroundColor: Colors.primary + '20' }]}>
          <Ionicons name="person-outline" size={18} color={Colors.primary} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="chatbubbles-outline" size={48} color={Colors.border} />
            <Text style={[styles.emptyText, { color: Colors.mutedForeground }]}>
              No messages yet. Say hello!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={item => item.message_id}
            renderItem={renderMessage}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input */}
        <View style={[styles.inputRow, { backgroundColor: Colors.surface, borderTopColor: Colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: Colors.background, borderColor: Colors.border, color: Colors.foreground }]}
            placeholder="Type a message…"
            placeholderTextColor={Colors.mutedForeground}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: text.trim() ? Colors.primary : Colors.border, opacity: sending ? 0.6 : 1 }]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
            activeOpacity={0.8}
          >
            {sending
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Ionicons name="send" size={18} color="#FFF" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },

  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, gap: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:      { width: 36, height: 36, justifyContent: 'center' },
  headerInfo:   { flex: 1 },
  headerName:   { fontSize: FontSize.body, fontWeight: FontWeight.bold },
  headerSub:    { fontSize: FontSize.xs, marginTop: 1 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  centered:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  emptyText:    { fontSize: FontSize.sm, textAlign: 'center' },

  list:         { paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, gap: Spacing.sm },

  bubble:       { flexDirection: 'row', marginBottom: 4 },
  bubbleMine:   { justifyContent: 'flex-end' },
  bubbleTheirs: { justifyContent: 'flex-start' },
  bubbleInner:  { maxWidth: '75%', borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: 3 },
  bubbleText:   { fontSize: FontSize.sm, lineHeight: 20 },
  bubbleTime:   { fontSize: 10, alignSelf: 'flex-end' },

  inputRow:     { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, padding: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  input:        { flex: 1, borderRadius: Radius.lg, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.sm, maxHeight: 100 },
  sendBtn:      { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
});
