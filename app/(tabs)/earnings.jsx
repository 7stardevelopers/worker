import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';
import { normalizeEarning } from '@utils/normalize';
import { formatINR } from '@utils/format';
import ScreenHeader from '@components/ScreenHeader';
import EarningsChart from '@components/EarningsChart';
import EmptyState from '@components/EmptyState';
import LoadingScreen from '@components/LoadingScreen';
import Button from '@components/Button';

const MIN_PAYOUT = 10000; // paise

const TYPE_ICON = {
  BOOKING:   'briefcase-outline',
  TIP:       'gift-outline',
  BONUS:     'ribbon-outline',
  DEDUCTION: 'remove-circle-outline',
};

const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export default function EarningsScreen() {
  const { Colors } = useTheme();
  const { token } = useAuth();
  const { profile, fetchProfile } = useProvider();

  const [earnings,   setEarnings]   = useState([]);
  const [chartData,  setChartData]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const walletBalance = profile?.wallet_balance ?? 0;
  const bankLast4     = (profile?.bank_account_number ?? '').slice(-4);
  const canPayout     = walletBalance >= MIN_PAYOUT;

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [, earningsRes] = await Promise.all([
        fetchProfile(),
        api.get('/providers/me/earnings', token),
      ]);
      const raw = Array.isArray(earningsRes?.data?.items) ? earningsRes.data.items : [];
      setEarnings(raw.map(normalizeEarning));

      // 7 calendar-day buckets, oldest first, last bucket = today
      const today = startOfDay(new Date());
      const buckets = Array(7).fill(0);
      raw.forEach(e => {
        if (e.type === 'DEDUCTION' || !e.created_at) return;
        const dayDiff = Math.round((today - startOfDay(new Date(e.created_at))) / 86400000);
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
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handlePayoutRequest = () => {
    Alert.alert(
      'Request payout',
      `Transfer ${formatINR(walletBalance, { decimals: true })} to account ending ${bankLast4 || '----'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setRequesting(true);
            try {
              await api.post('/payments/payout-request', { amount: walletBalance }, token);
              Alert.alert('Payout requested', 'Your payout will be processed within 2-3 business days.');
              await fetchProfile();
            } catch (e) {
              Alert.alert('Error', e.message);
            } finally {
              setRequesting(false);
            }
          },
        },
      ]
    );
  };

  const now = new Date();
  const credits = earnings.filter(e => e.type !== 'DEDUCTION');
  const thisWeek = credits
    .filter(e => (now.getTime() - new Date(e.createdAt).getTime()) < 7 * 86400000)
    .reduce((s, e) => s + e.amount, 0);
  const thisMonth = credits
    .filter(e => {
      const d = new Date(e.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + e.amount, 0);
  const total = credits.reduce((s, e) => s + e.amount, 0);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <ScreenHeader large title="Earnings" />

      {loading ? (
        <LoadingScreen overlay />
      ) : (
        <FlatList
          data={earnings}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={[styles.wallet, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                <Text style={[styles.walletLabel, { color: Colors.mutedForeground }]}>Wallet balance</Text>
                <Text style={[styles.walletAmount, { color: Colors.foreground }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatINR(walletBalance, { decimals: true })}
                </Text>
                <Button
                  title="Request payout"
                  onPress={handlePayoutRequest}
                  disabled={!canPayout}
                  loading={requesting}
                  style={styles.payoutBtn}
                />
                {!canPayout ? (
                  <Text style={[styles.walletHint, { color: Colors.subtleForeground }]}>
                    Minimum payout is {formatINR(MIN_PAYOUT)}
                  </Text>
                ) : null}
              </View>

              <View style={styles.summaryRow}>
                {[
                  { label: 'This week',  value: thisWeek  },
                  { label: 'This month', value: thisMonth },
                  { label: 'All time',   value: total     },
                ].map(s => (
                  <View key={s.label} style={[styles.summaryCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    <Text style={[styles.summaryLabel, { color: Colors.mutedForeground }]} numberOfLines={1}>{s.label}</Text>
                    <Text style={[styles.summaryValue, { color: Colors.foreground }]} numberOfLines={1} adjustsFontSizeToFit>
                      {formatINR(s.value)}
                    </Text>
                  </View>
                ))}
              </View>

              <EarningsChart data={chartData} />

              <Text style={[styles.sectionTitle, { color: Colors.foreground }]}>Transactions</Text>
            </View>
          }
          ListEmptyComponent={
            <EmptyState icon="wallet-outline" title="No earnings yet" subtitle="Completed jobs will appear here." compact />
          }
          renderItem={({ item, index }) => {
            const isDeduction = item.type === 'DEDUCTION';
            const isFirst = index === 0;
            const isLast  = index === earnings.length - 1;
            return (
              <View
                style={[
                  styles.row,
                  { backgroundColor: Colors.surface, borderColor: Colors.border },
                  isFirst && styles.rowFirst,
                  isLast && styles.rowLast,
                  !isLast && { borderBottomColor: Colors.borderLight },
                ]}
              >
                <Ionicons name={TYPE_ICON[item.type] ?? TYPE_ICON.BOOKING} size={18} color={Colors.mutedForeground} />
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowTitle, { color: Colors.foreground }]}>
                    {item.type.charAt(0) + item.type.slice(1).toLowerCase()}
                  </Text>
                  <Text style={[styles.rowTime, { color: Colors.mutedForeground }]}>{item.timeAgo}</Text>
                </View>
                <Text style={[styles.rowAmount, { color: isDeduction ? Colors.error : Colors.success }]}>
                  {isDeduction ? '-' : '+'}{formatINR(item.amount)}
                </Text>
              </View>
            );
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  list:         { paddingTop: Spacing.xs, paddingBottom: Spacing.xl },
  listHeader:   { gap: Spacing.md },
  wallet:       { marginHorizontal: Spacing.base, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.lg, gap: Spacing.xs },
  walletLabel:  { fontSize: FontSize.sm },
  walletAmount: { fontSize: FontSize.display + 4, fontWeight: FontWeight.bold, letterSpacing: -0.5 },
  payoutBtn:    { marginTop: Spacing.md },
  walletHint:   { fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.xs },
  summaryRow:   { flexDirection: 'row', marginHorizontal: Spacing.base, gap: Spacing.sm },
  summaryCard:  { flex: 1, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.md, gap: Spacing.xs },
  summaryLabel: { fontSize: FontSize.xs },
  summaryValue: { fontSize: FontSize.h3, fontWeight: FontWeight.semibold },
  sectionTitle: { fontSize: FontSize.h3, fontWeight: FontWeight.semibold, marginHorizontal: Spacing.base, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  row:          { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.base, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  rowFirst:     { borderTopWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg },
  rowLast:      { borderBottomLeftRadius: Radius.lg, borderBottomRightRadius: Radius.lg },
  rowInfo:      { flex: 1, gap: 2 },
  rowTitle:     { fontSize: FontSize.body, fontWeight: FontWeight.medium },
  rowTime:      { fontSize: FontSize.xs },
  rowAmount:    { fontSize: FontSize.body, fontWeight: FontWeight.semibold },
});
