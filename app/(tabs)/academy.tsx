
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
import { formatTo12Hour } from '@/utils/timeFormat';
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

interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  contentItems: ContentItem[];
}

interface VideoProgress {
  video_id: string;
  completed: boolean;
  watched_seconds: number;
  progress_percentage: number;
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
  time_zone: string | null;
}

interface LiveEventRegistration {
  live_event_id: string;
  creator_handle: string;
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

  const [courses, setCourses] = useState<Course[]>([]);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState<VideoProgress[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [registrations, setRegistrations] = useState<LiveEventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeringEventId, setRegisteringEventId] = useState<string | null>(null);

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
        eventsData?.forEach((event) => {
          console.log(`[Academy] Event: ${event.event_name} - Date: ${event.event_date} - Hour: ${event.event_hour} - Time Zone: ${event.time_zone}`);
        });
        setLiveEvents(eventsData || []);
      }

      // Fetch registrations for this creator
      console.log('[Academy] Fetching registrations...');
      const { data: registrationsData, error: registrationsError } = await supabase
        .from('live_event_registrations')
        .select('*')
        .eq('creator_handle', CREATOR_HANDLE);

      if (registrationsError) {
        console.error('[Academy] Error fetching registrations:', registrationsError);
      } else {
        console.log('[Academy] Registrations found:', registrationsData?.length || 0);
        setRegistrations(registrationsData || []);
      }

      // Fetch all courses
      console.log('[Academy] Fetching courses...');
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: true });

      if (coursesError) {
        console.error('[Academy] Error fetching courses:', coursesError);
        setError(`Courses fetch error: ${coursesError.message}`);
        throw coursesError;
      }

      console.log('[Academy] Courses fetched:', coursesData?.length || 0);

      // For each course, fetch its content items
      const coursesWithContent: Course[] = [];
      
      for (const course of coursesData || []) {
        console.log(`[Academy] Course: ${course.title} - Cover Image: ${course.cover_image_url || 'None'}`);
        
        const { data: contentData, error: contentError } = await supabase
          .from('course_content_items')
          .select(`
            *,
            video:course_videos(*),
            quiz:course_quizzes(*)
          `)
          .eq('course_id', course.id)
          .order('order_index', { ascending: true });

        if (contentError) {
          console.error('[Academy] Error fetching content for course:', course.id, contentError);
          continue;
        }

        // Transform data to include video/quiz in the correct structure
        const transformedContent = contentData?.map((item: any) => ({
          id: item.id,
          content_type: item.content_type,
          order_index: item.order_index,
          video: item.content_type === 'video' ? item.video : undefined,
          quiz: item.content_type === 'quiz' ? item.quiz : undefined,
        })) || [];

        coursesWithContent.push({
          id: course.id,
          title: course.title,
          description: course.description,
          cover_image_url: course.cover_image_url,
          contentItems: transformedContent,
        });
      }

      setCourses(coursesWithContent);

      // Fetch video progress for this creator using creator_handle
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
        
        // Calculate progress percentage for each video
        const progressWithPercentage = progressData?.map((p: any) => {
          // Find the video to get duration
          let duration = 0;
          for (const course of coursesWithContent) {
            const videoItem = course.contentItems.find(
              item => item.content_type === 'video' && item.video?.id === p.video_id
            );
            if (videoItem?.video?.duration_seconds) {
              duration = videoItem.video.duration_seconds;
              break;
            }
          }
          
          const percentage = duration > 0 
            ? Math.min(100, Math.round((p.watched_seconds / duration) * 100))
            : 0;
          
          return {
            video_id: p.video_id,
            completed: p.completed || false,
            watched_seconds: p.watched_seconds || 0,
            progress_percentage: percentage,
          };
        }) || [];
        
        setVideoProgress(progressWithPercentage);
      }

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

  const isRegistered = (eventId: string): boolean => {
    return registrations.some(reg => reg.live_event_id === eventId);
  };

  const handleRegister = async (eventId: string) => {
    if (registeringEventId) return;

    try {
      console.log('[Academy] Registering for event:', eventId);
      setRegisteringEventId(eventId);

      const { error } = await supabase
        .from('live_event_registrations')
        .insert({
          live_event_id: eventId,
          creator_handle: CREATOR_HANDLE,
        });

      if (error) {
        console.error('[Academy] Error registering for event:', error);
        Alert.alert('Error', 'Failed to register for the event. Please try again.');
        return;
      }

      setRegistrations(prev => [...prev, { live_event_id: eventId, creator_handle: CREATOR_HANDLE }]);
      console.log('[Academy] Successfully registered for event');
      Alert.alert('Success', 'You have been registered for this event. You can now join the event!');
    } catch (error: any) {
      console.error('[Academy] Exception during registration:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setRegisteringEventId(null);
    }
  };

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

  const toggleCourse = (courseId: string) => {
    setExpandedCourseId(expandedCourseId === courseId ? null : courseId);
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

  const getVideoProgress = (videoId: string): VideoProgress | undefined => {
    return videoProgress.find((p) => p.video_id === videoId);
  };

  const handleItemPress = async (course: Course, item: ContentItem, index: number) => {
    if (item.content_type === 'video' && item.video) {
      console.log('[Academy] Opening video:', item.video.id);
      
      // Mark video as watched immediately when opened
      try {
        const { error } = await supabase
          .from('user_video_progress')
          .upsert({
            creator_handle: CREATOR_HANDLE,
            video_id: item.video.id,
            watched_seconds: 0,
            completed: true,
            completed_at: new Date().toISOString(),
            last_watched_at: new Date().toISOString(),
          }, {
            onConflict: 'creator_handle,video_id',
          });

        if (!error) {
          // Update local state
          setVideoProgress(prev => {
            const existing = prev.find(p => p.video_id === item.video!.id);
            if (existing) {
              return prev.map(p => 
                p.video_id === item.video!.id 
                  ? { ...p, completed: true, progress_percentage: 100 }
                  : p
              );
            } else {
              return [...prev, {
                video_id: item.video!.id,
                completed: true,
                watched_seconds: 0,
                progress_percentage: 100,
              }];
            }
          });
        }
      } catch (error) {
        console.error('[Academy] Error marking video as watched:', error);
      }

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
      
      // Mark quiz as opened/completed immediately
      try {
        const { error } = await supabase
          .from('user_quiz_attempts')
          .insert({
            creator_handle: CREATOR_HANDLE,
            quiz_id: item.quiz.id,
            score: 100,
            passed: true,
            answers: {},
          });

        if (!error) {
          // Update local state
          setQuizAttempts(prev => {
            const existing = prev.find(a => a.quiz_id === item.quiz!.id);
            if (!existing) {
              return [...prev, {
                quiz_id: item.quiz!.id,
                passed: true,
                score: 100,
              }];
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('[Academy] Error marking quiz as completed:', error);
      }

      Alert.alert('Quiz', `Starting quiz: ${item.quiz.title}\n\nQuiz would open here.`);
    }
  };

  const getCourseProgress = (course: Course) => {
    const completedItems = course.contentItems.filter(item => isItemCompleted(item)).length;
    const totalItems = course.contentItems.length;
    return { completed: completedItems, total: totalItems };
  };

  const getVideoNumber = (course: Course, item: ContentItem): number => {
    let videoCount = 0;
    for (const contentItem of course.contentItems) {
      if (contentItem.content_type === 'video') {
        videoCount++;
        if (contentItem.id === item.id) {
          return videoCount;
        }
      }
    }
    return 0;
  };

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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live Events</Text>
          {liveEvents.length > 0 ? (
            liveEvents.map((event) => {
              const registered = isRegistered(event.id);
              const canJoin = registered;

              return (
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
                      <View style={styles.liveEventTimeContainer}>
                        <Text style={styles.liveEventTimeText}>
                          {formatTo12Hour(event.event_hour)}
                        </Text>
                        {event.time_zone && (
                          <Text style={styles.liveEventTimezoneText}>
                            {event.time_zone}
                          </Text>
                        )}
                      </View>
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
                  </View>

                  <View style={styles.eventButtonsContainer}>
                    <TouchableOpacity
                      style={[
                        styles.registerButton,
                        registered && styles.registerButtonInactive,
                      ]}
                      onPress={() => handleRegister(event.id)}
                      disabled={registered || registeringEventId === event.id}
                      activeOpacity={registered ? 1 : 0.7}
                    >
                      {registeringEventId === event.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.registerButtonText}>
                          {registered ? 'Registered' : 'Register'}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.joinEventButton,
                        !canJoin && styles.joinEventButtonDisabled,
                      ]}
                      onPress={() => handleJoinEvent(event)}
                      disabled={!canJoin}
                      activeOpacity={canJoin ? 0.7 : 1}
                    >
                      <Text style={[
                        styles.joinEventButtonText,
                        !canJoin && styles.joinEventButtonTextDisabled,
                      ]}>
                        Join Event
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
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
        </View>

        {/* Courses Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Courses</Text>
          {courses.length > 0 ? (
            courses.map((course) => {
              const isExpanded = expandedCourseId === course.id;
              const progress = getCourseProgress(course);
              const progressPercentage = progress.total > 0 
                ? (progress.completed / progress.total) * 100 
                : 0;

              return (
                <View key={course.id} style={styles.courseContainer}>
                  <TouchableOpacity
                    style={styles.courseHeader}
                    onPress={() => toggleCourse(course.id)}
                    activeOpacity={0.7}
                  >
                    {course.cover_image_url ? (
                      <Image
                        source={{ uri: course.cover_image_url }}
                        style={styles.courseThumbnail}
                      />
                    ) : (
                      <View style={styles.courseThumbnailPlaceholder}>
                        <IconSymbol
                          ios_icon_name="book.fill"
                          android_material_icon_name="book"
                          size={32}
                          color={colors.primary}
                        />
                      </View>
                    )}
                    
                    <View style={styles.courseHeaderText}>
                      <Text style={styles.courseTitle}>{course.title}</Text>
                      <Text style={styles.courseProgress}>
                        {progress.completed} / {progress.total} completed
                      </Text>
                    </View>
                    
                    <IconSymbol
                      ios_icon_name={isExpanded ? "chevron.up" : "chevron.down"}
                      android_material_icon_name={isExpanded ? "expand-less" : "expand-more"}
                      size={24}
                      color={colors.text}
                    />
                  </TouchableOpacity>

                  <View style={styles.courseProgressBar}>
                    <View
                      style={[
                        styles.courseProgressFill,
                        { width: `${progressPercentage}%` },
                      ]}
                    />
                  </View>

                  {course.description && isExpanded && (
                    <Text style={styles.courseDescription}>{course.description}</Text>
                  )}

                  {isExpanded && (
                    <View style={styles.courseContent}>
                      {course.contentItems.length === 0 ? (
                        <View style={styles.emptyState}>
                          <Text style={styles.emptyStateText}>No content available yet</Text>
                        </View>
                      ) : (
                        course.contentItems.map((item, index) => {
                          const isCompleted = isItemCompleted(item);
                          const progress = item.content_type === 'video' && item.video 
                            ? getVideoProgress(item.video.id)
                            : undefined;
                          const videoNumber = item.content_type === 'video' ? getVideoNumber(course, item) : 0;

                          return (
                            <TouchableOpacity
                              key={item.id}
                              style={[
                                styles.contentCard,
                                isCompleted && styles.contentCardCompleted,
                              ]}
                              onPress={() => handleItemPress(course, item, index)}
                              activeOpacity={0.7}
                            >
                              {/* Video Thumbnail or Circle indicator */}
                              {item.content_type === 'video' && item.video ? (
                                <View style={styles.videoThumbnailContainer}>
                                  {item.video.thumbnail_url ? (
                                    <>
                                      <Image
                                        source={{ uri: item.video.thumbnail_url }}
                                        style={styles.videoThumbnail}
                                        resizeMode="cover"
                                      />
                                      {/* Play icon overlay */}
                                      <View style={styles.playIconOverlay}>
                                        <View style={styles.playIconCircle}>
                                          <IconSymbol
                                            ios_icon_name="play.fill"
                                            android_material_icon_name="play-arrow"
                                            size={24}
                                            color="#FFFFFF"
                                          />
                                        </View>
                                      </View>
                                      {/* Completion badge */}
                                      {isCompleted && (
                                        <View style={styles.completionBadge}>
                                          <IconSymbol
                                            ios_icon_name="checkmark.circle.fill"
                                            android_material_icon_name="check-circle"
                                            size={24}
                                            color={colors.primary}
                                          />
                                        </View>
                                      )}
                                    </>
                                  ) : (
                                    <View style={styles.videoThumbnailPlaceholder}>
                                      <View style={styles.playIconCircle}>
                                        <IconSymbol
                                          ios_icon_name="play.fill"
                                          android_material_icon_name="play-arrow"
                                          size={24}
                                          color="#FFFFFF"
                                        />
                                      </View>
                                      {isCompleted && (
                                        <View style={styles.completionBadge}>
                                          <IconSymbol
                                            ios_icon_name="checkmark.circle.fill"
                                            android_material_icon_name="check-circle"
                                            size={24}
                                            color={colors.primary}
                                          />
                                        </View>
                                      )}
                                    </View>
                                  )}
                                  {/* Video number badge */}
                                  <View style={styles.videoNumberBadge}>
                                    <Text style={styles.videoNumberText}>{videoNumber}</Text>
                                  </View>
                                </View>
                              ) : (
                                <View style={styles.contentIndicatorContainer}>
                                  <View style={[
                                    styles.contentIndicatorCircle,
                                    isCompleted && styles.contentIndicatorCircleCompleted,
                                  ]}>
                                    {isCompleted ? (
                                      <IconSymbol
                                        ios_icon_name="checkmark"
                                        android_material_icon_name="check"
                                        size={20}
                                        color="#FFFFFF"
                                      />
                                    ) : (
                                      <Text style={styles.contentIndicatorQuizText}>
                                        Quiz
                                      </Text>
                                    )}
                                  </View>
                                </View>
                              )}

                              <View style={styles.contentInfo}>
                                <View style={styles.contentHeader}>
                                  <Text style={styles.contentTitle}>
                                    {item.content_type === 'video'
                                      ? item.video?.title
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
                                    style={styles.contentDescription}
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
                                    style={styles.contentDescription}
                                    numberOfLines={2}
                                  >
                                    {item.quiz.description}
                                  </Text>
                                )}
                              </View>

                              <View style={styles.contentArrow}>
                                <IconSymbol
                                  ios_icon_name="chevron.right"
                                  android_material_icon_name="chevron-right"
                                  size={20}
                                  color="#A0A0A0"
                                />
                              </View>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No courses available yet</Text>
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <IconSymbol
            ios_icon_name="info.circle.fill"
            android_material_icon_name="info"
            size={24}
            color={colors.primary}
          />
          <Text style={styles.infoText}>
            All videos and quizzes are available immediately. Complete them in any order to track your progress!
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 16,
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
  liveEventTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveEventTimeText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: colors.text,
  },
  liveEventTimezoneText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: '#999999',
  },
  eventButtonsContainer: {
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
  registerButtonInactive: {
    backgroundColor: colors.grey,
    opacity: 0.6,
  },
  registerButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  joinEventButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  joinEventButtonDisabled: {
    backgroundColor: colors.grey,
    opacity: 0.4,
  },
  joinEventButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  joinEventButtonTextDisabled: {
    color: '#999999',
  },
  courseContainer: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  courseThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  courseThumbnailPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.grey,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseHeaderText: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 4,
  },
  courseProgress: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  courseProgressBar: {
    height: 8,
    backgroundColor: colors.grey,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  courseProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  courseDescription: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  courseContent: {
    gap: 12,
  },
  contentCard: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 16,
  },
  contentCardCompleted: {
    backgroundColor: 'rgba(102, 66, 239, 0.1)',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  videoThumbnailContainer: {
    width: 120,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  videoThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.grey,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  playIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(102, 66, 239, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  videoNumberBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  videoNumberText: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  contentIndicatorContainer: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentIndicatorCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.grey,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  contentIndicatorCircleCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  contentIndicatorQuizText: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    textAlign: 'center',
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
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    flex: 1,
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
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
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
