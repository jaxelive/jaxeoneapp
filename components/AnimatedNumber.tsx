
import React, { useEffect, useState } from 'react';
import { Text, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedReaction,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  style?: TextStyle;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  formatNumber?: boolean;
  delay?: number;
}

/**
 * Component that animates numeric values
 * Smoothly transitions from 0 to target value on mount, then from old value to new value
 */
export function AnimatedNumber({
  value,
  duration = 800,
  style,
  decimals = 0,
  prefix = '',
  suffix = '',
  formatNumber = true,
  delay = 0,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    // On mount, animate from 0 to the target value
    const timer = setTimeout(() => {
      animatedValue.value = withTiming(value, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
      setHasAnimated(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    // After initial animation, update when value changes
    if (hasAnimated) {
      animatedValue.value = withTiming(value, {
        duration: duration * 0.6, // Faster for subsequent updates
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [value, hasAnimated]);

  // Update display value on animation frame
  useAnimatedReaction(
    () => animatedValue.value,
    (currentValue) => {
      runOnJS(setDisplayValue)(currentValue);
    }
  );

  const formattedValue = formatNumber
    ? Math.round(displayValue).toLocaleString()
    : displayValue.toFixed(decimals);

  return (
    <Text style={style}>
      {prefix}{formattedValue}{suffix}
    </Text>
  );
}

export default AnimatedNumber;
