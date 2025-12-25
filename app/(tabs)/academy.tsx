
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
  RefreshControl,
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

interface LiveEvent {
  id: string;
  event_name: string;
  language: string;
  event_info: string;
  event_link: string;
  event_date: string;
  event_hour: string;
  region: string | null;
}

// Hardcoded creator handle - no authentication needed
const CREATOR_HANDLE = 'avelezsanti';

export default function AcademyScreen() {
  const { creator } = useCreatorData(CREATOR_HANDLE);
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [videoProgress, setVideoProgress] = useState<VideoProgress[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[Academy] Component mounted for creator:', CREATOR_HANDLE);
    fetchAcademyData();
  }, []);

  const fetchAcademyData = async () => {
    try {
      console.log('[Academy] Starting data fetch for creator:', CREATOR_HANDLE);
      setLoading(true);
      setError(null);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = today.toISOString().split('T')[0];
      console.log('[Academy] Today\'s date:', todayString);

      // Fetch upcoming live events from live_events table
      console.log('[Academy] Fetching live events...');
      const { data: eventsData, error: eventsError } = await supabase
        .from('live_events')
        .select('*')
        .gte('event_date', todayString)
        .order('event_date', { ascending: true })
        .order('event_hour', { ascending: true });

      if (eventsError) {
        console.error('[Academy] Error fetching events:', eventsError);
        setError(`Events fetch error: ${eventsError.message}`);
      } else {
        console.log('[Academy] Live events found:', eventsData?.length || 0);
        setLiveEvents(eventsData || []);
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

      // Fetch video progress for this creator
      console.log('[Academy] Fetching video progress...');
      const { data: progressData, error: progressError } = await supabase
        .from('user_video_progress')
        .select('*')
        .eq('creator_handle', CREATOR_HANDLE);

      if (progressError) {
        console.error('[Academy] Error fetching video progress:', progressError);
        if (progressError.code !== 'PGRST116') {
          setError(`Progress fetch error: ${progressError.message}`);
        }
      } else {
        console.log('[Academy] Video progress fetched:', progressData?.length || 0);
      }

      setVideoProgress(progressData || []);

      // Fetch quiz attempts for this creator
      console.log('[Academy] Fetching quiz attempts...');
      const { data: quizData, error: quizError } = await supabase
        .from('user_quiz_attempts')
        .select('*')
        .eq('creator_handle', CREATOR_HANDLE)
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
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    console.log('[Academy] Manual refresh triggered');
    setRefreshing(true);
    fetchAcademyData();
  }, []);

  const handleJoinEvent = async (event: LiveEvent) => {
    if (!event.event_link) {
      Alert.alert('Error', 'Event link not available yet.');
      return;
    }

    try {
      console.log('[Academy] Opening event link:', event.event_link);
      await Linking.openURL(event.event_link);
    } catch (error) {
      console.error('[Academy] Error opening link:', error);
      Alert.alert('Error', 'Failed to open event link.');
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
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
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Live Events Section */}
        {liveEvents.length > 0 ? (
          <View style={styles.liveEventsSection}>
            <Text style={styles.sectionTitle}>Upcoming LIVE Events</Text>
            {liveEvents.map((event) => (
              <View key={event.id} style={styles.liveEventCard}>
                <View style={styles.liveEventHeader}>
                  <Text style={styles.liveEventName}>{event.event_name}</Text>
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                </View>
                
                {event.event_info && (
                  <Text style={styles.liveEventDescription}>{event.event_info}</Text>
                )}
                
                <View style={styles.liveEventDetails}>
                  <View style={styles.liveEventDetailItem}>
                    <IconSymbol
                      ios_icon_name="calendar"
                      android_material_icon_name="calendar-today"
                      size={16}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.liveEventDetailText}>
                      {formatEventDate(event.event_date)}
                    </Text>
                  </View>
                  <View style={styles.liveEventDetailItem}>
                    <IconSymbol
                      ios_icon_name="clock"
                      android_material_icon_name="access-time"
                      size={16}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.liveEventDetailText}>
                      {event.event_hour}
                    </Text>
                  </View>
                  {event.language && (
                    <View style={styles.liveEventDetailItem}>
                      <IconSymbol
                        ios_icon_name="globe"
                        android_material_icon_name="language"
                        size={16}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.liveEventDetailText}>
                        {event.language}
                      </Text>
                    </View>
                  )}
                  {event.region && (
                    <View style={styles.liveEventDetailItem}>
                      <IconSymbol
                        ios_icon_name="location.fill"
                        android_material_icon_name="location-on"
                        size={16}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.liveEventDetailText}>
                        {event.region}
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.joinEventButton}
                  onPress={() => handleJoinEvent(event)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.joinEventButtonText}>Join Event</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noEventsCard}>
            <IconSymbol
              ios_icon_name="calendar.badge.exclamationmark"
              android_material_icon_name="event-busy"
              size={48}
              color={colors.textSecondary}
            />
            <Text style={styles.noEventsTitle}>No Upcoming Events</Text>
            <Text style={styles.noEventsText}>
              Check back soon for new live events!
            </Text>
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
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 16,
  },
  liveEventsSection: {
    marginBottom: 24,
  },
  liveEventCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  noEventsCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 32,
    marginBottom: 24,
    alignItems: 'center',
  },
  noEventsTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  noEventsText: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  liveEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveEventName: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    flex: 1,
    marginRight: 12,
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
  liveEventDescription: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 22,
  },
  liveEventDetails: {
    gap: 12,
    marginBottom: 20,
  },
  liveEventDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveEventDetailText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: colors.text,
  },
  joinEventButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  joinEventButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
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
