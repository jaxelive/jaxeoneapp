
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { usePathname, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';
import { BlurView } from 'expo-blur';

export interface TabBarItem {
  name: string;
  route: string;
  icon: string;
  label: string;
}

interface FloatingTabBarProps {
  tabs: TabBarItem[];
}

export default function FloatingTabBar({ tabs }: FloatingTabBarProps) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isActive = (route: string) => {
    if (route === '/(tabs)/(home)/') {
      return pathname === '/(tabs)/(home)/' || pathname === '/(tabs)/(home)';
    }
    return pathname.startsWith(route);
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      <BlurView intensity={80} tint="light" style={styles.blurContainer}>
        <View style={styles.tabBar}>
          {tabs.map((tab, index) => {
            const active = isActive(tab.route);
            const isHomeTab = tab.name === '(home)';
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.tab,
                  isHomeTab && styles.homeTab,
                ]}
                onPress={() => router.push(tab.route as any)}
                activeOpacity={0.7}
              >
                {isHomeTab ? (
                  <View style={styles.homeIconContainer}>
                    <IconSymbol
                      ios_icon_name="house.fill"
                      android_material_icon_name={tab.icon}
                      size={28}
                      color={active ? colors.primary : colors.text}
                    />
                  </View>
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name={tab.icon}
                      android_material_icon_name={tab.icon}
                      size={24}
                      color={active ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.label,
                        active && styles.labelActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  blurContainer: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  homeTab: {
    flex: 1.2,
  },
  homeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
  },
  labelActive: {
    color: colors.primary,
  },
});
