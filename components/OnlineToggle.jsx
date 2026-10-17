import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';

// Native Switch per platform. `loading` ignores presses rather than
// disabling the control, so background profile refreshes don't flicker it.
export default function OnlineToggle({ isOnline, onToggle, loading }) {
  const { Colors } = useTheme();

  return (
<<<<<<< HEAD
    <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
      <View style={[styles.dot, { backgroundColor: isOnline ? Colors.success : Colors.subtleForeground }]} />
=======
    // The whole card is the tap target — the worker toggles this constantly, often one-handed.
    <TouchableOpacity
      style={[styles.wrapper, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
      onPress={loading ? undefined : onToggle}
      activeOpacity={0.85}
      accessibilityRole="switch"
      accessibilityLabel="Available for jobs"
      accessibilityState={{ checked: isOnline, busy: !!loading }}
    >
      <Animated.View style={[styles.glow, { opacity: glowOpacity }]}>
        <LinearGradient
          colors={[onlineColor + '18', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

>>>>>>> e26961c635b60a007766324f445890a2e88d7232
      <View style={styles.textCol}>
        <Text style={[styles.status, { color: Colors.foreground }]}>
          {isOnline ? 'Online' : 'Offline'}
        </Text>
<<<<<<< HEAD
        <Text style={[styles.sub, { color: Colors.mutedForeground }]}>
          {isOnline ? 'You are receiving job requests' : 'Go online to receive job requests'}
        </Text>
      </View>
      <Switch
        value={isOnline}
        onValueChange={() => { if (!loading) onToggle(); }}
        trackColor={{ false: Colors.surfaceRaised, true: Colors.success }}
        thumbColor={Colors.onPrimary}
        ios_backgroundColor={Colors.surfaceRaised}
        accessibilityLabel="Online status"
      />
    </View>
=======
        <Text style={[styles.sub, { color: Colors.subtleForeground }]}>
          {isOnline ? 'Accepting new job requests' : 'Tap to start accepting jobs'}
        </Text>
      </View>

      <View>
        <View style={[styles.track, { backgroundColor: isOnline ? onlineColor + '30' : Colors.surfaceRaised, borderColor: isOnline ? onlineColor : Colors.border }]}>
          <Animated.View style={[styles.thumb, { backgroundColor: isOnline ? onlineColor : Colors.mutedForeground, transform: [{ translateX: thumbTranslate }] }]}>
            <Ionicons
              name={isOnline ? 'radio-button-on' : 'radio-button-off'}
              size={14}
              color={isOnline ? '#FFF' : Colors.surface}
            />
          </Animated.View>
        </View>
      </View>
    </TouchableOpacity>
>>>>>>> e26961c635b60a007766324f445890a2e88d7232
  );
}

const styles = StyleSheet.create({
  card:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.base, marginHorizontal: Spacing.base },
  dot:     { width: 8, height: 8, borderRadius: 4 },
  textCol: { flex: 1, gap: 2 },
  status:  { fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  sub:     { fontSize: FontSize.sm },
});
