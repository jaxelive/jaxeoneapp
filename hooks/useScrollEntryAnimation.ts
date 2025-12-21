
import { useEffect, useRef } from 'react';
import { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';

/**
 * Hook for scroll-entry animations
 * Animates opacity and translateY when item enters viewport
 * Only animates once per item
 */
export function useScrollEntryAnimation(
  itemId: string,
  index: number,
  options: {
    duration?: number;
    staggerDelay?: number;
    translateYStart?: number;
  } = {}
) {
  const {
    duration = 280,
    staggerDelay = 50,
    translateYStart = 10,
  } = options;

  const hasAnimated = useRef(false);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(translateYStart);

  useEffect(() => {
    // Only animate once
    if (!hasAnimated.current) {
      hasAnimated.current = true;
      
      const delay = index * staggerDelay;
      
      opacity.value = withDelay(
        delay,
        withTiming(1, {
          duration,
          easing: Easing.out(Easing.cubic),
        })
      );
      
      translateY.value = withDelay(
        delay,
        withTiming(0, {
          duration,
          easing: Easing.out(Easing.cubic),
        })
      );
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return animatedStyle;
}
