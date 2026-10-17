import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';

export default function DocumentUploadCard({ title, subtitle, status = 'empty', uri, onPress }) {
  const { Colors } = useTheme();

  const STATUS = {
    pending:  { color: Colors.warning, label: 'Ready to upload' },
    verified: { color: Colors.success, label: 'Verified' },
    rejected: { color: Colors.error,   label: 'Rejected' },
  };
  const badge = STATUS[status];

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {uri ? (
        <Image source={{ uri }} style={[styles.thumb, { backgroundColor: Colors.surfaceRaised }]} />
      ) : (
        <View style={[styles.thumb, styles.placeholder, { backgroundColor: Colors.surfaceRaised }]}>
          <Ionicons name="document-outline" size={22} color={Colors.mutedForeground} />
        </View>
      )}

      <View style={styles.info}>
        <Text style={[styles.title, { color: Colors.foreground }]} numberOfLines={1}>{title}</Text>
        {badge ? (
          <Text style={[styles.status, { color: badge.color }]}>{badge.label}</Text>
        ) : subtitle ? (
          <Text style={[styles.subtitle, { color: Colors.mutedForeground }]} numberOfLines={2}>{subtitle}</Text>
        ) : null}
      </View>

      <Text style={[styles.action, { color: Colors.primary }]}>{uri ? 'Change' : 'Upload'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.md },
  thumb:       { width: 52, height: 52, borderRadius: Radius.sm },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  info:        { flex: 1, gap: 2 },
  title:       { fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  subtitle:    { fontSize: FontSize.sm, lineHeight: 18 },
  status:      { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  action:      { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
