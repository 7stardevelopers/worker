import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius, Shadow } from '@constants/theme';
import { api } from '@utils/api';
import { useAuth } from '@context/auth';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SERVICE_ICONS = {
  electrical: 'flash-outline',
  plumbing:   'water-outline',
  cleaning:   'sparkles-outline',
  ac:         'snow-outline',
  paint:      'color-palette-outline',
  carpent:    'hammer-outline',
  pest:       'bug-outline',
  appliance:  'construct-outline',
};

function serviceIcon(name = '') {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(SERVICE_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return 'briefcase-outline';
}

function parseSnapshot(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return {}; } }
  return raw;
}

function extractArea(snapshot) {
  const addr = parseSnapshot(snapshot);
  const full = addr.full_address ?? addr.fullAddress ?? '';
  const clean = full.replace(/\s*[—\-–]\s*\d{6}\s*$/, '').trim();
  return clean || addr.area || addr.city || 'Location on file';
}

function formatScheduled(dt) {
  if (!dt) return '';
  const d   = new Date(dt);
  const now = new Date();
  const todayStr    = now.toDateString();
  const tomorrowStr = new Date(now.getTime() + 86400000).toDateString();
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === todayStr)    return `Today, ${time}`;
  if (d.toDateString() === tomorrowStr) return `Tomorrow, ${time}`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + `, ${time}`;
}

