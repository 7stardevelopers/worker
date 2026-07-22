# Scaffold a new component

Create a new reusable component with the name and purpose given in $ARGUMENTS.

**Skeleton:**
```jsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';   // only if gradients needed
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius, Shadow } from '@constants/theme';

export default function ComponentName({ prop1, prop2, onPress }) {
  const { Colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }, Shadow.md]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* content */}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
```

**Rules:**
- All colors from `Colors.*` — never hardcode hex values
- No left-side accent bars or border strips on cards — forbidden in this project
- For glassmorphism surfaces: `backgroundColor: Colors.glassBg, borderColor: Colors.glassBorder`
- For status-colored elements: use `Colors.status[status]` from the status map
- Append hex alpha to Colors values for transparency: `Colors.primary + '20'` ≈ 12% opacity
- Spread `Shadow.sm/md/lg` directly into the style array
- Primary gradient buttons: `<LinearGradient colors={[Colors.primary, Colors.secondary]} start={{x:0,y:0}} end={{x:1,y:0}}>`
- Place the component in `components/` and use `@components/ComponentName` when importing elsewhere
