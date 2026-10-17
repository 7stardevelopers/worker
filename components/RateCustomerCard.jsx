import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';
import { api } from '@utils/api';
import { alertError } from '@utils/errors';
import TextField from '@components/TextField';
import Button from '@components/Button';

const LABELS = ['', 'Poor', 'Below average', 'Okay', 'Good', 'Excellent'];

/**
 * Lets the worker rate the customer after a completed job (POST /provider/reviews).
 * The booking detail never reports an existing provider review, so an
 * "already submitted" error is treated as success rather than shown.
 */
export default function RateCustomerCard({ bookingId, customerName, token }) {
  const { Colors } = useTheme();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setSending(true);
    try {
      await api.post('/provider/reviews', { booking_id: bookingId, rating, comment: comment.trim() || null }, token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setDone(true);
    } catch (e) {
      if (/already submitted/i.test(e?.message ?? '')) setDone(true);
      else alertError('Rating failed', e);
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <View style={[styles.card, styles.doneRow, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
        <Text style={[styles.doneText, { color: Colors.foreground }]}>Thanks. Your rating helps keep the platform safe.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
      <Text style={[styles.title, { color: Colors.mutedForeground }]}>Rate the customer</Text>
      <Text style={[styles.sub, { color: Colors.foreground }]}>How was working with {customerName}?</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity
            key={n}
            onPress={() => { setRating(n); Haptics.selectionAsync().catch(() => {}); }}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
            accessibilityState={{ selected: n <= rating }}
          >
            <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={30} color={n <= rating ? Colors.accent : Colors.subtleForeground} />
          </TouchableOpacity>
        ))}
      </View>
      {rating > 0 && (
        <>
          <Text style={[styles.label, { color: Colors.mutedForeground }]}>{LABELS[rating]}</Text>
          <TextField
            placeholder="Anything other partners should know? (optional)"
            value={comment}
            onChangeText={setComment}
            maxLength={300}
            multiline
          />
          <Button title="Submit rating" onPress={submit} loading={sending} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card:     { marginHorizontal: Spacing.base, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base, gap: Spacing.sm },
  title:    { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  sub:      { fontSize: FontSize.body, fontWeight: FontWeight.medium },
  stars:    { flexDirection: 'row', gap: Spacing.sm, marginVertical: Spacing.xs },
  label:    { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  doneRow:  { flexDirection: 'row', alignItems: 'center' },
  doneText: { flex: 1, fontSize: FontSize.sm },
});
