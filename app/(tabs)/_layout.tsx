
import React from 'react';
import { Stack } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';

export default function TabLayout() {
  const tabs: TabBarItem[] = [
    {
      name: 'bonuses',
      route: '/(tabs)/bonuses',
      icon: 'attach-money',
      label: 'Bonuses',
    },
    {
      name: 'battles',
      route: '/(tabs)/battles',
      icon: 'sports-kabaddi',
      label: 'Battles',
    },
    {
      name: '(home)',
      route: '/(tabs)/(home)/',
      icon: 'home',
      label: 'Home',
    },
    {
      name: 'ai-flyers',
      route: '/(tabs)/ai-flyers',
      icon: 'auto-awesome',
      label: 'AI Flyers',
    },
    {
      name: 'shop',
      route: '/(tabs)/shop',
      icon: 'shopping-bag',
      label: 'Shop',
    },
    {
      name: 'profile',
      route: '/(tabs)/profile',
      icon: 'person',
      label: 'Profile',
    },
  ];

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <Stack.Screen key="home" name="(home)" />
        <Stack.Screen key="bonuses" name="bonuses" />
        <Stack.Screen key="battles" name="battles" />
        <Stack.Screen key="ai-flyers" name="ai-flyers" />
        <Stack.Screen key="shop" name="shop" />
        <Stack.Screen key="profile" name="profile" />
      </Stack>
      <FloatingTabBar tabs={tabs} />
    </>
  );
}
