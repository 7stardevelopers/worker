import React, { useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { useProvider } from '@context/provider';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { alertError } from '@utils/errors';
import { formatINR, fromPaise, toPaise, MIN_PAYOUT } from '@utils/money';
import { api } from '@utils/api';
import { normalizeEarning } from '@utils/normalize';
import EarningsChart from '@components/EarningsChart';
import EmptyState from '@components/EmptyState';
import ScreenHeader from '@components/ScreenHeader';
import LoadingScreen from '@components/LoadingScreen';
import Button from '@components/Button';
import RazorpayCheckoutModal from '@components/RazorpayCheckoutModal';
import { toast } from '@components/Toast';

// `tone` is a theme colour key, so light and dark mode both read well.
const TYPE_CONFIG = {
  BOOKING:           { label: 'Job earning',             icon: 'briefcase-outline',      tone: 'success', sign: '+' },
  TIP:               { label: 'Tip',                     icon: 'gift-outline',           tone: 'success', sign: '+' },
  BONUS:             { label: 'Bonus',                   icon: 'star-outline',           tone: 'success', sign: '+' },
  CANCEL_FEE:        { label: 'Cancellation fee',        icon: 'close-circle-outline',   tone: 'success', sign: '+' },
  CASH_FEE_REVERSAL: { label: 'Cash fee returned',       icon: 'refresh-outline',        tone: 'success', sign: '+' },
  DUES_PAID:         { label: 'Dues paid',               icon: 'checkmark-done-outline', tone: 'foreground', sign: '+' },
  PROMO_CREDIT:      { label: 'Discount paid by us',     icon: 'pricetag-outline',       tone: 'success', sign: '+' },
  CASH_FEE:          { label: 'Platform fee (cash job)', icon: 'cash-outline',           tone: 'error',   sign: '-' },
  PROMO_REVERSAL:    { label: 'Discount credit undone',  icon: 'pricetag-outline',       tone: 'error',   sign: '-' },
  DEDUCTION:         { label: 'Deduction',               icon: 'remove-circle-outline',  tone: 'error',   sign: '-' },
};
// Money taken off the wallet, and money that isn't income (paying dues) — kept out of the earnings totals.
const DEBIT_TYPES = ['DEDUCTION', 'CASH_FEE', 'PROMO_REVERSAL'];
const NOT_INCOME  = [...DEBIT_TYPES, 'DUES_PAID'];
const DAY_MS = 86400000;

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export default function EarningsScreen() {
  const { Colors } = useTheme();
  const { token, user } = useAuth();
  const { profile, fetchProfile } = useProvider();

  const [earnings,   setEarnings]   = useState([]);
  const [chartData,  setChartData]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requesting, setRequesting] = useState(false);
  // Balance minus payouts already requested (rupees) — falls back to the wallet
  // balance until /providers/me/earnings has loaded.
  const [availableBalance, setAvailableBalance] = useState(null);
  // Fees from cash jobs the worker owes (rupees); at the limit new jobs stop.
  const [dues,        setDues]        = useState(0);
  const [jobsBlocked, setJobsBlocked] = useState(false);
  const [nextPayout,  setNextPayout]  = useState(null);
  const [payingDues,  setPayingDues]  = useState(false);
  const [duesOrder,   setDuesOrder]   = useState(null);
  const loadedOnce = useRef(false);

  // The API returns paise; everything below is rupees.
  const walletBalance = fromPaise(profile?.wallet_balance);
  const withdrawable  = availableBalance ?? walletBalance;
  const bankLast4     = (profile?.bank_account_number ?? '').slice(-4);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [, earningsRes] = await Promise.all([
        fetchProfile(),
        api.get('/providers/me/earnings', token),
      ]);
      const raw = Array.isArray(earningsRes?.data?.items) ? earningsRes.data.items : [];
      const items = raw.map(normalizeEarning);
      setEarnings(items);
      const stats = earningsRes?.data?.stats ?? {};
      const available = Number(stats.available_balance);
      setAvailableBalance(Number.isFinite(available) ? fromPaise(available) : null);
      setDues(fromPaise(stats.dues ?? 0));
      setJobsBlocked(!!stats.jobs_blocked);
      setNextPayout(stats.next_payout_date ?? null);

      // 7 calendar days, oldest first; the last bucket is today.
      const today = startOfDay(new Date());
      const buckets = Array(7).fill(0);
      items.forEach(e => {
        if (NOT_INCOME.includes(e.type)) return;
        const dayDiff = Math.round((today - startOfDay(new Date(e.createdAt))) / DAY_MS);
        const slot = 6 - dayDiff;
        if (slot >= 0 && slot < 7) buckets[slot] += e.amount ?? 0;
      });
      setChartData(buckets);
    } catch (e) {
      console.warn('[Earnings] load failed:', e.message);
    }
  }, [token, fetchProfile]);

  // Spinner only on the first load; coming back to the tab refreshes quietly.
  useFocusEffect(
    useCallback(() => {
      if (!loadedOnce.current) setLoading(true);
      load().finally(() => { loadedOnce.current = true; setLoading(false); });
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handlePayoutRequest = () => {
    // The worker withdraws the full available amount (rupees); never more than the wallet holds.
    const amount = Math.min(withdrawable, walletBalance);
    if (amount < MIN_PAYOUT) {
      if (walletBalance >= MIN_PAYOUT) {
        Alert.alert('Payout pending', 'Your earlier payout request is still being processed.');
        return;
      }
      Alert.alert('Minimum payout', `The minimum payout is ${formatINR(MIN_PAYOUT)}.`);
      return;
    }
    Alert.alert(
      'Request payout',
      `Send ${formatINR(amount)} to the account ending ${bankLast4}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'default',
          onPress: async () => {
            setRequesting(true);
            try {
              // The backend takes paise.
              await api.post('/payments/payout-request', { amount: toPaise(amount) }, token);
              toast.success('Payout requested', 'It will be processed within 2-3 business days.');
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

  const startPayDues = async () => {
    setPayingDues(true);
    try {
      setDuesOrder(await api.post('/providers/me/dues/order', {}, token).then(r => r.data));
    } catch (e) {
      alertError('Could not start payment', e);
    } finally {
      setPayingDues(false);
    }
  };

  const handleDuesPaid = async (result) => {
    setDuesOrder(null);
    setPayingDues(true);
    try {
      await api.post('/providers/me/dues/verify', result, token);
      toast.success('Dues cleared', 'You can take new jobs again.');
    } catch (e) {
      alertError('Payment verification failed', e);
    } finally {
      setPayingDues(false);
      await load();
    }
  };

  const nextPayoutLabel = nextPayout
    ? new Date(`${nextPayout}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    : null;

  const now = new Date();
  const income = earnings.filter(e => !NOT_INCOME.includes(e.type));
  const thisWeek = income
    .filter(e => (now.getTime() - new Date(e.createdAt).getTime()) < 7 * DAY_MS)
    .reduce((s, e) => s + e.amount, 0);
  const thisMonth = income
    .filter(e => {
      const d = new Date(e.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + e.amount, 0);
  const total = income.reduce((s, e) => s + e.amount, 0);

  const canPayout = walletBalance >= MIN_PAYOUT;
  const duesTone = jobsBlocked ? Colors.error : Colors.warning;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      {loading ? <LoadingScreen overlay /> : null}
      <ScreenHeader large title="Earnings" />

      {loading ? null : (
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
                  {formatINR(walletBalance, { decimals: 2 })}
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
                {nextPayoutLabel ? (
                  <Text style={[styles.walletHint, { color: Colors.mutedForeground }]}>
                    Automatic payout every Mon and Thu. Next: {nextPayoutLabel}
                  </Text>
                ) : null}
              </View>

              {/* Dues from cash jobs: the worker keeps the cash and owes the platform fee. */}
              {dues > 0 && (
                <View style={[styles.dues, { backgroundColor: Colors.surface, borderColor: duesTone + '66' }]}>
                  <View style={styles.duesTop}>
                    <Ionicons name={jobsBlocked ? 'lock-closed-outline' : 'alert-circle-outline'} size={20} color={duesTone} />
                    <View style={styles.duesInfo}>
                      <Text style={[styles.duesTitle, { color: Colors.foreground }]}>You owe {formatINR(dues)}</Text>
                      <Text style={[styles.duesSub, { color: Colors.mutedForeground }]}>
                        {jobsBlocked
                          ? 'New jobs are paused until you clear your dues.'
                          : 'Platform fee from cash jobs. It is also taken from your next online earnings.'}
                      </Text>
                    </View>
                  </View>
                  <Button title="Pay dues" compact onPress={startPayDues} loading={payingDues} />
                </View>
              )}

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
            const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.BOOKING;
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
                <Ionicons name={cfg.icon} size={18} color={Colors.mutedForeground} />
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowTitle, { color: Colors.foreground }]} numberOfLines={1}>
                    {cfg.label ?? item.type}
                  </Text>
                  <Text style={[styles.rowTime, { color: Colors.mutedForeground }]}>{item.timeAgo}</Text>
                </View>
                <Text style={[styles.rowAmount, { color: Colors[cfg.tone] ?? Colors.foreground }]}>
                  {cfg.sign}{formatINR(item.amount)}
                </Text>
              </View>
            );
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
          }
        />
      )}

      <RazorpayCheckoutModal
        visible={!!duesOrder}
        order={duesOrder}
        summary={{ title: 'Clear dues', description: 'Platform fee from cash jobs' }}
        prefill={{ name: user?.name ?? '', contact: user?.phone ?? '' }}
        onSuccess={handleDuesPaid}
        onDismiss={() => setDuesOrder(null)}
      />
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
  dues:         { marginHorizontal: Spacing.base, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.base, gap: Spacing.md },
  duesTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  duesInfo:     { flex: 1, gap: 2 },
  duesTitle:    { fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  duesSub:      { fontSize: FontSize.sm, lineHeight: 18 },
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
