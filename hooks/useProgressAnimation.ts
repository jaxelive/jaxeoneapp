
import { useEffect } from 'react';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';

/**
 * Hook for animating progress bars
 * Animates width from previous percentage to new percentage
 */
export function useProgressAnimation(percentage: number, duration: number = 400) {
  const animatedPercentage = useSharedValue(0);

  useEffect(() => {
    animatedPercentage.value = withTiming(percentage, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [percentage]);

  return animatedPercentage;
}
