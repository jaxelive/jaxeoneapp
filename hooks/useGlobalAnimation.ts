
import { useEffect, useRef } from 'react';
import { Animated, ScrollView } from 'react-native';

interface UseGlobalAnimationOptions {
  delay?: number;
  duration?: number;
  animationType?: 'fade' | 'slide' | 'scale' | 'fadeSlide';
}

/**
 * Global animation hook for cards, numbers, and progress bars
 * Animates elements on mount with optional delay
 */
export function useGlobalAnimation(
  options: UseGlobalAnimationOptions = {}
) {
  const {
    delay = 0,
    duration = 600,
    animationType = 'fadeSlide',
  } = options;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [];

    if (animationType === 'fade' || animationType === 'fadeSlide') {
      animations.push(
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration,
          delay,
          useNativeDriver: true,
        })
      );
    }

    if (animationType === 'slide' || animationType === 'fadeSlide') {
      animations.push(
        Animated.timing(slideAnim, {
          toValue: 0,
          duration,
          delay,
          useNativeDriver: true,
        })
      );
    }

    if (animationType === 'scale') {
      animations.push(
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration,
          delay,
          useNativeDriver: true,
        })
      );
    }

    Animated.parallel(animations).start();
  }, []);

  const getAnimatedStyle = () => {
    switch (animationType) {
      case 'fade':
        return { opacity: fadeAnim };
      case 'slide':
        return { transform: [{ translateY: slideAnim }] };
      case 'scale':
        return { transform: [{ scale: scaleAnim }] };
      case 'fadeSlide':
      default:
        return {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        };
    }
  };

  return {
    animatedStyle: getAnimatedStyle(),
    fadeAnim,
    slideAnim,
    scaleAnim,
  };
}