// amounts from API are in rupees (not paise)
const fmt = (amt) => `₹${Number(amt).toLocaleString('en-IN')}`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AvailableJobCard({ booking, onAccepted }) {
  const { Colors } = useTheme();
  const { token }  = useAuth();
  const [loading, setLoading] = useState(false);

  const addrSnap = parseSnapshot(booking.address_snapshot);
  const svcSnap  = parseSnapshot(booking.service_snapshot);

  const serviceName = svcSnap.name ?? 'Service';
  const area        = extractArea(booking.address_snapshot);
  const label       = addrSnap.label   ?? 'Home';
  const pincode     = addrSnap.pincode ?? '';
  const scheduled   = formatScheduled(booking.scheduled_at);
  const isInstant   = !!booking.is_instant;

  const totalAmt    = booking.total_amount ?? 0;
  // use API value only when it's a non-zero positive; otherwise derive 20%
  const platformFee = (booking.platform_fee != null && booking.platform_fee > 0)
    ? booking.platform_fee
    : Math.round(totalAmt * 0.2);
  const earning     = totalAmt - platformFee;
  const hasFee = platformFee > 0;

  const labelIcon =
    label === 'Home'   ? 'home-outline'
    : label === 'Office' ? 'briefcase-outline'
    : 'location-outline';

  const handleAccept = async () => {
    setLoading(true);
    try {
      await api.patch(`/bookings/${booking.booking_id}/accept`, {}, token);
      onAccepted?.();
    } catch (e) {
      Alert.alert('Not Available', e.message ?? 'This job was already taken');
      onAccepted?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }, Shadow.md]}>

      {/* Accent strip */}
      <LinearGradient
        colors={[Colors.primary + '44', Colors.secondary + '11']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.accentStrip}
      />

      {/* Header */}
      <View style={styles.headerRow}>
        <View style={[styles.iconBox, { backgroundColor: Colors.primary + '15' }]}>
          <Ionicons name={serviceIcon(serviceName)} size={20} color={Colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.serviceName, { color: Colors.foreground }]} numberOfLines={1}>
            {serviceName}
          </Text>
          <Text style={[styles.bookingId, { color: Colors.mutedForeground }]}>
            #{booking.booking_id.slice(0, 8).toUpperCase()}
          </Text>
        </View>
        <View style={styles.badges}>
          {isInstant && (
            <View style={[styles.badge, { backgroundColor: '#F59E0B18', borderColor: '#F59E0B45' }]}>
              <Ionicons name="flash" size={9} color="#F59E0B" />
              <Text style={[styles.badgeText, { color: '#F59E0B' }]}>INSTANT</Text>
            </View>
          )}
          <View style={[styles.badge, { backgroundColor: Colors.primary + '18', borderColor: Colors.primary + '38' }]}>
            <Text style={[styles.badgeText, { color: Colors.primary }]}>NEW</Text>
          </View>
        </View>
      </View>

      {/* Earning row */}
      <View style={[styles.earningRow, { backgroundColor: Colors.primary + '0A', borderColor: Colors.primary + '20' }]}>
        <View style={styles.earningLeft}>
          <Text style={[styles.earningLabel, { color: Colors.mutedForeground }]}>Your Earning</Text>
          <Text style={[styles.earningAmount, { color: Colors.primary }]}>{fmt(earning)}</Text>
        </View>
        {hasFee ? (
          <View style={styles.earningRight}>
            <View style={[styles.earningPill, { borderColor: Colors.border }]}>
              <Text style={[styles.pillText, { color: Colors.mutedForeground }]}>
                Total {fmt(totalAmt)}
              </Text>
              <View style={[styles.pillDot, { backgroundColor: Colors.border }]} />
              <Text style={[styles.pillText, { color: Colors.mutedForeground }]}>
                Fee {fmt(platformFee)}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.earningRight}>
            <View style={[styles.earningPill, { borderColor: Colors.border }]}>
              <Ionicons name="checkmark-circle" size={11} color={Colors.success} />
              <Text style={[styles.pillText, { color: Colors.success }]}>No platform fee</Text>
            </View>
          </View>
        )}
      </View>

      {/* Location + Schedule in one compact block */}
      <View style={styles.detailsBlock}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={13} color={Colors.primary} style={styles.detailIcon} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.detailMain, { color: Colors.foreground }]} numberOfLines={1}>{area}</Text>
            <View style={styles.detailSub}>
              <Ionicons name={labelIcon} size={10} color={Colors.mutedForeground} />
              <Text style={[styles.detailSubText, { color: Colors.mutedForeground }]}>{label}</Text>
              {!!pincode && (
                <>
                  <Text style={[styles.detailSubText, { color: Colors.mutedForeground }]}>·</Text>
                  <Text style={[styles.detailSubText, { color: Colors.mutedForeground }]}>{pincode}</Text>
                </>
              )}
            </View>
          </View>
        </View>

        {!!scheduled && (
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={13} color={Colors.success} style={styles.detailIcon} />
            <Text style={[styles.detailMain, { color: Colors.foreground }]}>{scheduled}</Text>
          </View>
        )}
      </View>

      {/* Accept button */}
      <TouchableOpacity
        style={[styles.acceptBtn, { opacity: loading ? 0.7 : 1 }]}
        onPress={handleAccept}
        disabled={loading}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.secondary]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.acceptGrad}
        >
          {loading
            ? <ActivityIndicator color="#FFF" size="small" />
            : <>
                <Ionicons name="checkmark-circle-outline" size={17} color="#FFF" />
                <Text style={styles.acceptText}>Accept Job</Text>
              </>
          }
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card:        { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden', marginBottom: Spacing.md },

  accentStrip: { height: 3 },

  headerRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, paddingBottom: Spacing.xs },
  iconBox:     { width: 38, height: 38, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  headerText:  { flex: 1 },
  serviceName: { fontSize: FontSize.body, fontWeight: FontWeight.bold },
  bookingId:   { fontSize: FontSize.xs, marginTop: 1 },
  badges:      { flexDirection: 'row', gap: 4, alignItems: 'center' },
  badge:       { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText:   { fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.3 },

  earningRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: Spacing.base, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.sm },
  earningLeft:  { gap: 1 },
  earningLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  earningAmount:{ fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: -0.5, lineHeight: 28 },
  earningRight: { alignItems: 'flex-end' },
  earningPill:  { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  pillDot:      { width: 3, height: 3, borderRadius: 2 },
  pillText:     { fontSize: 10, fontWeight: FontWeight.medium },

  detailsBlock: { paddingHorizontal: Spacing.base, gap: 6, marginBottom: Spacing.sm },
  detailRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailIcon:   { width: 16, flexShrink: 0 },
  detailMain:   { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  detailSub:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  detailSubText:{ fontSize: 10, fontWeight: FontWeight.regular },

  acceptBtn:   { marginHorizontal: Spacing.base, marginBottom: Spacing.sm, marginTop: Spacing.xs, borderRadius: Radius.md, overflow: 'hidden' },
  acceptGrad:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11 },
  acceptText:  { color: '#FFF', fontSize: FontSize.body, fontWeight: FontWeight.bold },
});
