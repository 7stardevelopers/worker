import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';

const STATUS_CONFIG = {
  pending:  { color: '#F59E0B', icon: 'time-outline',            label: 'Pending Review' },
  verified: { color: '#10B981', icon: 'checkmark-circle-outline', label: 'Verified'       },
  rejected: { color: '#EF4444', icon: 'close-circle-outline',    label: 'Rejected'       },
  empty:    { color: '#6366F1', icon: 'cloud-upload-outline',    label: 'Upload'         },
};

export default function DocumentUploadCard({ title, subtitle, status = 'empty', uri, onPress }) {
  const { Colors } = useTheme();
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.empty;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: Colors.surface, borderColor: cfg.color + '50' }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.left}>
        {uri ? (
          <Image source={{ uri }} style={styles.thumb} />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: cfg.color + '15' }]}>
            <Ionicons name="document-outline" size={24} color={cfg.color} />
          </View>
        )}
        <View style={styles.info}>
          <Text style={[styles.title, { color: Colors.foreground }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: Colors.mutedForeground }]}>{subtitle}</Text>
          ) : null}
          <View style={[styles.badge, { backgroundColor: cfg.color + '18' }]}>
            <Ionicons name={cfg.icon} size={12} color={cfg.color} />
            <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.action, { backgroundColor: Colors.primary + '15' }]}>
        <Ionicons
          name={status === 'empty' ? 'add' : 'camera-outline'}
          size={18}
          color={Colors.primary}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, gap: Spacing.md },
  left:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  thumb:       { width: 52, height: 52, borderRadius: Radius.md },
  placeholder: { width: 52, height: 52, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  info:        { flex: 1, gap: 4 },
  title:       { fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  subtitle:    { fontSize: FontSize.xs, lineHeight: 16 },
  badge:       { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:   { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  action:      { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
});
