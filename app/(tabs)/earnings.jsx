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
<<<<<<< HEAD
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
=======
import { FontSize, FontWeight, Spacing, Radius, Shadow } from '@constants/theme';
import { alertError } from '@utils/errors';
import { formatINR, fromPaise, toPaise, MIN_PAYOUT } from '@utils/money';
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
import { api } from '@utils/api';
import { normalizeEarning } from '@utils/normalize';
import { formatINR } from '@utils/format';
import ScreenHeader from '@components/ScreenHeader';
import EarningsChart from '@components/EarningsChart';
import EmptyState from '@components/EmptyState';
<<<<<<< HEAD
import LoadingScreen from '@components/LoadingScreen';
import Button from '@components/Button';

const MIN_PAYOUT = 10000; // paise

const TYPE_ICON = {
  BOOKING:   'briefcase-outline',
  TIP:       'gift-outline',
  BONUS:     'ribbon-outline',
  DEDUCTION: 'remove-circle-outline',
=======
import Skeleton from '@components/Skeleton';
import RazorpayCheckoutModal from '@components/RazorpayCheckoutModal';
import { toast } from '@components/Toast';

const TYPE_CONFIG = {
  BOOKING:           { label: 'Job earning',             icon: 'briefcase-outline',     color: '#10B981', sign: '+' },
  TIP:               { label: 'Tip',                     icon: 'gift-outline',          color: '#F59E0B', sign: '+' },
  BONUS:             { label: 'Bonus',                   icon: 'star-outline',          color: '#6366F1', sign: '+' },
  CANCEL_FEE:        { label: 'Cancellation fee',        icon: 'close-circle-outline',  color: '#10B981', sign: '+' },
  CASH_FEE_REVERSAL: { label: 'Cash fee returned',       icon: 'refresh-outline',       color: '#10B981', sign: '+' },
  DUES_PAID:         { label: 'Dues paid',               icon: 'checkmark-done-outline', color: '#6366F1', sign: '+' },
  PROMO_CREDIT:      { label: 'Discount paid by us',     icon: 'pricetag-outline',      color: '#10B981', sign: '+' },
  CASH_FEE:          { label: 'Platform fee (cash job)', icon: 'cash-outline',          color: '#EF4444', sign: '-' },
  PROMO_REVERSAL:    { label: 'Discount credit undone',  icon: 'pricetag-outline',      color: '#EF4444', sign: '-' },
  DEDUCTION:         { label: 'Deduction',               icon: 'remove-circle-outline', color: '#EF4444', sign: '-' },
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
};
// Money taken off the wallet, and money that isn't income (paying dues) — kept out of the earnings totals.
const DEBIT_TYPES = ['DEDUCTION', 'CASH_FEE', 'PROMO_REVERSAL'];
const NOT_INCOME  = [...DEBIT_TYPES, 'DUES_PAID'];

const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

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

  // The API returns paise; everything below is rupees.
  const walletBalance = fromPaise(profile?.wallet_balance);
  const withdrawable  = availableBalance ?? walletBalance;
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
      const items = raw.map(normalizeEarning);
      setEarnings(items);
      const stats = earningsRes?.data?.stats ?? {};
      const available = Number(stats.available_balance);
      setAvailableBalance(Number.isFinite(available) ? fromPaise(available) : null);
      setDues(fromPaise(stats.dues ?? 0));
      setJobsBlocked(!!stats.jobs_blocked);
      setNextPayout(stats.next_payout_date ?? null);

      // 7 calendar-day buckets, oldest first, last bucket = today
      const today = startOfDay(new Date());
      const buckets = Array(7).fill(0);
<<<<<<< HEAD
      raw.forEach(e => {
        if (e.type === 'DEDUCTION' || !e.created_at) return;
        const dayDiff = Math.round((today - startOfDay(new Date(e.created_at))) / 86400000);
=======
      items.forEach(e => {
        if (NOT_INCOME.includes(e.type)) return;
        const d = new Date(e.createdAt);
        const dayDiff = Math.floor((today - d) / 86400000);
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
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
<<<<<<< HEAD
    Alert.alert(
      'Request payout',
      `Transfer ${formatINR(walletBalance, { decimals: true })} to account ending ${bankLast4 || '----'}?`,
=======
    // The worker withdraws the full available amount (rupees); never more than the wallet holds.
    const amount = Math.min(withdrawable, walletBalance);
    if (amount < MIN_PAYOUT) {
      if (walletBalance >= MIN_PAYOUT) {
        Alert.alert('Payout Pending', 'Your earlier payout request is still being processed.');
        return;
      }
      Alert.alert('Minimum Payout', `Minimum payout amount is ${formatINR(MIN_PAYOUT)}`);
      return;
    }
    Alert.alert(
      'Request Payout',
      `Request payout of ${formatINR(amount)} to account ****${bankLast4}?`,
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setRequesting(true);
            try {
<<<<<<< HEAD
              await api.post('/payments/payout-request', { amount: walletBalance }, token);
              Alert.alert('Payout requested', 'Your payout will be processed within 2-3 business days.');
              await fetchProfile();
=======
              // The backend takes paise.
              await api.post('/payments/payout-request', { amount: toPaise(amount) }, token);
              toast.success('Payout requested', 'It will be processed within 2-3 business days.');
              await load();
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
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

<<<<<<< HEAD
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
=======
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
      toast.success('Dues cleared', 'Thanks! You can take new jobs again.');
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

  const thisWeek  = earnings.filter(e => {
    const d = new Date(e.createdAt);
    const now = new Date();
    return (now - d) < 7 * 86400000 && !NOT_INCOME.includes(e.type);
  }).reduce((s, e) => s + e.amount, 0);

  const thisMonth = earnings.filter(e => {
    const d = new Date(e.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && !NOT_INCOME.includes(e.type);
  }).reduce((s, e) => s + e.amount, 0);

  const total = earnings.filter(e => !NOT_INCOME.includes(e.type)).reduce((s, e) => s + e.amount, 0);
>>>>>>> e26961c635b60a007766324f445890a2e88d7232

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <ScreenHeader large title="Earnings" />

<<<<<<< HEAD
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
=======
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
                {nextPayoutLabel && (
                  <Text style={styles.nextPayout}>Automatic payout to your bank every Mon & Thu · next {nextPayoutLabel}</Text>
                )}
              </LinearGradient>
            </View>

            {/* Dues from cash jobs (Rapido-style: the worker keeps the cash, owes the platform fee) */}
            {dues > 0 && (
              <View style={[styles.duesCard, {
                backgroundColor: (jobsBlocked ? Colors.error : Colors.warning) + '14',
                borderColor: (jobsBlocked ? Colors.error : Colors.warning) + '50',
              }]}>
                <Ionicons name={jobsBlocked ? 'lock-closed' : 'alert-circle'} size={22} color={jobsBlocked ? Colors.error : Colors.warning} />
                <View style={styles.duesInfo}>
                  <Text style={[styles.duesTitle, { color: Colors.foreground }]}>You owe {formatINR(dues)}</Text>
                  <Text style={[styles.duesSub, { color: Colors.mutedForeground }]}>
                    {jobsBlocked
                      ? 'New jobs are paused until you clear your dues.'
                      : 'Platform fee from cash jobs. It is also taken from your next online earnings.'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.duesBtn, { backgroundColor: Colors.primary, opacity: payingDues ? 0.6 : 1 }]}
                  onPress={startPayDues}
                  disabled={payingDues}
                  accessibilityLabel="Pay dues"
                  activeOpacity={0.85}
                >
                  <Text style={styles.duesBtnText}>{payingDues ? 'Wait…' : 'Pay'}</Text>
                </TouchableOpacity>
              </View>
            )}

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
                  {cfg.label ?? item.type}
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
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
<<<<<<< HEAD

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
=======
              <Text style={[styles.rowAmount, { color: DEBIT_TYPES.includes(item.type) ? Colors.error : Colors.success }]}>
                {cfg.sign}{formatINR(item.amount)}
              </Text>
            </View>
          );
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
      />
      <RazorpayCheckoutModal
        visible={!!duesOrder}
        order={duesOrder}
        summary={{ title: 'Clear dues', description: 'Platform fee from cash jobs' }}
        prefill={{ name: user?.name ?? '', contact: user?.phone ?? '' }}
        onSuccess={handleDuesPaid}
        onDismiss={() => setDuesOrder(null)}
      />
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
<<<<<<< HEAD
  list:         { paddingTop: Spacing.xs, paddingBottom: Spacing.xl },
  listHeader:   { gap: Spacing.md },
  wallet:       { marginHorizontal: Spacing.base, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.lg, gap: Spacing.xs },
  walletLabel:  { fontSize: FontSize.sm },
  walletAmount: { fontSize: FontSize.display + 4, fontWeight: FontWeight.bold, letterSpacing: -0.5 },
  payoutBtn:    { marginTop: Spacing.md },
  walletHint:   { fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.xs },
  summaryRow:   { flexDirection: 'row', marginHorizontal: Spacing.base, gap: Spacing.sm },
  summaryCard:  { flex: 1, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.md, gap: Spacing.xs },
=======
  list:         { paddingBottom: 100 },
  header:       { paddingHorizontal: Spacing.base, paddingVertical: Spacing.md },
  title:        { fontSize: FontSize.h1, fontWeight: FontWeight.bold },
  walletCard:   { marginHorizontal: Spacing.base, marginBottom: Spacing.base, borderRadius: Radius.xl, overflow: 'hidden' },
  walletGrad:   { padding: Spacing.xl, gap: Spacing.sm },
  walletLabel:  { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.sm },
  walletAmount: { color: '#FFF', fontSize: 40, fontWeight: FontWeight.bold, letterSpacing: -1 },
  payoutBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF', borderRadius: Radius.full, paddingHorizontal: Spacing.base, paddingVertical: 8, alignSelf: 'flex-start', marginTop: Spacing.sm },
  payoutText:   { color: '#6366F1', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  nextPayout:   { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.xs, marginTop: 2 },
  duesCard:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.base, marginBottom: Spacing.base, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md },
  duesInfo:     { flex: 1, gap: 2 },
  duesTitle:    { fontSize: FontSize.body, fontWeight: FontWeight.bold },
  duesSub:      { fontSize: FontSize.xs },
  duesBtn:      { borderRadius: Radius.full, paddingHorizontal: Spacing.base, paddingVertical: 8 },
  duesBtnText:  { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  summaryRow:   { flexDirection: 'row', marginHorizontal: Spacing.base, marginBottom: Spacing.base, gap: Spacing.sm },
  summaryCard:  { flex: 1, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.md, alignItems: 'center', gap: 4 },
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
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
