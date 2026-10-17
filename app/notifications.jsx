import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';
import { normalizeNotification } from '@utils/normalize';
import EmptyState from '@components/EmptyState';
import ScreenHeader from '@components/ScreenHeader';
import LoadingScreen from '@components/LoadingScreen';
import { routeForNotification } from '@utils/notificationRouting';

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
      setLoading(true);
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
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon="notifications-outline" title="You're all caught up" subtitle="Notifications will appear here." />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              markRead(item);
              // A job notification opens the job, where it can be accepted.
              const target = routeForNotification(item.data);
              if (target && target !== '/notifications') router.push(target);
            }}
            activeOpacity={0.75}
            style={[styles.item, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
          >
            <Ionicons name={item.icon} size={20} color={item.read ? Colors.mutedForeground : Colors.primary} />
            <View style={styles.body}>
              <Text
                style={[styles.notifTitle, { color: Colors.foreground }, !item.read && styles.titleUnread]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text style={[styles.notifBody, { color: Colors.mutedForeground }]} numberOfLines={2}>{item.body}</Text>
              <Text style={[styles.time, { color: Colors.subtleForeground }]}>{item.time}</Text>
            </View>
            {item.data?.booking_id ? <Ionicons name="chevron-forward" size={16} color={Colors.subtleForeground} style={styles.chevron} /> : null}
            {!item.read && <View style={[styles.unreadDot, { backgroundColor: Colors.primary }]} />}
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
  root:       { flex: 1 },
  list:       { padding: Spacing.base, paddingTop: Spacing.xs, gap: Spacing.sm, paddingBottom: Spacing.xl3, flexGrow: 1 },
  item:       { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base },
  body:       { flex: 1, gap: 2 },
  notifTitle: { fontSize: FontSize.body, fontWeight: FontWeight.medium },
  titleUnread:{ fontWeight: FontWeight.semibold },
  notifBody:  { fontSize: FontSize.sm, lineHeight: 20 },
  time:       { fontSize: FontSize.xs },
  unreadDot:  { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  chevron:    { alignSelf: 'center' },
});
