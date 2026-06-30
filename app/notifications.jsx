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

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: Colors.foreground }]}>Notifications</Text>
      </View>

      <FlatList
        data={notifs}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading
            ? <EmptyState icon="notifications-outline" title="All caught up" subtitle="Your notifications will appear here" />
            : null
        }
        renderItem={({ item }) => (
          <View style={[
            styles.item,
            {
              backgroundColor: item.read ? Colors.surface : Colors.primary + '10',
              borderColor: item.read ? Colors.border : Colors.primary + '30',
            },
          ]}>
            <View style={[styles.iconWrap, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <View style={styles.body}>
              <Text style={[styles.notifTitle, { color: Colors.foreground }]}>{item.title}</Text>
              <Text style={[styles.notifBody, { color: Colors.mutedForeground }]} numberOfLines={2}>{item.body}</Text>
              <Text style={[styles.time, { color: Colors.subtleForeground }]}>{item.time}</Text>
            </View>
            {!item.read && <View style={[styles.unreadDot, { backgroundColor: Colors.primary }]} />}
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  header:     { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, gap: Spacing.md },
  title:      { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  list:       { padding: Spacing.base, gap: Spacing.sm, paddingBottom: 40 },
  item:       { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base },
  iconWrap:   { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  body:       { flex: 1, gap: 3 },
  notifTitle: { fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  notifBody:  { fontSize: FontSize.sm, lineHeight: 20 },
  time:       { fontSize: FontSize.xs },
  unreadDot:  { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
});
