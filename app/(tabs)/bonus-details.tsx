
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
import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { AnimatedCard } from '@/components/AnimatedCard';
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
    name: 'Elite',
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

function getNextBonusTier(currentDays: number, currentHours: number, currentDiamonds: number): BonusTier | null {
  // Find the next tier the user can qualify for
  for (const tier of BONUS_TIERS) {
    const daysOk = currentDays >= tier.minDays;
    const hoursOk = currentHours >= tier.minHours;
    const diamondsOk = currentDiamonds >= tier.minDiamonds && currentDiamonds <= tier.maxDiamonds;

    if (!daysOk || !hoursOk || !diamondsOk) {
      return tier;
    }
  }
  return null;
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

  // Current stats
  const liveDays = creator?.live_days_30d || 0;
  const liveHours = Math.floor((creator?.live_duration_seconds_30d || 0) / 3600);
  const battlesBooked = 1; // Placeholder

  // Requirements completion
  const liveDaysComplete = liveDays >= 15;
  const liveHoursComplete = liveHours >= 40;
  const battlesComplete = battlesBooked >= 1;

  // Next bonus tier
  const nextBonusTier = getNextBonusTier(liveDays, liveHours, creator?.diamonds_monthly || 0);
  const nextBonusProgress = nextBonusTier 
    ? Math.min(100, ((liveDays / nextBonusTier.minDays) + (liveHours / nextBonusTier.minHours) + ((creator?.diamonds_monthly || 0) / nextBonusTier.minDiamonds)) / 3 * 100)
    : 100;

  // Calculate diamonds remaining for next bonus tier
  const diamondsRemaining = nextBonusTier 
    ? Math.max(0, nextBonusTier.minDiamonds - (creator?.diamonds_monthly || 0))
    : 0;

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
        <AnimatedCard delay={0} animationType="fade">
          <Text style={styles.monthLabel}>{currentMonth}</Text>
        </AnimatedCard>

        {/* Hero Section - Cohesive Card with LIVE Hours and LIVE Days */}
        <AnimatedCard delay={100} animationType="fadeSlide">
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

            {/* LIVE Hours and LIVE Days */}
            <View style={styles.liveStatsContainer}>
              <View style={styles.liveStatItem}>
                <IconSymbol
                  ios_icon_name="clock.fill"
                  android_material_icon_name="access-time"
                  size={20}
                  color="rgba(255, 255, 255, 0.9)"
                />
                <Text style={styles.liveStatLabel}>LIVE Hours</Text>
                <AnimatedNumber
                  value={liveHours}
                  style={styles.liveStatValue}
                  formatNumber={false}
                />
              </View>
              <View style={styles.liveStatDivider} />
              <View style={styles.liveStatItem}>
                <IconSymbol
                  ios_icon_name="calendar.badge.clock"
                  android_material_icon_name="calendar-today"
                  size={20}
                  color="rgba(255, 255, 255, 0.9)"
                />
                <Text style={styles.liveStatLabel}>LIVE Days</Text>
                <AnimatedNumber
                  value={liveDays}
                  style={styles.liveStatValue}
                  formatNumber={false}
                />
              </View>
            </View>
          </View>
        </AnimatedCard>

        {/* Your Bonus for This Month - GREEN CARD */}
        <AnimatedCard delay={200} animationType="fadeSlide">
          <View style={styles.bonusCardGreen}>
            <Text style={styles.bonusCardTitle}>Your bonus for this month</Text>
            
            {/* BONUS AMOUNT */}
            <View style={styles.bonusMainSection}>
              <View style={styles.bonusMainAmountContainer}>
                <Text style={styles.bonusMainAmount}>$150</Text>
                <Text style={styles.bonusMainLabel}>Total Bonus</Text>
              </View>
              <View style={styles.bonusPayoutRange}>
                <IconSymbol
                  ios_icon_name="arrow.up.right"
                  android_material_icon_name="trending-up"
                  size={32}
                  color="#FFFFFF"
                />
                <Text style={styles.bonusPayoutRangeText}>$100 - $200 range</Text>
              </View>
            </View>
          </View>
        </AnimatedCard>

        {/* Your Next Bonus Section */}
        <AnimatedCard delay={300} animationType="fadeSlide">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your next bonus</Text>
            
            {nextBonusTier ? (
              <>
                <View style={styles.nextBonusHeader}>
                  <Text style={styles.nextBonusTierName}>{nextBonusTier.name}</Text>
                  <Text style={styles.nextBonusPayout}>
                    ${nextBonusTier.minPayout}–${nextBonusTier.maxPayout}
                  </Text>
                </View>

                {/* Diamonds Remaining Message */}
                <View style={styles.diamondsRemainingContainer}>
                  <IconSymbol
                    ios_icon_name="sparkles"
                    android_material_icon_name="auto-awesome"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.diamondsRemainingText}>
                    <AnimatedNumber 
                      value={diamondsRemaining} 
                      style={styles.diamondsRemainingNumber}
                      formatNumber={true}
                    />
                    <Text style={styles.diamondsRemainingText}> diamonds remaining to reach {nextBonusTier.name}</Text>
                  </Text>
                </View>

                <AnimatedProgressBar
                  percentage={nextBonusProgress}
                  height={12}
                  backgroundColor="rgba(102, 66, 239, 0.2)"
                  fillColor="#10B981"
                  containerStyle={{ marginBottom: 20 }}
                />

                <Text style={styles.requirementsTitle}>Requirements Status</Text>

                {/* LIVE Days */}
                <View style={styles.requirementStatusRow}>
                  <View style={styles.requirementStatusLeft}>
                    <IconSymbol
                      ios_icon_name="calendar"
                      android_material_icon_name="calendar-today"
                      size={20}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.requirementStatusLabel}>LIVE Days</Text>
                  </View>
                  <View style={styles.requirementStatusRight}>
                    <Text style={styles.requirementStatusValue}>
                      {liveDays} / {nextBonusTier.minDays}
                    </Text>
                    {liveDaysComplete ? (
                      <View style={styles.statusCircleComplete}>
                        <IconSymbol 
                          ios_icon_name="checkmark" 
                          android_material_icon_name="check" 
                          size={14} 
                          color="#FFFFFF" 
                        />
                      </View>
                    ) : (
                      <View style={styles.statusCircleEmpty} />
                    )}
                  </View>
                </View>

                {/* LIVE Hours */}
                <View style={styles.requirementStatusRow}>
                  <View style={styles.requirementStatusLeft}>
                    <IconSymbol
                      ios_icon_name="clock"
                      android_material_icon_name="access-time"
                      size={20}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.requirementStatusLabel}>LIVE Hours</Text>
                  </View>
                  <View style={styles.requirementStatusRight}>
                    <Text style={styles.requirementStatusValue}>
                      {liveHours} / {nextBonusTier.minHours}
                    </Text>
                    {liveHoursComplete ? (
                      <View style={styles.statusCircleComplete}>
                        <IconSymbol 
                          ios_icon_name="checkmark" 
                          android_material_icon_name="check" 
                          size={14} 
                          color="#FFFFFF" 
                        />
                      </View>
                    ) : (
                      <View style={styles.statusCircleEmpty} />
                    )}
                  </View>
                </View>

                {/* Battles Booked */}
                <View style={styles.requirementStatusRow}>
                  <View style={styles.requirementStatusLeft}>
                    <IconSymbol
                      ios_icon_name="bolt.fill"
                      android_material_icon_name="flash-on"
                      size={20}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.requirementStatusLabel}>Battles Booked</Text>
                  </View>
                  <View style={styles.requirementStatusRight}>
                    <Text style={styles.requirementStatusValue}>
                      {battlesBooked} / 1
                    </Text>
                    {battlesComplete ? (
                      <View style={styles.statusCircleComplete}>
                        <IconSymbol 
                          ios_icon_name="checkmark" 
                          android_material_icon_name="check" 
                          size={14} 
                          color="#FFFFFF" 
                        />
                      </View>
                    ) : (
                      <View style={styles.statusCircleEmpty} />
                    )}
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.noNextBonusText}>
                You&apos;ve reached the highest bonus tier! Keep up the great work.
              </Text>
            )}
          </View>
        </AnimatedCard>

        {/* How Bonuses Work - Table */}
        <AnimatedCard delay={400} animationType="fadeSlide">
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
        </AnimatedCard>

        {/* Bonus Calculator */}
        <AnimatedCard delay={500} animationType="fadeSlide">
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
        </AnimatedCard>
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
    marginBottom: 24,
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
  
  // LIVE Stats Container
  liveStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  liveStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  liveStatLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 6,
    marginBottom: 4,
  },
  liveStatValue: {
    fontSize: 28,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  liveStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 16,
  },
  
  // BONUS CARD - GREEN BACKGROUND
  bonusCardGreen: {
    backgroundColor: '#10B981',
    borderRadius: 24,
    padding: 28,
    marginBottom: 16,
  },
  bonusCardTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
  },
  bonusMainSection: {
    alignItems: 'center',
  },
  bonusMainAmountContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  bonusMainAmount: {
    fontSize: 72,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#FFFFFF',
    letterSpacing: -3,
    marginBottom: 8,
  },
  bonusMainLabel: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  bonusPayoutRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  bonusPayoutRangeText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
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
  
  // Next Bonus Section
  nextBonusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  nextBonusTierName: {
    fontSize: 24,
    fontFamily: 'Poppins_800ExtraBold',
    color: colors.text,
  },
  nextBonusPayout: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#10B981',
  },
  
  // Diamonds Remaining Container
  diamondsRemainingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  diamondsRemainingText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    flex: 1,
  },
  diamondsRemainingNumber: {
    fontSize: 15,
    fontFamily: 'Poppins_800ExtraBold',
    color: colors.primary,
  },
  
  requirementsTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 16,
  },
  requirementStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  requirementStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  requirementStatusLabel: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
  },
  requirementStatusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  requirementStatusValue: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
  },
  statusCircleComplete: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCircleEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  noNextBonusText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
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
