import React from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@context/theme';
import { useAuth } from '@context/auth';
import { FontSize, FontWeight, Spacing } from '@constants/theme';
import FooterBar from '@components/FooterBar';
import Button from '@components/Button';

export default function SuspendedScreen() {
  const { Colors } = useTheme();
  const { logout } = useAuth();

  const confirmLogout = () => Alert.alert('Log out', 'Are you sure you want to log out?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Log out', style: 'destructive', onPress: logout },
  ]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Ionicons name="lock-closed-outline" size={30} color={Colors.error} />
        </View>
        <Text style={[styles.title, { color: Colors.foreground }]}>Account suspended</Text>
        <Text style={[styles.body, { color: Colors.mutedForeground }]}>
          Your partner account is temporarily suspended, so you can't go online or accept jobs.
          Contact support to find out why and how to get reinstated.
        </Text>
      </ScrollView>

      <FooterBar>
        <Button title="Contact support" icon="chatbubbles-outline" onPress={() => router.push('/support')} />
        <Button title="Check again" variant="secondary" onPress={() => router.replace('/')} />
        <Button title="Log out" variant="ghost" onPress={confirmLogout} />
      </FooterBar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  content:    { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, gap: Spacing.md },
  iconCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  title:      { fontSize: FontSize.h1, fontWeight: FontWeight.bold, textAlign: 'center' },
  body:       { fontSize: FontSize.body, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
});
