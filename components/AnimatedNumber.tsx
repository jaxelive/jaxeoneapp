
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
}

/**
 * Component that animates numeric values
 * Smoothly transitions from old value to new value
 */
export function AnimatedNumber({
  value,
  duration = 350,
  style,
  decimals = 0,
  prefix = '',
  suffix = '',
  formatNumber = true,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const animatedValue = useSharedValue(value);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]);

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
