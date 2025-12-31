
import React from 'react';
import { Stack } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';

export default function TabLayout() {
  const tabs: TabBarItem[] = [
    {
      name: '(home)',
      route: '/(tabs)/(home)/',
      icon: 'home',
      label: 'Home',
    },
    {
      name: 'missions',
      route: '/(tabs)/missions',
      icon: 'apps',
      label: 'Tools',
    },
    {
      name: 'profile',
      route: '/(tabs)/profile',
      icon: 'settings',
      label: 'Settings',
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
        <Stack.Screen key="missions" name="missions" />
        <Stack.Screen key="live" name="live" />
        <Stack.Screen key="rewards" name="rewards" />
        <Stack.Screen key="bonuses" name="bonuses" />
        <Stack.Screen key="bonus-details" name="bonus-details" />
        <Stack.Screen key="battles" name="battles" />
        <Stack.Screen key="ai-flyers" name="ai-flyers" />
        <Stack.Screen key="learning-hub" name="learning-hub" />
        <Stack.Screen key="challenge-day-details" name="challenge-day-details" />
        <Stack.Screen key="manager-details" name="manager-details" />
        <Stack.Screen key="manager-portal" name="manager-portal" />
        <Stack.Screen key="creator-detail" name="creator-detail" />
        <Stack.Screen key="shop" name="shop" />
        <Stack.Screen key="profile" name="profile" />
        <Stack.Screen key="notifications" name="notifications" />
        <Stack.Screen key="academy" name="academy" />
        <Stack.Screen key="challenge-list" name="challenge-list" />
        <Stack.Screen key="video-player" name="video-player" />
        <Stack.Screen key="bonifications" name="bonifications" />
      </Stack>
      <FloatingTabBar tabs={tabs} />
    </>
  );
}
