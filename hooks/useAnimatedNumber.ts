
import { useEffect } from 'react';
import { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated';

/**
 * Hook for animating numeric values
 * Animates from previous value to new value with smooth easing
 */
export function useAnimatedNumber(value: number, duration: number = 350) {
  const animatedValue = useSharedValue(value);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]);

  return animatedValue;
}
