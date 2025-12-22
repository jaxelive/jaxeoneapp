
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import { useCreatorData } from '@/hooks/useCreatorData';
import { IconSymbol } from '@/components/IconSymbol';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';

interface ChallengeDay {
  id: string;
  day_number: number;
  title: string;
  description: string;
  objective: string;
  time_goal_live: number;
  requires_admin_validation: boolean;
}

interface DayProgress {
  day_number: number;
  status: string;
  completed_at: string | null;
}

export default function ChallengeListScreen() {
  const { creator } = useCreatorData();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [challengeDays, setChallengeDays] = useState<ChallengeDay[]>([]);
  const [progress, setProgress] = useState<DayProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChallengeData();
  }, [creator]);

  const fetchChallengeData = async () => {
    if (!creator) return;

    try {
      setLoading(true);

      // Fetch all challenge days
      const { data: daysData, error: daysError } = await supabase
        .from('challenge_days')
        .select('*')
        .order('day_number', { ascending: true });

      if (daysError) throw daysError;
      setChallengeDays(daysData || []);

      // Fetch user progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_day_progress')
        .select('*')
        .eq('user_id', creator.id);

      if (progressError && progressError.code !== 'PGRST116') {
        console.error('Error fetching progress:', progressError);
      }

      setProgress(progressData || []);
    } catch (error: any) {
      console.error('Error fetching challenge data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDayStatus = (dayNumber: number): 'completed' | 'unlocked' | 'locked' => {
    const dayProgress = progress.find((p) => p.day_number === dayNumber);
    
    if (dayProgress?.status === 'completed') {
      return 'completed';
    }

    // Day 1 is always unlocked
    if (dayNumber === 1) {
      return 'unlocked';
    }

    // Check if previous day is completed
    const previousDayProgress = progress.find((p) => p.day_number === dayNumber - 1);
    if (previousDayProgress?.status === 'completed') {
      return 'unlocked';
    }

    return 'locked';
  };

  const handleDayPress = (day: ChallengeDay) => {
    const status = getDayStatus(day.day_number);
    if (status === 'locked') {
      return;
    }

    router.push({
      pathname: '/(tabs)/challenge-day-details',
      params: { dayId: day.id, dayNumber: day.day_number.toString() },
    });
  };

  const handleMarkComplete = async (day: ChallengeDay, event: any) => {
    event.stopPropagation();
    
    if (!creator) return;

    const status = getDayStatus(day.day_number);
    if (status === 'locked' || status === 'completed') {
      return;
    }

    try {
      // Mark day as completed
      const { error } = await supabase
        .from('user_day_progress')
        .upsert({
          user_id: creator.id,
          day_number: day.day_number,
          status: 'completed',
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,day_number',
        });

      if (error) throw error;

      // Refresh data
      await fetchChallengeData();
    } catch (error: any) {
      console.error('Error marking day complete:', error);
      Alert.alert('Error', 'Failed to mark day as complete');
    }
  };

  const completedCount = progress.filter((p) => p.status === 'completed').length;
  const progressPercentage = (completedCount / 21) * 100;

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: '21-Day Challenge',
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

  return (
    <>
      <Stack.Screen
        options={{
          title: '21-Day Challenge',
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <IconSymbol
            ios_icon_name="calendar"
            android_material_icon_name="calendar-today"
            size={64}
            color={colors.primary}
          />
          <Text style={styles.headerTitle}>21-Day Challenge</Text>
          <Text style={styles.headerSubtitle}>
            Complete all 21 days to master your creator journey
          </Text>
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Your Progress</Text>
            <Text style={styles.progressValue}>{completedCount}/21 Days</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {completedCount === 21
              ? '🎉 Challenge completed! Amazing work!'
              : `${21 - completedCount} days remaining`}
          </Text>
        </View>

        {/* Days List */}
        <View style={styles.daysContainer}>
          {challengeDays.map((day, index) => {
            const status = getDayStatus(day.day_number);
            const isCompleted = status === 'completed';
            const isLocked = status === 'locked';

            return (
              <React.Fragment key={day.id}>
                <TouchableOpacity
                  style={[
                    styles.dayCard,
                    isCompleted && styles.dayCardCompleted,
                    isLocked && styles.dayCardLocked,
                  ]}
                  onPress={() => handleDayPress(day)}
                  disabled={isLocked}
                  activeOpacity={0.7}
                >
                  <View style={styles.dayCardLeft}>
                    <View
                      style={[
                        styles.dayCircle,
                        isCompleted && styles.dayCircleCompleted,
                        isLocked && styles.dayCircleLocked,
                      ]}
                    >
                      {isCompleted ? (
                        <IconSymbol
                          ios_icon_name="checkmark"
                          android_material_icon_name="check"
                          size={24}
                          color="#FFFFFF"
                        />
                      ) : isLocked ? (
                        <IconSymbol
                          ios_icon_name="lock.fill"
                          android_material_icon_name="lock"
                          size={20}
                          color="#707070"
                        />
                      ) : (
                        <Text style={styles.dayNumber}>{day.day_number}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.dayCardContent}>
                    <View style={styles.dayCardHeader}>
                      <Text style={[styles.dayTitle, isLocked && styles.dayTitleLocked]}>
                        Day {day.day_number}: {day.title}
                      </Text>
                      {day.requires_admin_validation && (
                        <View style={styles.requiredBadge}>
                          <Text style={styles.requiredBadgeText}>REQUIRED</Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[styles.dayDescription, isLocked && styles.dayDescriptionLocked]}
                      numberOfLines={2}
                    >
                      {day.description}
                    </Text>
                    <View style={styles.dayMeta}>
                      <View style={styles.dayMetaItem}>
                        <IconSymbol
                          ios_icon_name="clock.fill"
                          android_material_icon_name="access-time"
                          size={14}
                          color={isLocked ? '#707070' : '#6642EF'}
                        />
                        <Text style={[styles.dayMetaText, isLocked && styles.dayMetaTextLocked, !isLocked && styles.dayMetaTextHighlight]}>
                          {day.time_goal_live} min LIVE
                        </Text>
                      </View>
                    </View>

                    {/* Mark Complete Button */}
                    {!isCompleted && !isLocked && (
                      <TouchableOpacity
                        style={styles.markCompleteButton}
                        onPress={(e) => handleMarkComplete(day, e)}
                      >
                        <Text style={styles.markCompleteButtonText}>Mark Complete</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {!isLocked && (
                    <View style={styles.dayCardRight}>
                      <IconSymbol
                        ios_icon_name="chevron.right"
                        android_material_icon_name="chevron-right"
                        size={20}
                        color="#A0A0A0"
                      />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Week Divider */}
                {(day.day_number === 7 || day.day_number === 14) && (
                  <View style={styles.weekDivider}>
                    <View style={styles.weekDividerLine} />
                    <Text style={styles.weekDividerText}>
                      Week {day.day_number === 7 ? '2' : '3'}
                    </Text>
                    <View style={styles.weekDividerLine} />
                  </View>
                )}
              </React.Fragment>
            );
          })}
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
  headerCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  progressCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
  },
  progressValue: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
  },
  progressBar: {
    height: 12,
    backgroundColor: colors.grey,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  daysContainer: {
    gap: 12,
  },
  dayCard: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 16,
  },
  dayCardCompleted: {
    backgroundColor: 'rgba(102, 66, 239, 0.1)',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayCardLocked: {
    opacity: 0.5,
  },
  dayCardLeft: {
    width: 56,
    height: 56,
  },
  dayCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleCompleted: {
    backgroundColor: colors.success,
  },
  dayCircleLocked: {
    backgroundColor: colors.grey,
  },
  dayNumber: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  dayCardContent: {
    flex: 1,
  },
  dayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  dayTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    flex: 1,
  },
  dayTitleLocked: {
    color: colors.textSecondary,
  },
  requiredBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  requiredBadgeText: {
    fontSize: 9,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  dayDescription: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  dayDescriptionLocked: {
    color: colors.textTertiary,
  },
  dayMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  dayMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayMetaText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  dayMetaTextLocked: {
    color: colors.textTertiary,
  },
  dayMetaTextHighlight: {
    color: colors.primary,
    fontFamily: 'Poppins_700Bold',
  },
  markCompleteButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  markCompleteButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  dayCardRight: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  weekDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  weekDividerText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: colors.textSecondary,
  },
});
