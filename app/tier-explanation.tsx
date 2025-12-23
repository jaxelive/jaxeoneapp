
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';

interface TierInfo {
  name: string;
  color: string;
  icon: string;
  iconAndroid: string;
  description: string;
  requirements: {
    latam: { silver: number; gold: number };
    usaCanada: { silver: number; gold: number };
  };
}

const TIERS: TierInfo[] = [
  {
    name: 'Rookie',
    color: '#10B981',
    icon: 'checkmark.seal.fill',
    iconAndroid: 'verified',
    description: 'Starting tier for all new creators. Build your foundation and grow your audience.',
    requirements: {
      latam: { silver: 100000, gold: 300000 },
      usaCanada: { silver: 200000, gold: 500000 },
    },
  },
  {
    name: 'Silver',
    color: '#C0C0C0',
    icon: 'checkmark.seal.fill',
    iconAndroid: 'verified',
    description: 'Achieved by reaching diamond milestones. Unlock enhanced benefits and recognition.',
    requirements: {
      latam: { silver: 100000, gold: 300000 },
      usaCanada: { silver: 200000, gold: 500000 },
    },
  },
  {
    name: 'Gold',
    color: '#FFD700',
    icon: 'checkmark.seal.fill',
    iconAndroid: 'verified',
    description: 'Elite tier for top performers. Maximum benefits and exclusive opportunities.',
    requirements: {
      latam: { silver: 100000, gold: 300000 },
      usaCanada: { silver: 200000, gold: 500000 },
    },
  },
];

export default function TierExplanationScreen() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Tier System',
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          presentation: 'modal',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Creator Tier System</Text>
          <Text style={styles.headerSubtitle}>
            Understand how tiers work and what it takes to advance
          </Text>
        </View>

        {/* Important Notice */}
        <View style={styles.noticeCard}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="warning"
            size={32}
            color="#F59E0B"
          />
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>Permanent Progression</Text>
            <Text style={styles.noticeText}>
              Tier progression is one-way only: Rookie → Silver → Gold. Once you reach Silver or Gold, you cannot be downgraded or re-earn these tiers. This is a permanent achievement.
            </Text>
          </View>
        </View>

        {/* Tier Cards */}
        {TIERS.map((tier, index) => (
          <View key={tier.name} style={styles.tierCard}>
            <View style={styles.tierHeader}>
              <View style={[styles.tierIconContainer, { backgroundColor: `${tier.color}20` }]}>
                <IconSymbol
                  ios_icon_name={tier.icon}
                  android_material_icon_name={tier.iconAndroid}
                  size={40}
                  color={tier.color}
                />
              </View>
              <View style={styles.tierHeaderText}>
                <Text style={styles.tierName}>{tier.name}</Text>
                <Text style={styles.tierDescription}>{tier.description}</Text>
              </View>
            </View>

            {/* Requirements */}
            <View style={styles.requirementsSection}>
              <Text style={styles.requirementsTitle}>Diamond Thresholds</Text>
              
              <View style={styles.regionRequirements}>
                <View style={styles.regionCard}>
                  <Text style={styles.regionName}>LatAm</Text>
                  <View style={styles.thresholdRow}>
                    <Text style={styles.thresholdLabel}>Silver:</Text>
                    <Text style={styles.thresholdValue}>
                      {(tier.requirements.latam.silver / 1000).toFixed(0)}K
                    </Text>
                  </View>
                  <View style={styles.thresholdRow}>
                    <Text style={styles.thresholdLabel}>Gold:</Text>
                    <Text style={styles.thresholdValue}>
                      {(tier.requirements.latam.gold / 1000).toFixed(0)}K
                    </Text>
                  </View>
                </View>

                <View style={styles.regionCard}>
                  <Text style={styles.regionName}>USA & Canada</Text>
                  <View style={styles.thresholdRow}>
                    <Text style={styles.thresholdLabel}>Silver:</Text>
                    <Text style={styles.thresholdValue}>
                      {(tier.requirements.usaCanada.silver / 1000).toFixed(0)}K
                    </Text>
                  </View>
                  <View style={styles.thresholdRow}>
                    <Text style={styles.thresholdLabel}>Gold:</Text>
                    <Text style={styles.thresholdValue}>
                      {(tier.requirements.usaCanada.gold / 1000).toFixed(0)}K
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Progression Arrow */}
            {index < TIERS.length - 1 && (
              <View style={styles.progressionArrow}>
                <IconSymbol
                  ios_icon_name="arrow.down"
                  android_material_icon_name="arrow-downward"
                  size={24}
                  color={colors.textTertiary}
                />
              </View>
            )}
          </View>
        ))}

        {/* Key Points */}
        <View style={styles.keyPointsCard}>
          <Text style={styles.keyPointsTitle}>Key Points</Text>
          
          <View style={styles.keyPoint}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.keyPointText}>
              Tiers are based on total diamonds earned
            </Text>
          </View>

          <View style={styles.keyPoint}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.keyPointText}>
              Thresholds vary by region (LatAm vs USA & Canada)
            </Text>
          </View>

          <View style={styles.keyPoint}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.keyPointText}>
              Progression is permanent and cannot be reversed
            </Text>
          </View>

          <View style={styles.keyPoint}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.keyPointText}>
              Higher tiers unlock better bonuses and opportunities
            </Text>
          </View>
        </View>

        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Text style={styles.closeButtonText}>Got it!</Text>
        </TouchableOpacity>
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
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    lineHeight: 24,
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 16,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#92400E',
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#92400E',
    lineHeight: 20,
  },
  tierCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
  },
  tierHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  tierIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierHeaderText: {
    flex: 1,
    justifyContent: 'center',
  },
  tierName: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 4,
  },
  tierDescription: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    lineHeight: 20,
  },
  requirementsSection: {
    marginTop: 16,
  },
  requirementsTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    marginBottom: 12,
  },
  regionRequirements: {
    flexDirection: 'row',
    gap: 12,
  },
  regionCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
  },
  regionName: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 12,
  },
  thresholdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  thresholdLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  thresholdValue: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
  },
  progressionArrow: {
    alignItems: 'center',
    marginTop: 16,
  },
  keyPointsCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
  },
  keyPointsTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 20,
  },
  keyPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  keyPointText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: colors.text,
    lineHeight: 22,
  },
  closeButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
});
