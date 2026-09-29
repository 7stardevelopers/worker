import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * True while the screen is the visible one. Tab screens stay mounted when you
 * switch tabs, so looping animations / timers should pause when this is false.
 */
export default function useScreenFocus() {
  const [focused, setFocused] = useState(true);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  return focused;
}
