import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing } from '@constants/theme';

const TABS = {
  index:    { icon: 'briefcase-outline', activeIcon: 'briefcase', label: 'Jobs'     },
  earnings: { icon: 'wallet-outline',    activeIcon: 'wallet',    label: 'Earnings' },
  profile:  { icon: 'person-outline',    activeIcon: 'person',    label: 'Profile'  },
};

// Docked tab bar. Rendered in layout flow, so screens end above it and
// nothing scrolls underneath; bottom padding follows the device inset.
export default function TabBar({ state, navigation }) {
  const { Colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: Colors.tabBarBg,
          borderTopColor: Colors.border,
          paddingBottom: Math.max(insets.bottom, Spacing.sm),
        },
      ]}
    >
      {state.routes.map((route, i) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === i;
        const color = focused ? Colors.primary : Colors.mutedForeground;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
          >
            <Ionicons name={focused ? tab.activeIcon : tab.icon} size={22} color={color} />
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar:   { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.sm },
  tab:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: Spacing.xs },
  label: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
});
