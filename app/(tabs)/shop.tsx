
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';

export default function ShopScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Shop',
          headerShown: true,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <LinearGradient
          colors={['#FFFFFF', '#DBEAFE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <Text style={styles.emoji}>🛍️</Text>
          <Text style={styles.title}>JAXE Shop</Text>
          <Text style={styles.subtitle}>Coming soon to your region</Text>
        </LinearGradient>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  card: {
    borderRadius: 28,
    padding: 40,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
