
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { useCreatorData } from '@/hooks/useCreatorData';
import { IconSymbol } from '@/components/IconSymbol';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';

interface BonusTier {
  name: string;
  minDays: number;
  minHours: number;
  minDiamonds: number;
  maxDiamonds: number;
  minPayout: number;
  maxPayout: number;
}

const BONUS_TIERS: BonusTier[] = [
  {
    name: 'Lite',
    minDays: 22,
    minHours: 100,
    minDiamonds: 1600000,
    maxDiamonds: 16000000,
    minPayout: 650,
    maxPayout: 1050,
  },
  {
    name: 'Expert',
    minDays: 20,
    minHours: 60,
    minDiamonds: 500000,
    maxDiamonds: 1599999,
    minPayout: 250,
    maxPayout: 350,
  },
  {
    name: 'Ascensus',
    minDays: 15,
    minHours: 40,
    minDiamonds: 100000,
    maxDiamonds: 499999,
    minPayout: 30,
    maxPayout: 90,
  },
];

function getTierFromDiamonds(diamonds: number, region: string): string {
  // Region-based tier calculation
  const isLatAm = region?.toLowerCase().includes('latin') || region?.toLowerCase().includes('latam');
  
  if (isLatAm) {
    if (diamonds >= 300000) return 'Gold';
    if (diamonds >= 100000) return 'Silver';
  } else {
    // USA & Canada
    if (diamonds >= 500000) return 'Gold';
    if (diamonds >= 200000) return 'Silver';
  }
  
  return 'Rookie';
}

function parseHoursInput(input: string): number {
  // Handle HH:MM format
  if (input.includes(':')) {
    const [hours, minutes] = input.split(':').map(Number);
    return hours + (minutes / 60);
  }
  // Handle decimal or whole numbers
  return parseFloat(input) || 0;
}

function calculateTier(
  daysStreamed: number,
  hoursStreamed: number,
  diamonds: number
): { tier: BonusTier | null; checklist: { tier: string; days: boolean; hours: boolean; diamonds: boolean }[] } {
  const checklist = BONUS_TIERS.map(tier => ({
    tier: tier.name,
    days: daysStreamed >= tier.minDays,
    hours: hoursStreamed >= tier.minHours,
    diamonds: diamonds >= tier.minDiamonds && diamonds <= tier.maxDiamonds,
  }));

  // Evaluate from highest to lowest
  for (const tier of BONUS_TIERS) {
    const daysOk = daysStreamed >= tier.minDays;
    const hoursOk = hoursStreamed >= tier.minHours;
    const diamondsOk = diamonds >= tier.minDiamonds && diamonds <= tier.maxDiamonds;

    if (daysOk && hoursOk && diamondsOk) {
      return { tier, checklist };
    }
  }

  return { tier: null, checklist };
}

