import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { FontSize, FontWeight, Spacing, Radius, Shadow } from '@constants/theme';
import { alertError } from '@utils/errors';
import { formatINR, MIN_PAYOUT } from '@utils/money';
import { api } from '@utils/api';
import { normalizeEarning } from '@utils/normalize';
import EarningsChart from '@components/EarningsChart';
import EmptyState from '@components/EmptyState';
import Skeleton from '@components/Skeleton';

const TYPE_CONFIG = {
  BOOKING:   { icon: 'briefcase-outline', color: '#10B981', sign: '+' },
  TIP:       { icon: 'gift-outline',       color: '#F59E0B', sign: '+' },
  BONUS:     { icon: 'star-outline',       color: '#6366F1', sign: '+' },
  DEDUCTION: { icon: 'remove-circle-outline', color: '#EF4444', sign: '-' },
};

export default function EarningsScreen() {
  const { Colors } = useTheme();
  const { token } = useAuth();
  const { profile, fetchProfile } = useProvider();

  const [earnings,   setEarnings]   = useState([]);
  const [chartData,  setChartData]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requesting, setRequesting] = useState(false);
  // Balance minus payouts already requested — falls back to the raw wallet
  // balance until /providers/me/earnings has loaded.
  const [availableBalance, setAvailableBalance] = useState(null);

  const walletBalance = profile?.wallet_balance ?? 0;
  const withdrawable  = availableBalance ?? walletBalance;
  const bankLast4     = (profile?.bank_account_number ?? '').slice(-4);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [profileRes, earningsRes] = await Promise.all([
        fetchProfile(),
        api.get('/providers/me/earnings', token),
      ]);
      const raw = Array.isArray(earningsRes?.data?.items) ? earningsRes.data.items : [];
      setEarnings(raw.map(normalizeEarning));
      const available = Number(earningsRes?.data?.stats?.available_balance);
      setAvailableBalance(Number.isFinite(available) ? available : null);

      // build 7-day chart data
      const today = new Date();
      const buckets = Array(7).fill(0);
      raw.forEach(e => {
        if (e.type === 'DEDUCTION') return;
        const d = new Date(e.created_at);
        const dayDiff = Math.floor((today - d) / 86400000);
        const slot = 6 - dayDiff;
        if (slot >= 0 && slot < 7) buckets[slot] += e.amount ?? 0;
      });
      setChartData(buckets);
    } catch (e) {
      console.warn('[Earnings] load failed:', e.message);
    }
  }, [token, fetchProfile]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handlePayoutRequest = () => {
    if (withdrawable < MIN_PAYOUT) {
      if (walletBalance >= MIN_PAYOUT) {
        Alert.alert('Payout Pending', 'Your earlier payout request is still being processed.');
        return;
      }
      Alert.alert('Minimum Payout', `Minimum payout amount is ${formatINR(MIN_PAYOUT)}`);
      return;
    }
    Alert.alert(
      'Request Payout',
      `Request payout of ${formatINR(withdrawable)} to account ****${bankLast4}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'default',
          onPress: async () => {
            setRequesting(true);
            try {
              await api.post('/payments/payout-request', { amount: withdrawable }, token);
              Alert.alert('Payout Requested', 'Your payout will be processed within 2-3 business days.');
              await load();
            } catch (e) {
              alertError('Payout failed', e);
            } finally {
              setRequesting(false);
            }
          },
        },
      ]
    );
  };

  const thisWeek  = earnings.filter(e => {
    const d = new Date(e.createdAt);
    const now = new Date();
    return (now - d) < 7 * 86400000 && e.type !== 'DEDUCTION';
  }).reduce((s, e) => s + e.amount, 0);

  const thisMonth = earnings.filter(e => {
    const d = new Date(e.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && e.type !== 'DEDUCTION';
  }).reduce((s, e) => s + e.amount, 0);

  const total = earnings.filter(e => e.type !== 'DEDUCTION').reduce((s, e) => s + e.amount, 0);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <FlatList
        data={loading ? [] : earnings}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={[styles.title, { color: Colors.foreground }]}>Earnings</Text>
            </View>

            {/* Wallet Card */}
            <View style={[styles.walletCard, Shadow.lg]}>
              <LinearGradient colors={['#6366F1', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.walletGrad}>
                <Text style={styles.walletLabel}>Wallet Balance</Text>
                <Text style={styles.walletAmount}>{formatINR(walletBalance, { decimals: 2 })}</Text>
                <TouchableOpacity
                  style={[styles.payoutBtn, { opacity: walletBalance >= MIN_PAYOUT && !requesting ? 1 : 0.5 }]}
                  onPress={handlePayoutRequest}
                  disabled={walletBalance < MIN_PAYOUT || requesting}
                  activeOpacity={0.85}
                >
                  <Ionicons name="send-outline" size={16} color="#6366F1" />
                  <Text style={styles.payoutText}>{requesting ? 'Requesting...' : 'Request Payout'}</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>

            {/* Summary Row */}
            <View style={styles.summaryRow}>
              {[
                { label: 'This Week',  value: thisWeek  },
                { label: 'This Month', value: thisMonth },
                { label: 'Total',      value: total     },
              ].map(s => (
                <View key={s.label} style={[styles.summaryCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                  <Text style={[styles.summaryLabel, { color: Colors.mutedForeground }]}>{s.label}</Text>
                  <Text style={[styles.summaryValue, { color: Colors.foreground }]}>{formatINR(s.value)}</Text>
                </View>
              ))}
            </View>

            <EarningsChart data={chartData} />

            <Text style={[styles.sectionTitle, { color: Colors.foreground }]}>Transactions</Text>
          </>
        }
        ListEmptyComponent={
          loading
            ? <View>{Array.from({ length: 5 }).map((_, i) => <Skeleton.BookingCard key={i} />)}</View>
            : <EmptyState icon="wallet-outline" title="No earnings yet" subtitle="Completed jobs will appear here" compact />
        }
        renderItem={({ item }) => {
          const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.BOOKING;
          return (
            <View style={[styles.row, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
              <View style={[styles.rowIcon, { backgroundColor: cfg.color + '15' }]}>
                <Ionicons name={cfg.icon} size={18} color={cfg.color} />
              </View>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowTitle, { color: Colors.foreground }]}>
                  {item.type.charAt(0) + item.type.slice(1).toLowerCase()}
                </Text>
                <Text style={[styles.rowTime, { color: Colors.mutedForeground }]}>{item.timeAgo}</Text>
              </View>
              <Text style={[styles.rowAmount, { color: item.type === 'DEDUCTION' ? Colors.error : Colors.success }]}>
                {cfg.sign}{formatINR(item.amount)}
              </Text>
            </View>
          );
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  list:         { paddingBottom: 100 },
  header:       { paddingHorizontal: Spacing.base, paddingVertical: Spacing.md },
  title:        { fontSize: FontSize.h1, fontWeight: FontWeight.bold },
  walletCard:   { marginHorizontal: Spacing.base, marginBottom: Spacing.base, borderRadius: Radius.xl, overflow: 'hidden' },
  walletGrad:   { padding: Spacing.xl, gap: Spacing.sm },
  walletLabel:  { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.sm },
  walletAmount: { color: '#FFF', fontSize: 40, fontWeight: FontWeight.bold, letterSpacing: -1 },
  payoutBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF', borderRadius: Radius.full, paddingHorizontal: Spacing.base, paddingVertical: 8, alignSelf: 'flex-start', marginTop: Spacing.sm },
  payoutText:   { color: '#6366F1', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  summaryRow:   { flexDirection: 'row', marginHorizontal: Spacing.base, marginBottom: Spacing.base, gap: Spacing.sm },
  summaryCard:  { flex: 1, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.md, alignItems: 'center', gap: 4 },
  summaryLabel: { fontSize: FontSize.xs },
  summaryValue: { fontSize: FontSize.body, fontWeight: FontWeight.bold },
  sectionTitle: { fontSize: FontSize.h3, fontWeight: FontWeight.bold, marginHorizontal: Spacing.base, marginTop: Spacing.base, marginBottom: Spacing.sm },
  row:          { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.base, marginBottom: Spacing.sm, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.md },
  rowIcon:      { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  rowInfo:      { flex: 1, gap: 3 },
  rowTitle:     { fontSize: FontSize.body, fontWeight: FontWeight.medium },
  rowTime:      { fontSize: FontSize.xs },
  rowAmount:    { fontSize: FontSize.body, fontWeight: FontWeight.bold },
});
