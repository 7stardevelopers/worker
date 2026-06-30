import React, { useRef } from 'react';
import { Animated, Pressable } from 'react-native';

export default function PressableScale({ children, onPress, style, scale = 0.96, disabled, ...rest }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, { toValue: scale, useNativeDriver: true, speed: 60, bounciness: 3 }).start();
  };

  const pressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start();
  };

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
