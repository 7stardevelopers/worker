import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { api } from '@utils/api';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';

const QUICK_TAGS = [
  'Respectful', 'On Time', 'Clear Instructions', 'Safe Premises',
  'Friendly', 'Good Communication', 'Would Work Again',
];

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

export default function WorkerReviewScreen() {
  const { Colors }       = useTheme();
  const { token }        = useAuth();
  const { id, customerName } = useLocalSearchParams();
  const accent           = Colors.primary;

  const [rating,     setRating]     = useState(0);
  const [hovered,    setHovered]    = useState(0);
  const [tags,       setTags]       = useState([]);
  const [comment,    setComment]    = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleTag = (tag) =>
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/provider/reviews', {
        booking_id: id,
        rating,
        comment: comment.trim() || null,
      }, token);

      Alert.alert(
        'Review Submitted!',
        `Thank you for rating ${customerName ?? 'the customer'}.`,
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (e) {
      Alert.alert('Failed', e.message ?? 'Could not submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayStar = hovered || rating;

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.background }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={20} color={Colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: Colors.foreground }]}>Rate the Customer</Text>
          <View style={{ width: 38 }} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          {/* Customer name */}
          {!!customerName && (
            <View style={styles.customerBadge}>
              <View style={[styles.customerAvatar, { backgroundColor: accent + '20' }]}>
                <Ionicons name="person-outline" size={24} color={accent} />
              </View>
              <Text style={[styles.customerName, { color: Colors.foreground }]}>{customerName}</Text>
            </View>
          )}

          {/* Star rating */}
          <View style={styles.starSection}>
            <Text style={[styles.starHint, { color: Colors.mutedForeground }]}>How was the customer?</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setRating(n)}
                  onPressIn={() => setHovered(n)}
                  onPressOut={() => setHovered(0)}
                  activeOpacity={0.9}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={n <= displayStar ? 'star' : 'star-outline'}
                    size={44}
                    color={n <= displayStar ? '#F59E0B' : Colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {displayStar > 0 && (
              <Text style={[styles.starLabel, { color: accent }]}>{STAR_LABELS[displayStar]}</Text>
            )}
          </View>

          {/* Quick tags */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors.foreground }]}>What stood out?</Text>
            <View style={styles.tagRow}>
              {QUICK_TAGS.map(tag => {
                const isOn = tags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={[styles.tag, {
                      backgroundColor: isOn ? accent : Colors.surface,
                      borderColor:     isOn ? accent : Colors.border,
                    }]}
                    activeOpacity={0.8}
                  >
                    {isOn && <Ionicons name="checkmark" size={12} color="#FFF" />}
                    <Text style={[styles.tagText, { color: isOn ? '#FFF' : Colors.mutedForeground }]}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Comment */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors.foreground }]}>Leave a comment (optional)</Text>
            <View style={[styles.commentBox, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
              <TextInput
                style={[styles.commentInput, { color: Colors.foreground }]}
                placeholder="Anything to note about this customer…"
                placeholderTextColor={Colors.subtleForeground}
                multiline
                maxLength={300}
                value={comment}
                onChangeText={setComment}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, { color: Colors.subtleForeground }]}>{comment.length}/300</Text>
            </View>
          </View>
        </ScrollView>

        {/* Submit */}
        <View style={[styles.footer, { backgroundColor: Colors.background, borderTopColor: Colors.border }]}>
          <TouchableOpacity
            style={[styles.submitBtn, { opacity: rating > 0 ? 1 : 0.45 }]}
            onPress={handleSubmit}
            disabled={rating === 0 || submitting}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.submitGrad}
            >
              {submitting
                ? <ActivityIndicator color="#FFF" />
                : <>
                    <Ionicons name="star" size={18} color="#FFF" />
                    <Text style={styles.submitText}>Submit Review</Text>
                  </>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md },
  backBtn:    { width: 38, height: 38, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ fontSize: FontSize.h3, fontWeight: FontWeight.semibold },

  body:         { paddingBottom: 100 },

  customerBadge:  { alignItems: 'center', paddingTop: Spacing.lg, gap: Spacing.sm },
  customerAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  customerName:   { fontSize: FontSize.h3, fontWeight: FontWeight.semibold },

  starSection:{ alignItems: 'center', paddingVertical: Spacing.xl },
  starHint:   { fontSize: FontSize.body, marginBottom: Spacing.lg },
  stars:      { flexDirection: 'row', gap: Spacing.sm },
  starLabel:  { fontSize: FontSize.h2, fontWeight: FontWeight.bold, marginTop: Spacing.md },

  section:      { paddingHorizontal: Spacing.base, marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.h3, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm },
  tagRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag:          { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: 8 },
  tagText:      { fontSize: FontSize.sm, fontWeight: FontWeight.medium },

  commentBox:   { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md },
  commentInput: { fontSize: FontSize.body, minHeight: 80, lineHeight: 22 },
  charCount:    { fontSize: FontSize.xs, textAlign: 'right', marginTop: Spacing.xs },

  footer:     { padding: Spacing.base, borderTopWidth: StyleSheet.hairlineWidth },
  submitBtn:  { borderRadius: Radius.md, overflow: 'hidden', height: 54 },
  submitGrad: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  submitText: { color: '#FFF', fontSize: FontSize.body, fontWeight: FontWeight.semibold },
});
