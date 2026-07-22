# Scaffold a new screen

Create a new screen at the path and name given in $ARGUMENTS.

Follow these rules exactly:

**Imports (always in this order):**
```js
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius, Shadow } from '@constants/theme';
```

**Screen skeleton:**
```jsx
export default function ScreenName() {
  const { Colors } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.background }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: Colors.foreground }]}>Title</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* content */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  header:  { paddingHorizontal: Spacing.base, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  title:   { fontSize: FontSize.h1, fontWeight: FontWeight.bold },
  content: { paddingHorizontal: Spacing.base, paddingBottom: 120 },
});
```

**Rules:**
- Never hardcode colors — always use `Colors.*` tokens
- No left-side accent bars or border strips on cards
- Use `Shadow.md` spread into style arrays for card shadows
- Use `Radius.xl` (20) for cards, `Radius.full` for pills/chips
- Active/primary CTAs use `LinearGradient` from `expo-linear-gradient` with `[Colors.primary, Colors.secondary]`
- Import `LinearGradient` only if the screen actually needs gradients
- `SafeAreaView` wraps only the header (not the whole screen) so the scroll area extends edge-to-edge

After creating the file, register the route in `app/_layout.jsx` if it is outside the existing `(tabs)` or `(auth)` groups.
