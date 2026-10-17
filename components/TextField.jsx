import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@context/theme';
import { FontSize, FontWeight, Spacing, Radius } from '@constants/theme';

export default function TextField({ label, hint, multiline = false, style, ...inputProps }) {
  const { Colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.root, style]}>
      {label ? <Text style={[styles.label, { color: Colors.mutedForeground }]}>{label}</Text> : null}
      <TextInput
        {...inputProps}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        placeholderTextColor={Colors.subtleForeground}
        onFocus={e => { setFocused(true); inputProps.onFocus?.(e); }}
        onBlur={e => { setFocused(false); inputProps.onBlur?.(e); }}
        style={[
          styles.input,
          multiline && styles.multiline,
          {
            backgroundColor: Colors.inputBg,
            borderColor: focused ? Colors.primary : Colors.border,
            color: Colors.foreground,
          },
        ]}
      />
      {hint ? <Text style={[styles.hint, { color: Colors.subtleForeground }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root:      { gap: Spacing.sm - 2 },
  label:     { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  input:     { minHeight: 52, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.body },
  multiline: { minHeight: 112 },
  hint:      { fontSize: FontSize.xs, textAlign: 'right' },
});
