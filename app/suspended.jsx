import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';

export default function SuspendedScreen() {
  const { Colors } = useTheme();
  const { logout } = useAuth();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: Colors.error + '20' }]}>
          <Ionicons name="lock-closed-outline" size={48} color={Colors.error} />
        </View>
        <Text style={[styles.title, { color: Colors.foreground }]}>Account Suspended</Text>
        <Text style={[styles.body, { color: Colors.mutedForeground }]}>
          Your partner account is temporarily suspended, so you can't go online or accept jobs.
          Contact support to learn why and how to get reinstated.
        </Text>

        <TouchableOpacity style={styles.btn} onPress={() => router.push('/support/index')} activeOpacity={0.85}>
          <LinearGradient colors={Colors.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnGrad}>
            <Ionicons name="headset-outline" size={18} color="#FFF" />
            <Text style={styles.btnText}>Contact Support</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/')} style={styles.secondary} activeOpacity={0.7}>
          <Text style={[styles.secondaryText, { color: Colors.primary }]}>Check again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => Alert.alert('Log Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: logout },
          ])}
          activeOpacity={0.7}
        >
          <Text style={[styles.secondaryText, { color: Colors.mutedForeground }]}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  content:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, gap: Spacing.md },
  iconCircle:    { width: 104, height: 104, borderRadius: 52, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  title:         { fontSize: FontSize.h1, fontWeight: FontWeight.bold, textAlign: 'center' },
  body:          { fontSize: FontSize.body, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.md },
  btn:           { alignSelf: 'stretch', height: 54, borderRadius: Radius.md, overflow: 'hidden' },
  btnGrad:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  btnText:       { color: '#FFF', fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  secondary:     { paddingVertical: Spacing.sm },
  secondaryText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});
