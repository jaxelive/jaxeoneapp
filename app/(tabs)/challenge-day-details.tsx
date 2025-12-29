
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import { IconSymbol } from '@/components/IconSymbol';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';

interface ChallengeDayData {
  id: string;
  day_number: number;
  title: string;
  description: string;
  objective: string;
  time_goal_live: number;
  requires_admin_validation: boolean;
}

// Hardcoded creator handle - no authentication needed for testing
const CREATOR_HANDLE = 'avelezsanti';

export default function ChallengeDayDetailsScreen() {
  const { dayId, dayNumber } = useLocalSearchParams<{ dayId: string; dayNumber: string }>();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [dayData, setDayData] = useState<ChallengeDayData | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDayData = useCallback(async () => {
    if (!dayId) return;

    try {
      setLoading(true);

      // Fetch day data from challenge_days table
      const { data: dayInfo, error: dayError } = await supabase
        .from('challenge_days')
        .select('*')
        .eq('id', dayId)
        .single();

      if (dayError) throw dayError;
      setDayData(dayInfo);

      // Check if day is completed using creator_handle
      const { data: progressData, error: progressError } = await supabase
        .from('user_day_progress')
        .select('*')
        .eq('creator_handle', CREATOR_HANDLE)
        .eq('day_number', parseInt(dayNumber))
        .single();

      if (progressError && progressError.code !== 'PGRST116') {
        console.error('Error fetching progress:', progressError);
      }

      setIsCompleted(progressData?.status === 'completed');
    } catch (error: any) {
      console.error('Error fetching day data:', error);
    } finally {
      setLoading(false);
    }
  }, [dayId, dayNumber]);

  useEffect(() => {
    fetchDayData();
  }, [dayId, dayNumber]);

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: `Day ${dayNumber}`,
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading challenge...</Text>
        </View>
      </View>
    );
  }

  if (!dayData) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: `Day ${dayNumber}`,
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Challenge day not found</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `Day ${dayNumber}`,
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Day Header */}
        <View style={styles.headerCard}>
          <View style={styles.dayBadge}>
            <Text style={styles.dayBadgeText}>Day {dayData.day_number}</Text>
          </View>
        </View>

        {/* Title Card */}
        <View style={styles.card}>
          <Text style={styles.title}>{dayData.title}</Text>
          {isCompleted && (
            <View style={styles.completedBadge}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={20}
                color={colors.success}
              />
              <Text style={styles.completedText}>Completed</Text>
            </View>
          )}
        </View>

        {/* Description Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <IconSymbol
              ios_icon_name="doc.text.fill"
              android_material_icon_name="description"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.cardTitle}>Description</Text>
          </View>
          <Text style={styles.description}>{dayData.description}</Text>
        </View>

        {/* Objective Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <IconSymbol
              ios_icon_name="target"
              android_material_icon_name="track-changes"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.cardTitle}>Objective</Text>
          </View>
          <Text style={styles.objective}>{dayData.objective}</Text>
        </View>

        {/* Time Goal Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <IconSymbol
              ios_icon_name="clock.fill"
              android_material_icon_name="access-time"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.cardTitle}>LIVE Time Goal</Text>
          </View>
          <View style={styles.timeGoalContainer}>
            <Text style={styles.timeGoalValue}>{dayData.time_goal_live}</Text>
            <Text style={styles.timeGoalLabel}>minutes</Text>
          </View>
        </View>

        {/* Required Badge */}
        {dayData.requires_admin_validation && (
          <View style={styles.requiredCard}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={24}
              color={colors.warning}
            />
            <Text style={styles.requiredText}>This challenge day is required</Text>
          </View>
        )}

        {isCompleted && (
          <View style={styles.completedCard}>
            <IconSymbol
              ios_icon_name="checkmark.seal.fill"
              android_material_icon_name="verified"
              size={48}
              color={colors.success}
            />
            <Text style={styles.completedCardTitle}>Challenge Completed!</Text>
            <Text style={styles.completedCardText}>
              Great job! Keep up the momentum and continue to the next day.
            </Text>
          </View>
        )}
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
  },
  headerCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  dayBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  dayBadgeText: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 12,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.grey,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  completedText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.success,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
  },
  description: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    lineHeight: 24,
  },
  objective: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    lineHeight: 24,
  },
  timeGoalContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  timeGoalValue: {
    fontSize: 48,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
  },
  timeGoalLabel: {
    fontSize: 20,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  requiredCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.warning,
  },
  requiredText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
  },
  completedCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  completedCardTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  completedCardText: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
