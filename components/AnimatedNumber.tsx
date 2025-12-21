
import React, { useEffect } from 'react';
import { Text, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedText = Animated.createAnimatedComponent(Text);

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
  const animatedValue = useSharedValue(value);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]);

  const animatedProps = useAnimatedProps(() => {
    const currentValue = animatedValue.value;
    const formattedValue = formatNumber
      ? Math.round(currentValue).toLocaleString()
      : currentValue.toFixed(decimals);
    
    return {
      text: `${prefix}${formattedValue}${suffix}`,
    } as any;
  });

  return <AnimatedText style={style} animatedProps={animatedProps} />;
}
