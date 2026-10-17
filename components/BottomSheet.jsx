import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Animated, Easing, TouchableOpacity, KeyboardAvoidingView, Dimensions, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@context/theme';
import { Spacing, Radius } from '@constants/theme';

const OFFSCREEN = Dimensions.get('window').height;

// Shared bottom sheet. Animates in and out on the native driver, keeps the
// content mounted during the exit animation, lifts above the keyboard on
// both platforms, and pads for the home indicator / nav bar.
export default function BottomSheet({ visible, onClose, dismissible = true, children }) {
  const { Colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(OFFSCREEN)).current;
  const backdrop   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(OFFSCREEN);
      backdrop.setValue(0);
      Animated.parallel([
        Animated.timing(backdrop,   { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
      return;
    }
    if (!mounted) return;
    Animated.parallel([
      Animated.timing(backdrop,   { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: OFFSCREEN, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) setMounted(false); });
  }, [visible]);

  const requestClose = dismissible ? onClose : undefined;

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={requestClose ?? (() => {})}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.backdrop, opacity: backdrop }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={requestClose}
            accessibilityLabel="Close"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: Colors.surface,
              paddingBottom: Math.max(insets.bottom, Spacing.base) + Spacing.sm,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: Colors.border }]} />
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1, justifyContent: 'flex-end' },
  sheet:  { maxHeight: '90%', borderTopLeftRadius: Radius.xl2, borderTopRightRadius: Radius.xl2, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.base },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.xs },
});
