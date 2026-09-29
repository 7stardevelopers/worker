import React, { useRef } from 'react';
import { Animated, Pressable } from 'react-native';

/**
 * Drop-in replacement for TouchableOpacity with spring scale feedback.
 * Renders children inside an Animated.View that scales on press.
 *
 * Props:
 *   scale       target scale on press  (default 0.96)
 *   style          style applied to the inner Animated.View (visuals)
 *   containerStyle style applied to the Pressable itself (layout: flex, margins)
 *   All other Pressable props (onPress, disabled, hitSlop, etc.)
 */
export default function PressableScale({ children, onPress, style, containerStyle, scale = 0.96, disabled, ...rest }) {
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
      style={containerStyle}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
