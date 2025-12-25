
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import { useCreatorData } from '@/hooks/useCreatorData';
import { IconSymbol } from '@/components/IconSymbol';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';

interface CourseVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  order_index: number;
  duration_seconds: number | null;
}

interface CourseQuiz {
  id: string;
  title: string;
  description: string | null;
  passing_score: number;
  is_required: boolean;
}

interface ContentItem {
  id: string;
  content_type: 'video' | 'quiz';
  order_index: number;
  video?: CourseVideo;
  quiz?: CourseQuiz;
}

interface VideoProgress {
  video_id: string;
  completed: boolean;
  watched_seconds: number;
}

interface QuizAttempt {
  quiz_id: string;
  passed: boolean;
  score: number;
}

interface LiveTrainingSession {
  id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  duration_minutes: number;
  meeting_link: string | null;
  status: string;
}

interface TrainingRegistration {
  id: string;
  training_session_id: string;
  user_id: string;
  registered_at: string;
  attended: boolean;
}

export default function AcademyScreen() {
  const { creator } = useCreatorData();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [videoProgress, setVideoProgress] = useState<VideoProgress[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [nextTraining, setNextTraining] = useState<LiveTrainingSession | null>(null);
  const [registration, setRegistration] = useState<TrainingRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[Academy] Component mounted');
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      console.log('[Academy] Current user ID set:', currentUserId);
      fetchAcademyData();
    }
  }, [creator, currentUserId]);

  const fetchCurrentUser = async () => {
    try {
      console.log('[Academy] Fetching current user...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('[Academy] Error fetching user:', userError);
        setError(`Auth error: ${userError.message}`);
        setLoading(false);
        return;
      }
      
      if (user) {
        console.log('[Academy] User found:', user.id);
        setCurrentUserId(user.id);
      } else {
        console.error('[Academy] No user found');
        setError('No authenticated user found');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('[Academy] Error fetching current user:', error);
      setError(`Unexpected error: ${error.message}`);
      setLoading(false);
    }
  };

  const fetchAcademyData = async () => {
    if (!currentUserId) {
      console.log('[Academy] No current user ID, skipping data fetch');
      return;
    }

    try {
      console.log('[Academy] Starting data fetch for user:', currentUserId);
      setLoading(true);
      setError(null);

      // Fetch next live training session
      console.log('[Academy] Fetching live training sessions...');
      const { data: trainingData, error: trainingError } = await supabase
        .from('live_training_sessions')
        .select('*')
        .gte('scheduled_date', new Date().toISOString())
        .eq('status', 'scheduled')
        .order('scheduled_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (trainingError) {
        console.error('[Academy] Error fetching training:', trainingError);
        if (trainingError.code !== 'PGRST116') {
          setError(`Training fetch error: ${trainingError.message}`);
        }
      } else if (trainingData) {
        console.log('[Academy] Training session found:', trainingData.id);
        setNextTraining(trainingData);

        // Check if user is registered
        console.log('[Academy] Checking registration status...');
        const { data: regData, error: regError } = await supabase
          .from('training_registrations')
          .select('*')
          .eq('training_session_id', trainingData.id)
          .eq('user_id', currentUserId)
          .maybeSingle();

        if (regError) {
          console.error('[Academy] Error fetching registration:', regError);
          if (regError.code !== 'PGRST116') {
            setError(`Registration fetch error: ${regError.message}`);
          }
        } else {
          console.log('[Academy] Registration status:', regData ? 'Registered' : 'Not registered');
          setRegistration(regData);
        }
      } else {
        console.log('[Academy] No upcoming training sessions found');
      }

      // Fetch course content items with videos and quizzes
      console.log('[Academy] Fetching course content...');
      const { data: contentData, error: contentError } = await supabase
        .from('course_content_items')
        .select(`
          *,
          video:course_videos(*),
          quiz:course_quizzes(*)
        `)
        .order('order_index', { ascending: true });

      if (contentError) {
        console.error('[Academy] Error fetching content:', contentError);
        setError(`Content fetch error: ${contentError.message}`);
        throw contentError;
      }

      console.log('[Academy] Content items fetched:', contentData?.length || 0);

      // Transform data to include video/quiz in the correct structure
      const transformedContent = contentData?.map((item: any) => ({
        id: item.id,
        content_type: item.content_type,
        order_index: item.order_index,
        video: item.content_type === 'video' ? item.video : undefined,
        quiz: item.content_type === 'quiz' ? item.quiz : undefined,
      })) || [];

      setContentItems(transformedContent);

      // Fetch video progress
      console.log('[Academy] Fetching video progress...');
      const { data: progressData, error: progressError } = await supabase
        .from('user_video_progress')
        .select('*')
        .eq('user_id', currentUserId);

      if (progressError) {
        console.error('[Academy] Error fetching video progress:', progressError);
        if (progressError.code !== 'PGRST116') {
          setError(`Progress fetch error: ${progressError.message}`);
        }
      } else {
        console.log('[Academy] Video progress fetched:', progressData?.length || 0);
      }

      setVideoProgress(progressData || []);

      // Fetch quiz attempts
      console.log('[Academy] Fetching quiz attempts...');
      const { data: quizData, error: quizError } = await supabase
        .from('user_quiz_attempts')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (quizError) {
        console.error('[Academy] Error fetching quiz attempts:', quizError);
        if (quizError.code !== 'PGRST116') {
          setError(`Quiz fetch error: ${quizError.message}`);
        }
      } else {
        console.log('[Academy] Quiz attempts fetched:', quizData?.length || 0);
      }

      // Get the latest attempt for each quiz
      const latestAttempts: QuizAttempt[] = [];
      const seenQuizzes = new Set<string>();
      
      quizData?.forEach((attempt: any) => {
        if (!seenQuizzes.has(attempt.quiz_id)) {
          latestAttempts.push({
            quiz_id: attempt.quiz_id,
            passed: attempt.passed,
            score: attempt.score,
          });
          seenQuizzes.add(attempt.quiz_id);
        }
      });

      setQuizAttempts(latestAttempts);
      console.log('[Academy] Data fetch completed successfully');
    } catch (error: any) {
      console.error('[Academy] Error fetching academy data:', error);
      setError(`Failed to load academy content: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!nextTraining || !currentUserId || registering) return;

    try {
      console.log('[Academy] Registering for training:', nextTraining.id);
      setRegistering(true);

      const { data, error } = await supabase
        .from('training_registrations')
        .insert({
          training_session_id: nextTraining.id,
          user_id: currentUserId,
        })
        .select()
        .single();

      if (error) {
        console.error('[Academy] Registration error:', error);
        Alert.alert('Error', `Failed to register: ${error.message}`);
        return;
      }

      console.log('[Academy] Registration successful');
      setRegistration(data);
      Alert.alert('Success', 'You have been registered for the training!');
    } catch (error: any) {
      console.error('[Academy] Error registering:', error);
      Alert.alert('Error', `Failed to register: ${error.message}`);
    } finally {
      setRegistering(false);
    }
  };

  const handleJoinTraining = async () => {
    if (!nextTraining || !registration) return;

    if (!nextTraining.meeting_link) {
      Alert.alert('Error', 'Meeting link not available yet.');
      return;
    }

    try {
      console.log('[Academy] Opening training link:', nextTraining.meeting_link);
      await Linking.openURL(nextTraining.meeting_link);
    } catch (error) {
      console.error('[Academy] Error opening link:', error);
      Alert.alert('Error', 'Failed to open training link.');
    }
  };

  const isTrainingToday = useCallback(() => {
    if (!nextTraining) return false;

    const trainingDate = new Date(nextTraining.scheduled_date);
    const today = new Date();

    return (
      trainingDate.getFullYear() === today.getFullYear() &&
      trainingDate.getMonth() === today.getMonth() &&
      trainingDate.getDate() === today.getDate()
    );
  }, [nextTraining]);

  const canJoinTraining = useCallback(() => {
    return registration && isTrainingToday();
  }, [registration, isTrainingToday]);

  const formatTrainingDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTrainingTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  const isItemUnlocked = (index: number): boolean => {
    // First item is always unlocked
    if (index === 0) return true;

    // Check if previous item is completed
    const previousItem = contentItems[index - 1];
    if (!previousItem) return false;

    if (previousItem.content_type === 'video' && previousItem.video) {
      const progress = videoProgress.find((p) => p.video_id === previousItem.video!.id);
      return progress?.completed || false;
    }

    if (previousItem.content_type === 'quiz' && previousItem.quiz) {
      const attempt = quizAttempts.find((a) => a.quiz_id === previousItem.quiz!.id);
      return attempt?.passed || false;
    }

    return false;
  };

  const isItemCompleted = (item: ContentItem): boolean => {
    if (item.content_type === 'video' && item.video) {
      const progress = videoProgress.find((p) => p.video_id === item.video!.id);
      return progress?.completed || false;
    }

    if (item.content_type === 'quiz' && item.quiz) {
      const attempt = quizAttempts.find((a) => a.quiz_id === item.quiz!.id);
      return attempt?.passed || false;
    }

    return false;
  };

  const handleItemPress = (item: ContentItem, index: number) => {
    if (!isItemUnlocked(index)) {
      Alert.alert('Locked', 'Complete the previous item to unlock this one');
      return;
    }

    if (item.content_type === 'video' && item.video) {
      console.log('[Academy] Opening video:', item.video.id);
      // Navigate to video player page
      router.push({
        pathname: '/(tabs)/video-player',
        params: { 
          videoId: item.video.id,
          videoUrl: item.video.video_url,
          title: item.video.title,
          description: item.video.description || '',
        },
      });
    } else if (item.content_type === 'quiz' && item.quiz) {
      console.log('[Academy] Opening quiz:', item.quiz.id);
      // Navigate to quiz (placeholder for now)
      Alert.alert('Quiz', `Starting quiz: ${item.quiz.title}\n\nQuiz would open here.`);
    }
  };

  const completedVideos = contentItems.filter(
    (item) => item.content_type === 'video' && isItemCompleted(item)
  ).length;
  const totalVideos = contentItems.filter((item) => item.content_type === 'video').length;
  const quizCompleted = contentItems.some(
    (item) => item.content_type === 'quiz' && isItemCompleted(item)
  );

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Academy',
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading academy...</Text>
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>
      </View>
    );
  }

  if (error && !currentUserId) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Academy',
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCurrentUser}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Academy',
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Next LIVE Training Card - Now First and More Prominent */}
        {nextTraining && (
          <View style={styles.liveTrainingCard}>
            <View style={styles.liveTrainingHeader}>
              <Text style={styles.liveTrainingTitle}>Next LIVE Training</Text>
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
            </View>
            <Text style={styles.liveTrainingName}>{nextTraining.title}</Text>
            {nextTraining.description && (
              <Text style={styles.liveTrainingDescription}>{nextTraining.description}</Text>
            )}
            <View style={styles.liveTrainingDetails}>
              <View style={styles.liveTrainingDetailItem}>
                <IconSymbol
                  ios_icon_name="calendar"
                  android_material_icon_name="calendar-today"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.liveTrainingDetailText}>
                  {formatTrainingDate(nextTraining.scheduled_date)}
                </Text>
              </View>
              <View style={styles.liveTrainingDetailItem}>
                <IconSymbol
                  ios_icon_name="clock"
                  android_material_icon_name="access-time"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.liveTrainingDetailText}>
                  {formatTrainingTime(nextTraining.scheduled_date)}
                </Text>
              </View>
            </View>

            {/* Registration and Join Buttons */}
            <View style={styles.trainingActions}>
              {!registration ? (
                <TouchableOpacity
                  style={[styles.registerButton, registering && styles.registerButtonDisabled]}
                  onPress={handleRegister}
                  disabled={registering}
                  activeOpacity={0.7}
                >
                  {registering ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.registerButtonText}>Register</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.registeredButton}>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check-circle"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.registeredButtonText}>Registered</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.joinButton,
                  !canJoinTraining() && styles.joinButtonDisabled,
                ]}
                onPress={handleJoinTraining}
                disabled={!canJoinTraining()}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.joinButtonText,
                    !canJoinTraining() && styles.joinButtonTextDisabled,
                  ]}
                >
                  Join Training
                </Text>
              </TouchableOpacity>
            </View>

            {!registration && (
              <Text style={styles.trainingHint}>Register to join the training</Text>
            )}
            {registration && !isTrainingToday() && (
              <Text style={styles.trainingHint}>
                Join button will be enabled on the day of training
              </Text>
            )}
          </View>
        )}

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Videos</Text>
              <Text style={styles.progressValue}>
                {completedVideos}/{totalVideos}
              </Text>
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Quiz</Text>
              <Text style={styles.progressValue}>{quizCompleted ? '✓' : '—'}</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    ((completedVideos + (quizCompleted ? 1 : 0)) /
                      (totalVideos + 1)) *
                    100
                  }%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Content List - Videos with Thumbnails */}
        <View style={styles.contentList}>
          {contentItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No content available yet</Text>
            </View>
          ) : (
            contentItems.map((item, index) => {
              const isUnlocked = isItemUnlocked(index);
              const isCompleted = isItemCompleted(item);

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.contentCard,
                    isCompleted && styles.contentCardCompleted,
                    !isUnlocked && styles.contentCardLocked,
                  ]}
                  onPress={() => handleItemPress(item, index)}
                  disabled={!isUnlocked}
                  activeOpacity={0.7}
                >
                  {/* Video Thumbnail */}
                  {item.content_type === 'video' && item.video && (
                    <View style={styles.videoThumbnailContainer}>
                      {item.video.thumbnail_url ? (
                        <Image
                          source={{ uri: item.video.thumbnail_url }}
                          style={styles.videoThumbnailImage}
                        />
                      ) : (
                        <View style={styles.videoThumbnailPlaceholder}>
                          <IconSymbol
                            ios_icon_name="play.circle.fill"
                            android_material_icon_name="play-circle"
                            size={40}
                            color={isUnlocked ? colors.primary : '#707070'}
                          />
                        </View>
                      )}
                      {!isUnlocked && (
                        <View style={styles.lockedOverlay}>
                          <IconSymbol
                            ios_icon_name="lock.fill"
                            android_material_icon_name="lock"
                            size={24}
                            color="#FFFFFF"
                          />
                        </View>
                      )}
                      {isCompleted && (
                        <View style={styles.completedBadge}>
                          <IconSymbol
                            ios_icon_name="checkmark.circle.fill"
                            android_material_icon_name="check-circle"
                            size={24}
                            color={colors.success}
                          />
                        </View>
                      )}
                    </View>
                  )}

                  {/* Quiz Icon */}
                  {item.content_type === 'quiz' && (
                    <View style={styles.contentIcon}>
                      {isCompleted ? (
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check-circle"
                          size={40}
                          color={colors.success}
                        />
                      ) : !isUnlocked ? (
                        <IconSymbol
                          ios_icon_name="lock.fill"
                          android_material_icon_name="lock"
                          size={32}
                          color="#707070"
                        />
                      ) : (
                        <IconSymbol
                          ios_icon_name="doc.text.fill"
                          android_material_icon_name="quiz"
                          size={40}
                          color={colors.primary}
                        />
                      )}
                    </View>
                  )}

                  <View style={styles.contentInfo}>
                    <View style={styles.contentHeader}>
                      <Text style={[styles.contentTitle, !isUnlocked && styles.contentTitleLocked]}>
                        {item.content_type === 'video'
                          ? `${index + 1}. ${item.video?.title}`
                          : item.quiz?.title}
                      </Text>
                      {item.content_type === 'quiz' && item.quiz?.is_required && (
                        <View style={styles.requiredBadge}>
                          <Text style={styles.requiredBadgeText}>REQUIRED</Text>
                        </View>
                      )}
                    </View>
                    {item.content_type === 'video' && item.video?.description && (
                      <Text
                        style={[
                          styles.contentDescription,
                          !isUnlocked && styles.contentDescriptionLocked,
                        ]}
                        numberOfLines={2}
                      >
                        {item.video.description}
                      </Text>
                    )}
                    {item.content_type === 'video' && item.video?.duration_seconds && (
                      <Text style={styles.videoDuration}>
                        {Math.floor(item.video.duration_seconds / 60)} min
                      </Text>
                    )}
                    {item.content_type === 'quiz' && item.quiz?.description && (
                      <Text
                        style={[
                          styles.contentDescription,
                          !isUnlocked && styles.contentDescriptionLocked,
                        ]}
                        numberOfLines={2}
                      >
                        {item.quiz.description}
                      </Text>
                    )}
                  </View>

                  {isUnlocked && !isCompleted && (
                    <View style={styles.contentArrow}>
                      <IconSymbol
                        ios_icon_name="chevron.right"
                        android_material_icon_name="chevron-right"
                        size={20}
                        color="#A0A0A0"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <IconSymbol
            ios_icon_name="info.circle.fill"
            android_material_icon_name="info"
            size={24}
            color={colors.primary}
          />
          <Text style={styles.infoText}>
            Complete all videos in order to unlock the quiz. You must pass the quiz to complete the Academy.
          </Text>
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
    padding: 20,
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
    marginTop: 16,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.error,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorBannerText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  liveTrainingCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 3,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  liveTrainingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveTrainingTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  liveBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  liveTrainingName: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 8,
  },
  liveTrainingDescription: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 22,
  },
  liveTrainingDetails: {
    gap: 12,
    marginBottom: 20,
  },
  liveTrainingDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveTrainingDetailText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: colors.text,
  },
  trainingActions: {
    flexDirection: 'row',
    gap: 12,
  },
  registerButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  registeredButton: {
    flex: 1,
    backgroundColor: colors.success,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 52,
  },
  registeredButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  joinButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  joinButtonDisabled: {
    backgroundColor: colors.grey,
    opacity: 0.5,
  },
  joinButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  joinButtonTextDisabled: {
    color: colors.textSecondary,
  },
  trainingHint: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  progressCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
  },
  progressRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  progressItem: {
    flex: 1,
    alignItems: 'center',
  },
  progressDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  progressLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  progressValue: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
  },
  progressBar: {
    height: 12,
    backgroundColor: colors.grey,
    borderRadius: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  contentList: {
    gap: 12,
    marginBottom: 20,
  },
  contentCard: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 16,
  },
  contentCardCompleted: {
    backgroundColor: 'rgba(102, 66, 239, 0.1)',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  contentCardLocked: {
    opacity: 0.5,
  },
  videoThumbnailContainer: {
    width: 120,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  videoThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  videoThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.grey,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  contentIcon: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentInfo: {
    flex: 1,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  contentTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    flex: 1,
  },
  contentTitleLocked: {
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
  contentDescription: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  contentDescriptionLocked: {
    color: colors.textTertiary,
  },
  videoDuration: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.primary,
  },
  contentArrow: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
