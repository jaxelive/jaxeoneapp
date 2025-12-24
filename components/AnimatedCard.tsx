
import React from 'react';
import { Animated, ViewStyle } from 'react-native';
import { useGlobalAnimation } from '@/hooks/useGlobalAnimation';

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  animationType?: 'fade' | 'slide' | 'scale' | 'fadeSlide';
  style?: ViewStyle;
}

/**
 * Wrapper component that adds entrance animations to cards
 */
export function AnimatedCard({
  children,
  delay = 0,
  duration = 600,
  animationType = 'fadeSlide',
  style,
}: AnimatedCardProps) {
  const { animatedStyle } = useGlobalAnimation({
    delay,
    duration,
    animationType,
  });

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}
