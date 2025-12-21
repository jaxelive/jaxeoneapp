
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAcademyData();
  }, [creator]);

  const fetchAcademyData = async () => {
    if (!creator) return;

    try {
      setLoading(true);

      // Fetch course content items with videos and quizzes
      const { data: contentData, error: contentError } = await supabase
        .from('course_content_items')
        .select(`
          *,
          video:course_videos(*),
          quiz:course_quizzes(*)
        `)
        .order('order_index', { ascending: true });

      if (contentError) throw contentError;

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
      const { data: progressData, error: progressError } = await supabase
        .from('user_video_progress')
        .select('*')
        .eq('user_id', creator.id);

      if (progressError && progressError.code !== 'PGRST116') {
        console.error('Error fetching video progress:', progressError);
      }

      setVideoProgress(progressData || []);

      // Fetch quiz attempts
      const { data: quizData, error: quizError } = await supabase
        .from('user_quiz_attempts')
        .select('*')
        .eq('user_id', creator.id)
        .order('created_at', { ascending: false });

      if (quizError && quizError.code !== 'PGRST116') {
        console.error('Error fetching quiz attempts:', quizError);
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
    } catch (error: any) {
      console.error('Error fetching academy data:', error);
      Alert.alert('Error', 'Failed to load academy content');
    } finally {
      setLoading(false);
    }
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
      // Navigate to video player
      router.push({
        pathname: '/(tabs)/video-player',
        params: { videoId: item.video.id },
      });
    } else if (item.content_type === 'quiz' && item.quiz) {
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
        {/* Header Card */}
        <View style={styles.headerCard}>
          <IconSymbol
            ios_icon_name="book.fill"
            android_material_icon_name="menu-book"
            size={64}
            color={colors.primary}
          />
          <Text style={styles.headerTitle}>Academy</Text>
          <Text style={styles.headerSubtitle}>
            Master your creator journey with our comprehensive training
          </Text>
        </View>

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

        {/* Content List */}
        <View style={styles.contentList}>
          {contentItems.map((item, index) => {
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
                  ) : item.content_type === 'video' ? (
                    <IconSymbol
                      ios_icon_name="play.circle.fill"
                      android_material_icon_name="play-circle"
                      size={40}
                      color={colors.primary}
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
          })}
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
  },
  contentDescriptionLocked: {
    color: colors.textTertiary,
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