export default function BonusDetailsScreen() {
  const { creator, loading: creatorLoading, stats } = useCreatorData();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  // Calculator inputs
  const [calcDays, setCalcDays] = useState('');
  const [calcHours, setCalcHours] = useState('');
  const [calcDiamonds, setCalcDiamonds] = useState('');
  const [calcResult, setCalcResult] = useState<{ tier: BonusTier | null; checklist: any[] } | null>(null);

  // Current month
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Current tier
  const currentTier = creator ? getTierFromDiamonds(creator.total_diamonds || 0, creator.region || '') : 'Rookie';

  const handleCalculate = () => {
    const days = parseInt(calcDays) || 0;
    const hours = parseHoursInput(calcHours);
    const diamonds = parseInt(calcDiamonds) || 0;

    const result = calculateTier(days, hours, diamonds);
    setCalcResult(result);
  };

  if (creatorLoading || !fontsLoaded) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'My Diamonds & Bonus',
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!creator || !stats) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'My Diamonds & Bonus',
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <Text style={styles.errorText}>No creator data available</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Diamonds & Bonus',
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Current Month Label */}
        <Text style={styles.monthLabel}>{currentMonth}</Text>

        {/* Hero Section - Cohesive Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.tierBadge}>
              <IconSymbol
                ios_icon_name="checkmark.seal.fill"
                android_material_icon_name="verified"
                size={24}
                color={currentTier === 'Gold' ? '#FFD700' : currentTier === 'Silver' ? '#C0C0C0' : '#10B981'}
              />
              <Text style={styles.tierText}>{currentTier}</Text>
            </View>
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroLabel}>Monthly Diamonds</Text>
            <AnimatedNumber
              value={creator.diamonds_monthly || 0}
              style={styles.heroDiamonds}
            />
          </View>
        </View>

        {/* Your Bonus for This Month */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your bonus for this month</Text>
          
          <View style={styles.bonusItem}>
            <View style={styles.bonusItemLeft}>
              <IconSymbol
                ios_icon_name="dollarsign.circle.fill"
                android_material_icon_name="attach-money"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.bonusItemText}>Base Bonus</Text>
            </View>
            <Text style={styles.bonusItemValue}>$100</Text>
          </View>

          <View style={styles.bonusItem}>
            <View style={styles.bonusItemLeft}>
              <IconSymbol
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.bonusItemText}>Performance Bonus</Text>
            </View>
            <Text style={styles.bonusItemValue}>$50</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.bonusTotal}>
            <Text style={styles.bonusTotalLabel}>Total Bonus</Text>
            <Text style={styles.bonusTotalValue}>$150</Text>
          </View>
        </View>

        {/* How Bonuses Work - Table */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How Bonuses Work</Text>
          <Text style={styles.cardSubtitle}>Monthly bonus tiers and requirements</Text>

          {BONUS_TIERS.map((tier, index) => (
            <View key={tier.name} style={styles.tierTableCard}>
              <View style={styles.tierTableHeader}>
                <Text style={styles.tierTableName}>{tier.name}</Text>
                <Text style={styles.tierTablePayout}>
                  ${tier.minPayout}–${tier.maxPayout}
                </Text>
              </View>

              <View style={styles.tierTableRequirements}>
                <View style={styles.tierTableRow}>
                  <IconSymbol
                    ios_icon_name="calendar"
                    android_material_icon_name="calendar-today"
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.tierTableText}>≥{tier.minDays} days</Text>
                </View>

                <View style={styles.tierTableRow}>
                  <IconSymbol
                    ios_icon_name="clock"
                    android_material_icon_name="access-time"
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.tierTableText}>≥{tier.minHours} hours</Text>
                </View>

                <View style={styles.tierTableRow}>
                  <IconSymbol
                    ios_icon_name="sparkles"
                    android_material_icon_name="auto-awesome"
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.tierTableText}>
                    {(tier.minDiamonds / 1000).toFixed(0)}K ≤ diamonds {'<'} {(tier.maxDiamonds / 1000000).toFixed(1)}M
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Bonus Calculator */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <IconSymbol
              ios_icon_name="calculator.fill"
              android_material_icon_name="calculate"
              size={32}
              color={colors.primary}
            />
            <Text style={styles.cardTitle}>Bonus Calculator</Text>
          </View>

          <Text style={styles.calculatorSubtitle}>
            Enter your metrics to see which tier you qualify for
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Days Streamed</Text>
            <TextInput
              style={styles.input}
              value={calcDays}
              onChangeText={setCalcDays}
              keyboardType="numeric"
              placeholder="e.g., 21, 23, 24"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Hours Streamed</Text>
            <TextInput
              style={styles.input}
              value={calcHours}
              onChangeText={setCalcHours}
              placeholder="e.g., 100, 65.5, or 65:30"
              placeholderTextColor={colors.textTertiary}
            />
            <Text style={styles.inputHint}>Accepts HH:MM, decimals, or whole numbers</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Diamonds</Text>
            <TextInput
              style={styles.input}
              value={calcDiamonds}
              onChangeText={setCalcDiamonds}
              keyboardType="numeric"
              placeholder="e.g., 1600000"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <TouchableOpacity style={styles.calculateButton} onPress={handleCalculate}>
            <Text style={styles.calculateButtonText}>Calculate Tier</Text>
          </TouchableOpacity>

          {calcResult && (
            <View style={styles.calcResultContainer}>
              <View style={styles.calcResultHeader}>
                <Text style={styles.calcResultTitle}>
                  {calcResult.tier ? `Qualified: ${calcResult.tier.name}` : 'No Tier Qualified'}
                </Text>
                {calcResult.tier && (
                  <Text style={styles.calcResultPayout}>
                    ${calcResult.tier.minPayout}–${calcResult.tier.maxPayout}
                  </Text>
                )}
              </View>

              <Text style={styles.checklistTitle}>Requirements Checklist</Text>
              {calcResult.checklist.map((item, index) => (
                <View key={index} style={styles.checklistSection}>
                  <Text style={styles.checklistTierName}>{item.tier}</Text>
                  <View style={styles.checklistItems}>
                    <View style={styles.checklistItem}>
                      <IconSymbol
                        ios_icon_name={item.days ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                        android_material_icon_name={item.days ? 'check-circle' : 'cancel'}
                        size={20}
                        color={item.days ? colors.success : colors.error}
                      />
                      <Text style={styles.checklistItemText}>Days</Text>
                    </View>
                    <View style={styles.checklistItem}>
                      <IconSymbol
                        ios_icon_name={item.hours ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                        android_material_icon_name={item.hours ? 'check-circle' : 'cancel'}
                        size={20}
                        color={item.hours ? colors.success : colors.error}
                      />
                      <Text style={styles.checklistItemText}>Hours</Text>
                    </View>
                    <View style={styles.checklistItem}>
                      <IconSymbol
                        ios_icon_name={item.diamonds ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                        android_material_icon_name={item.diamonds ? 'check-circle' : 'cancel'}
                        size={20}
                        color={item.diamonds ? colors.success : colors.error}
                      />
                      <Text style={styles.checklistItemText}>Diamonds</Text>
                    </View>
                  </View>
                </View>
              ))}

              {!calcResult.tier && (
                <View style={styles.noTierMessage}>
                  <IconSymbol
                    ios_icon_name="info.circle.fill"
                    android_material_icon_name="info"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={styles.noTierMessageText}>
                    You need to meet all requirements (days, hours, and diamonds) to qualify for a tier.
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.error,
    textAlign: 'center',
    padding: 20,
  },
  monthLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  heroCard: {
    backgroundColor: '#6642EF',
    borderRadius: 24,
    padding: 32,
    marginBottom: 24,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 24,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  tierText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  heroContent: {
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
  },
  heroDiamonds: {
    fontSize: 64,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  card: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    marginBottom: 20,
  },
  bonusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  bonusItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bonusItemText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.text,
  },
  bonusItemValue: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  bonusTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
  },
  bonusTotalLabel: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
  },
  bonusTotalValue: {
    fontSize: 24,
    fontFamily: 'Poppins_800ExtraBold',
    color: colors.primary,
  },
  tierTableCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  tierTableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tierTableName: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
  },
  tierTablePayout: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
  },
  tierTableRequirements: {
    gap: 8,
  },
  tierTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierTableText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  calculatorSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputHint: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    marginTop: 6,
  },
  calculateButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  calculateButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  calcResultContainer: {
    marginTop: 20,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
  },
  calcResultHeader: {
    marginBottom: 16,
  },
  calcResultTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 4,
  },
  calcResultPayout: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
  checklistTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    marginBottom: 12,
  },
  checklistSection: {
    marginBottom: 12,
  },
  checklistTierName: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 8,
  },
  checklistItems: {
    flexDirection: 'row',
    gap: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checklistItemText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  noTierMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
  },
  noTierMessageText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
