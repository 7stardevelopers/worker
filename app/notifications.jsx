import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';
import { normalizeNotification } from '@utils/normalize';
import ScreenHeader from '@components/ScreenHeader';
import LoadingScreen from '@components/LoadingScreen';
import EmptyState from '@components/EmptyState';

export default function NotificationsScreen() {
  const { Colors } = useTheme();
  const { token } = useAuth();
  const [notifs,     setNotifs]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifs = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/notifications', token);
      const raw = Array.isArray(res.data) ? res.data : [];
      setNotifs(raw.map(normalizeNotification));
    } catch (e) {
      console.warn('[Notifications] fetch failed:', e.message);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifs().finally(() => setLoading(false));
    }, [fetchNotifs])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifs();
    setRefreshing(false);
  }, [fetchNotifs]);

  const markRead = useCallback(async (notif) => {
    if (notif.read) return;
    setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    try {
      await api.patch(`/notifications/${notif.id}/read`, {}, token);
    } catch {
      // non-fatal — local state already updated
    }
  }, [token]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      {loading ? <LoadingScreen overlay /> : null}
      <ScreenHeader back title="Notifications" />

      {loading ? null : (
        <FlatList
          data={notifs}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState icon="notifications-outline" title="You're all caught up" subtitle="Notifications will appear here." />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => markRead(item)}
              activeOpacity={0.75}
              style={[styles.item, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
            >
              <Ionicons name={item.icon} size={20} color={item.read ? Colors.mutedForeground : Colors.primary} />
              <View style={styles.body}>
                <Text
                  style={[styles.title, { color: Colors.foreground }, !item.read && styles.titleUnread]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text style={[styles.text, { color: Colors.mutedForeground }]} numberOfLines={2}>{item.body}</Text>
                <Text style={[styles.time, { color: Colors.subtleForeground }]}>{item.time}</Text>
              </View>
              {!item.read ? <View style={[styles.unreadDot, { backgroundColor: Colors.primary }]} /> : null}
            </TouchableOpacity>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  list:        { padding: Spacing.base, paddingTop: Spacing.xs, gap: Spacing.sm, flexGrow: 1 },
  item:        { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base },
  body:        { flex: 1, gap: 2 },
  title:       { fontSize: FontSize.body, fontWeight: FontWeight.medium },
  titleUnread: { fontWeight: FontWeight.semibold },
  text:        { fontSize: FontSize.sm, lineHeight: 19 },
  time:        { fontSize: FontSize.xs, marginTop: 2 },
  unreadDot:   { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
