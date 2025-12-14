
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';
import { useSupabase } from '@/contexts/SupabaseContext';

const { width, height } = Dimensions.get('window');

export default function IntroScreen() {
  const { session } = useSupabase();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const astronautAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(astronautAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(astronautAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    // Navigate after 5 seconds
    const timer = setTimeout(() => {
      if (session) {
        router.replace('/(tabs)/(home)/');
      } else {
        router.replace('/login');
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [session]);

  const astronautTranslateY = astronautAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  return (
    <LinearGradient
      colors={['#FFFFFF', '#FAF5FF', '#FDF4FF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.Text
          style={[
            styles.astronaut,
            {
              transform: [{ translateY: astronautTranslateY }],
            },
          ]}
        >
          🚀
        </Animated.Text>
        
        <LinearGradient
          colors={colors.gradientPurple}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.logoContainer}
        >
          <Text style={styles.logoText}>JAXE</Text>
        </LinearGradient>
        
        <Text style={styles.subtitle}>One</Text>
        
        <View style={styles.taglineContainer}>
          <Text style={styles.tagline}>Level up your creator journey.</Text>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  astronaut: {
    fontSize: 80,
    marginBottom: 40,
  },
  logoContainer: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 24,
    marginBottom: 12,
  },
  logoText: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 40,
  },
  taglineContainer: {
    paddingHorizontal: 40,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
