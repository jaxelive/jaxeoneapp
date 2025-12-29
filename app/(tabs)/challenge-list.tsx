
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import { useCreatorData } from '@/hooks/useCreatorData';
import { IconSymbol } from '@/components/IconSymbol';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';

interface Challenge {
  id: string;
  title: string;
  description: string;
  total_days: number;
}

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
  id: string;
  day_number: number;
  status: 'locked' | 'active' | 'missed' | 'completed' | 'skipped';
  available_at: string | null;
  expires_at: string | null;
  completed_at: string | null;
  completed_late: boolean;
  skipped_at: string | null;
}

interface UserChallenge {
  id: string;
  started_at: string | null;
  status: string;
}

export default function ChallengeListScreen() {
  const { creator } = useCreatorData();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [challengeDays, setChallengeDays] = useState<ChallengeDay[]>([]);
  const [progress, setProgress] = useState<DayProgress[]>([]);
  const [userChallenge, setUserChallenge] = useState<UserChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for live countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Get auth user ID
  useEffect(() => {
    const getAuthUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('[Challenge] Error getting auth user:', error);
          return;
        }

        if (user) {
          console.log('[Challenge] Auth user ID:', user.id);
          setAuthUserId(user.id);
        } else {
          console.warn('[Challenge] No authenticated user found');
        }
      } catch (error) {
        console.error('[Challenge] Error in getAuthUser:', error);
      }
    };

    getAuthUser();
  }, []);

  const fetchChallengeData = useCallback(async () => {
    if (!authUserId) {
      console.log('[Challenge] No auth user ID available yet');
      return;
    }

    try {
      setLoading(true);
      console.log('[Challenge] Fetching challenge data for user:', authUserId);

      // Fetch challenge info (with dynamic total_days)
      const { data: challengeData, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('status', 'published')
        .limit(1)
        .single();

      if (challengeError) {
        console.error('[Challenge] Challenge fetch error:', challengeError);
        throw challengeError;
      }

      console.log('[Challenge] Challenge loaded:', challengeData.title, 'Total days:', challengeData.total_days);
      setChallenge(challengeData);

      // Fetch all challenge days
      const { data: daysData, error: daysError } = await supabase
        .from('challenge_days')
        .select('*')
        .eq('challenge_id', challengeData.id)
        .order('day_number', { ascending: true });

      if (daysError) throw daysError;
      console.log('[Challenge] Challenge days loaded:', daysData?.length);
      setChallengeDays(daysData || []);

      // Fetch user challenge
      const { data: userChallengeData, error: userChallengeError } = await supabase
        .from('user_challenge_progress')
        .select('*')
        .eq('user_id', authUserId)
        .eq('challenge_id', challengeData.id)
        .maybeSingle();

      if (userChallengeError && userChallengeError.code !== 'PGRST116') {
        console.error('[Challenge] Error fetching user challenge:', userChallengeError);
      }
      console.log('[Challenge] User challenge status:', userChallengeData?.status || 'Not started');
      setUserChallenge(userChallengeData);

      // Fetch user progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_day_progress')
        .select('*')
        .eq('user_id', authUserId)
        .eq('challenge_id', challengeData.id);

      if (progressError && progressError.code !== 'PGRST116') {
        console.error('[Challenge] Error fetching progress:', progressError);
      }

      console.log('[Challenge] User progress loaded:', progressData?.length || 0, 'days');
      setProgress(progressData || []);
    } catch (error: any) {
      console.error('[Challenge] Error fetching challenge data:', error);
      Alert.alert('Error', 'Failed to load challenge data');
    } finally {
      setLoading(false);
    }
  }, [authUserId]);

  useEffect(() => {
    if (authUserId) {
      fetchChallengeData();
    }
  }, [authUserId, fetchChallengeData]);

  const getDayStatus = (dayNumber: number): 'locked' | 'active' | 'missed' | 'completed' | 'skipped' => {
    const dayProgress = progress.find((p) => p.day_number === dayNumber);
    
    if (!dayProgress) {
      return 'locked';
    }

    const now = new Date();
    
    // Check completed
    if (dayProgress.completed_at) {
      return 'completed';
    }

    // Check skipped
    if (dayProgress.skipped_at) {
      return 'skipped';
    }

    // Check if available
    if (dayProgress.available_at) {
      const availableAt = new Date(dayProgress.available_at);
      const expiresAt = dayProgress.expires_at ? new Date(dayProgress.expires_at) : null;

      // Not yet available
      if (now < availableAt) {
        return 'locked';
      }

      // Within 24h window
      if (expiresAt && now <= expiresAt) {
        return 'active';
      }

      // Expired
      if (expiresAt && now > expiresAt) {
        return 'missed';
      }
    }

    return dayProgress.status;
  };

  const getTimeRemaining = (dayNumber: number): string | null => {
    const dayProgress = progress.find((p) => p.day_number === dayNumber);
    if (!dayProgress) return null;

    const now = currentTime;
    const status = getDayStatus(dayNumber);

    if (status === 'locked' && dayProgress.available_at) {
      const availableAt = new Date(dayProgress.available_at);
      const diff = availableAt.getTime() - now.getTime();
      if (diff > 0) {
        return formatTimeDiff(diff);
      }
    }

    if (status === 'active' && dayProgress.expires_at) {
      const expiresAt = new Date(dayProgress.expires_at);
      const diff = expiresAt.getTime() - now.getTime();
      if (diff > 0) {
        return formatTimeDiff(diff);
      }
    }

    return null;
  };

  const formatTimeDiff = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const isUrgent = (dayNumber: number): boolean => {
    const dayProgress = progress.find((p) => p.day_number === dayNumber);
    if (!dayProgress || !dayProgress.expires_at) return false;

    const now = currentTime;
    const expiresAt = new Date(dayProgress.expires_at);
    const diff = expiresAt.getTime() - now.getTime();
    const twoHours = 2 * 60 * 60 * 1000;

    return diff > 0 && diff < twoHours;
  };

  const getEndsAtTime = (dayNumber: number): string | null => {
    const dayProgress = progress.find((p) => p.day_number === dayNumber);
    if (!dayProgress || !dayProgress.expires_at) return null;

    const expiresAt = new Date(dayProgress.expires_at);
    return expiresAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleStartChallenge = async () => {
    if (!authUserId || !challenge) {
      console.error('[Challenge] Cannot start challenge: missing authUserId or challenge');
      return;
    }

    try {
      console.log('[Challenge] Starting challenge for user:', authUserId);
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // Create user challenge
      const { error: challengeError } = await supabase
        .from('user_challenge_progress')
        .insert({
          user_id: authUserId,
          challenge_id: challenge.id,
          status: 'in_progress',
          started_at: now,
          current_day: 1,
        });

      if (challengeError) {
        console.error('[Challenge] Error creating user challenge:', challengeError);
        throw challengeError;
      }

      // Get day 1 info
      const day1 = challengeDays.find((d) => d.day_number === 1);
      if (!day1) {
        console.error('[Challenge] Day 1 not found');
        throw new Error('Day 1 not found');
      }

      // Create day 1 progress
      const { error: progressError } = await supabase
        .from('user_day_progress')
        .insert({
          user_id: authUserId,
          challenge_id: challenge.id,
          day_id: day1.id,
          day_number: 1,
          status: 'active',
          available_at: now,
          expires_at: expiresAt,
        });

      if (progressError) {
        console.error('[Challenge] Error creating day 1 progress:', progressError);
        throw progressError;
      }

      console.log('[Challenge] Challenge started successfully');
      // Refresh data
      await fetchChallengeData();
      Alert.alert('Success', 'Challenge started! Day 1 is now active.');
    } catch (error: any) {
      console.error('[Challenge] Error starting challenge:', error);
      Alert.alert('Error', error.message || 'Failed to start challenge');
    }
  };

  const handleCompleteDay = async (day: ChallengeDay) => {
    if (!authUserId || !challenge) return;

    const status = getDayStatus(day.day_number);
    if (status !== 'active' && status !== 'missed') return;

    try {
      console.log('[Challenge] Completing day:', day.day_number);
      const now = new Date().toISOString();
      const dayProgress = progress.find((p) => p.day_number === day.day_number);
      const isLate = status === 'missed';

      // Mark day as completed
      const { error: updateError } = await supabase
        .from('user_day_progress')
        .update({
          status: 'completed',
          completed_at: now,
          completed_late: isLate,
        })
        .eq('id', dayProgress!.id);

      if (updateError) {
        console.error('[Challenge] Error updating day progress:', updateError);
        throw updateError;
      }

      // Unlock next day if exists
      if (day.day_number < (challenge.total_days || 21)) {
        const nextDay = challengeDays.find((d) => d.day_number === day.day_number + 1);
        if (nextDay) {
          const nextAvailableAt = new Date().toISOString();
          const nextExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

          // Check if next day progress exists
          const existingNextDay = progress.find((p) => p.day_number === day.day_number + 1);

          if (existingNextDay) {
            await supabase
              .from('user_day_progress')
              .update({
                status: 'active',
                available_at: nextAvailableAt,
                expires_at: nextExpiresAt,
              })
              .eq('id', existingNextDay.id);
          } else {
            await supabase
              .from('user_day_progress')
              .insert({
                user_id: authUserId,
                challenge_id: challenge.id,
                day_id: nextDay.id,
                day_number: nextDay.day_number,
                status: 'active',
                available_at: nextAvailableAt,
                expires_at: nextExpiresAt,
              });
          }
        }
      }

      console.log('[Challenge] Day completed successfully');
      // Refresh data
      await fetchChallengeData();
      Alert.alert('Success', isLate ? 'Day completed (late)!' : 'Day completed!');
    } catch (error: any) {
      console.error('[Challenge] Error completing day:', error);
      Alert.alert('Error', error.message || 'Failed to complete day');
    }
  };

  const handleSkipDay = async (day: ChallengeDay) => {
    if (!authUserId || !challenge) return;

    const status = getDayStatus(day.day_number);
    if (status !== 'missed') return;

    try {
      console.log('[Challenge] Skipping day:', day.day_number);
      const now = new Date().toISOString();
      const dayProgress = progress.find((p) => p.day_number === day.day_number);

      // Mark day as skipped
      const { error: updateError } = await supabase
        .from('user_day_progress')
        .update({
          status: 'skipped',
          skipped_at: now,
        })
        .eq('id', dayProgress!.id);

      if (updateError) {
        console.error('[Challenge] Error skipping day:', updateError);
        throw updateError;
      }

      // Unlock next day if exists
      if (day.day_number < (challenge.total_days || 21)) {
        const nextDay = challengeDays.find((d) => d.day_number === day.day_number + 1);
        if (nextDay) {
          const nextAvailableAt = new Date().toISOString();
          const nextExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

          const existingNextDay = progress.find((p) => p.day_number === day.day_number + 1);

          if (existingNextDay) {
            await supabase
              .from('user_day_progress')
              .update({
                status: 'active',
                available_at: nextAvailableAt,
                expires_at: nextExpiresAt,
              })
              .eq('id', existingNextDay.id);
          } else {
            await supabase
              .from('user_day_progress')
              .insert({
                user_id: authUserId,
                challenge_id: challenge.id,
                day_id: nextDay.id,
                day_number: nextDay.day_number,
                status: 'active',
                available_at: nextAvailableAt,
                expires_at: nextExpiresAt,
              });
          }
        }
      }

      console.log('[Challenge] Day skipped successfully');
      // Refresh data
      await fetchChallengeData();
      Alert.alert('Success', 'Day skipped. Next day unlocked.');
    } catch (error: any) {
      console.error('[Challenge] Error skipping day:', error);
      Alert.alert('Error', error.message || 'Failed to skip day');
    }
  };

  const completedCount = progress.filter((p) => p.status === 'completed').length;
  const totalDays = challenge?.total_days || 21;
  const progressPercentage = (completedCount / totalDays) * 100;
  const hasStarted = !!userChallenge;

  if (loading || !fontsLoaded || !authUserId) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Challenge',
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

  if (!challenge) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Challenge',
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.centerContent}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="warning"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.errorText}>No challenge available</Text>
          <Text style={styles.errorSubtext}>
            The 21-Day JAXE LIVE Creator Challenge will be available soon!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: challenge.title,
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
          <Text style={styles.headerTitle}>{challenge.title}</Text>
          <Text style={styles.headerSubtitle}>{challenge.description}</Text>
        </View>

        {/* Start Challenge Button */}
        {!hasStarted && (
          <TouchableOpacity style={styles.startChallengeButton} onPress={handleStartChallenge}>
            <Text style={styles.startChallengeButtonText}>Start Challenge</Text>
            <IconSymbol
              ios_icon_name="arrow.right"
              android_material_icon_name="arrow-forward"
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        )}

        {/* Progress Card */}
        {hasStarted && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Your Progress</Text>
              <Text style={styles.progressValue}>{completedCount}/{totalDays} Days</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {completedCount === totalDays
                ? '🎉 Challenge completed! Amazing work!'
                : `${totalDays - completedCount} days remaining`}
            </Text>
          </View>
        )}

        {/* Days List */}
        <View style={styles.daysContainer}>
          {challengeDays.map((day, index) => {
            const status = getDayStatus(day.day_number);
            const timeRemaining = getTimeRemaining(day.day_number);
            const endsAt = getEndsAtTime(day.day_number);
            const urgent = isUrgent(day.day_number);
            const dayProgress = progress.find((p) => p.day_number === day.day_number);

            return (
              <React.Fragment key={day.id}>
                <View
                  style={[
                    styles.dayCard,
                    status === 'completed' && styles.dayCardCompleted,
                    status === 'locked' && styles.dayCardLocked,
                    status === 'active' && urgent && styles.dayCardUrgent,
                  ]}
                >
                  <View style={styles.dayCardLeft}>
                    <View
                      style={[
                        styles.dayCircle,
                        status === 'completed' && styles.dayCircleCompleted,
                        status === 'locked' && styles.dayCircleLocked,
                        status === 'skipped' && styles.dayCircleSkipped,
                        status === 'active' && urgent && styles.dayCircleUrgent,
                      ]}
                    >
                      {status === 'completed' ? (
                        <IconSymbol
                          ios_icon_name="checkmark"
                          android_material_icon_name="check"
                          size={24}
                          color="#FFFFFF"
                        />
                      ) : status === 'locked' ? (
                        <IconSymbol
                          ios_icon_name="lock.fill"
                          android_material_icon_name="lock"
                          size={20}
                          color="#707070"
                        />
                      ) : status === 'skipped' ? (
                        <IconSymbol
                          ios_icon_name="xmark"
                          android_material_icon_name="close"
                          size={24}
                          color="#FFFFFF"
                        />
                      ) : (
                        <Text style={styles.dayNumber}>{day.day_number}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.dayCardContent}>
                    <View style={styles.dayCardHeader}>
                      <Text style={[styles.dayTitle, status === 'locked' && styles.dayTitleLocked]}>
                        Day {day.day_number}: {day.title}
                      </Text>
                      {day.requires_admin_validation && (
                        <View style={styles.requiredBadge}>
                          <Text style={styles.requiredBadgeText}>REQUIRED</Text>
                        </View>
                      )}
                    </View>
                    
                    <Text
                      style={[styles.dayObjective, status === 'locked' && styles.dayObjectiveLocked]}
                      numberOfLines={2}
                    >
                      {day.objective}
                    </Text>

                    {/* Timer Display */}
                    {status === 'locked' && timeRemaining && (
                      <View style={styles.timerContainer}>
                        <IconSymbol
                          ios_icon_name="clock.fill"
                          android_material_icon_name="access-time"
                          size={16}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.timerText}>Unlocks in {timeRemaining}</Text>
                      </View>
                    )}

                    {status === 'active' && timeRemaining && (
                      <View style={styles.activeTimerContainer}>
                        <View style={[styles.timerBar, urgent && styles.timerBarUrgent]}>
                          <View style={styles.timerBarFill} />
                        </View>
                        <View style={styles.activeTimerRow}>
                          <Text style={[styles.activeTimerText, urgent && styles.activeTimerTextUrgent]}>
                            Time left: {timeRemaining}
                          </Text>
                          {endsAt && (
                            <Text style={styles.endsAtText}>Ends at {endsAt}</Text>
                          )}
                        </View>
                        {urgent && (
                          <View style={styles.urgentBadge}>
                            <Text style={styles.urgentBadgeText}>⚠️ URGENT</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {status === 'completed' && dayProgress?.completed_at && (
                      <View style={styles.completedInfo}>
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check-circle"
                          size={16}
                          color={colors.success}
                        />
                        <Text style={styles.completedText}>
                          Completed at {new Date(dayProgress.completed_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                          {dayProgress.completed_late && ' (Late)'}
                        </Text>
                      </View>
                    )}

                    {status === 'skipped' && (
                      <View style={styles.skippedInfo}>
                        <Text style={styles.skippedText}>Skipped</Text>
                      </View>
                    )}

                    {status === 'missed' && (
                      <View style={styles.missedInfo}>
                        <Text style={styles.missedText}>Window expired</Text>
                      </View>
                    )}

                    {/* Action Buttons */}
                    {status === 'active' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.completeButton]}
                        onPress={() => handleCompleteDay(day)}
                      >
                        <Text style={styles.actionButtonText}>Complete Day</Text>
                        <IconSymbol
                          ios_icon_name="checkmark"
                          android_material_icon_name="check"
                          size={16}
                          color="#FFFFFF"
                        />
                      </TouchableOpacity>
                    )}

                    {status === 'missed' && (
                      <View style={styles.missedActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.completeAnywayButton]}
                          onPress={() => handleCompleteDay(day)}
                        >
                          <Text style={styles.actionButtonText}>Complete Anyway</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.skipButton]}
                          onPress={() => handleSkipDay(day)}
                        >
                          <Text style={styles.skipButtonText}>Skip & Continue</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>

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
    padding: 40,
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
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
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
  startChallengeButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  startChallengeButtonText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
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
    alignItems: 'flex-start',
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
  dayCardUrgent: {
    borderWidth: 2,
    borderColor: colors.warning,
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
  dayCircleSkipped: {
    backgroundColor: colors.textSecondary,
  },
  dayCircleUrgent: {
    backgroundColor: colors.warning,
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
    marginBottom: 6,
    flexWrap: 'wrap',
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
  dayObjective: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  dayObjectiveLocked: {
    color: colors.textTertiary,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  timerText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textSecondary,
  },
  activeTimerContainer: {
    marginBottom: 12,
  },
  timerBar: {
    height: 8,
    backgroundColor: colors.grey,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  timerBarUrgent: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  timerBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    width: '100%',
  },
  activeTimerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activeTimerText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
  },
  activeTimerTextUrgent: {
    color: colors.warning,
  },
  endsAtText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  urgentBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  urgentBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  completedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  completedText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: colors.success,
  },
  skippedInfo: {
    marginBottom: 8,
  },
  skippedText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textSecondary,
  },
  missedInfo: {
    marginBottom: 8,
  },
  missedText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.error,
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  completeButton: {
    backgroundColor: colors.primary,
  },
  completeAnywayButton: {
    backgroundColor: colors.primary,
    flex: 1,
  },
  skipButton: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
  },
  actionButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  skipButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
  },
  missedActions: {
    flexDirection: 'row',
    gap: 8,
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
