import React, { useRef, useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@context/theme';

const TABS = [
  { name: 'index',    icon: 'briefcase-outline', activeIcon: 'briefcase', label: 'Jobs'     },
  { name: 'earnings', icon: 'wallet-outline',    activeIcon: 'wallet',    label: 'Earnings' },
  { name: 'profile',  icon: 'person-outline',    activeIcon: 'person',    label: 'Profile'  },
];

export default function FloatingTabBar({ state, navigation }) {
  const { Colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [tabWidth, setTabWidth] = useState(0);
  const blobX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (tabWidth === 0) return;
    Animated.spring(blobX, {
      toValue: state.index * tabWidth,
      tension: 100, friction: 12,
      useNativeDriver: true,
    }).start();
  }, [state.index, tabWidth]);

  const handleLayout = (e) => {
    const w = e.nativeEvent.layout.width / TABS.length;
    setTabWidth(w);
    blobX.setValue(state.index * w);
  };

  const handlePress = (routeName, routeKey) => {
    const event = navigation.emit({ type: 'tabPress', target: routeKey, canPreventDefault: true });
    if (!event.defaultPrevented) navigation.navigate(routeName);
  };

  return (
    <View style={[styles.wrapper, { bottom: insets.bottom - 10 }]} pointerEvents="box-none">
      <View style={[styles.pill, { backgroundColor: Colors.tabBarBg, borderColor: 'rgba(255,255,255,0.1)' }]}>
        <View style={styles.bar} onLayout={handleLayout}>
          {tabWidth > 0 && (
            <Animated.View
              style={[
                styles.blob,
                {
                  width: tabWidth - 16,
                  backgroundColor: Colors.primary + '25',
                  borderColor: Colors.primary + '55',
                  transform: [{ translateX: blobX }],
                  left: 8,
                },
              ]}
            />
          )}
          {TABS.map((tab, i) => {
            const isActive = state.index === i;
            const color = isActive ? Colors.primary : Colors.subtleForeground;
            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.tab}
                onPress={() => handlePress(tab.name, state.routes[i]?.key ?? tab.name)}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: isActive }}
              >
                <Ionicons name={isActive ? tab.activeIcon : tab.icon} size={22} color={color} />
                <Text style={[styles.label, { color }]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
  },
  pill: {
    borderRadius: 9999,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  bar: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    position: 'relative',
    minWidth: 260,
  },
  blob: {
    position: 'absolute',
    top: 6, bottom: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
