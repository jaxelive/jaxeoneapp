
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import { useCreatorData } from '@/hooks/useCreatorData';
import { IconSymbol } from '@/components/IconSymbol';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';

interface VideoData {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  duration_seconds: number | null;
}

export default function VideoPlayerScreen() {
  const { videoId } = useLocalSearchParams<{ videoId: string }>();
  const { creator } = useCreatorData();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const player = useVideoPlayer(videoData?.video_url || '', (player) => {
    player.play();
  });

  useEffect(() => {
    fetchVideoData();
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [videoId, creator]);

  useEffect(() => {
    if (player && videoData) {
      // Track progress every second
      progressIntervalRef.current = setInterval(() => {
        const currentTime = Math.floor(player.currentTime);
        setWatchedSeconds(currentTime);
        
        // Update progress in database every 5 seconds
        if (currentTime % 5 === 0 && currentTime > 0) {
          updateProgress(currentTime);
        }

        // Check if video is completed (watched 95% or more)
        if (videoData.duration_seconds && currentTime >= videoData.duration_seconds * 0.95) {
          markAsCompleted();
        }
      }, 1000);

      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
    }
  }, [player, videoData]);

  const fetchVideoData = async () => {
    if (!creator || !videoId) return;

    try {
      setLoading(true);

      // Fetch video data
      const { data: video, error: videoError } = await supabase
        .from('course_videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (videoError) throw videoError;
      setVideoData(video);

      // Fetch existing progress
      const { data: progress, error: progressError } = await supabase
        .from('user_video_progress')
        .select('*')
        .eq('user_id', creator.id)
        .eq('video_id', videoId)
        .single();

      if (progress && !progressError) {
        setWatchedSeconds(progress.watched_seconds || 0);
      }
    } catch (error: any) {
      console.error('Error fetching video data:', error);
      Alert.alert('Error', 'Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (currentTime: number) => {
    if (!creator || !videoId) return;

    try {
      const { error } = await supabase
        .from('user_video_progress')
        .upsert({
          user_id: creator.id,
          video_id: videoId,
          watched_seconds: currentTime,
          last_watched_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,video_id',
        });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating progress:', error);
    }
  };

  const markAsCompleted = async () => {
    if (!creator || !videoId) return;

    try {
      const { error } = await supabase
        .from('user_video_progress')
        .upsert({
          user_id: creator.id,
          video_id: videoId,
          watched_seconds: videoData?.duration_seconds || 0,
          completed: true,
          completed_at: new Date().toISOString(),
          last_watched_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,video_id',
        });

      if (error) throw error;
      
      Alert.alert('Congratulations!', 'You have completed this video!', [
        {
          text: 'Continue',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Error marking as completed:', error);
    }
  };

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Video Player',
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      </View>
    );
  }

  if (!videoData) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Video Player',
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Video not found</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: videoData.title,
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <View style={styles.container}>
        <VideoView
          style={styles.video}
          player={player}
          allowsFullscreen
          allowsPictureInPicture
          nativeControls
        />

        <View style={styles.infoContainer}>
          <Text style={styles.title}>{videoData.title}</Text>
          {videoData.description && (
            <Text style={styles.description}>{videoData.description}</Text>
          )}

          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressTime}>
                {Math.floor(watchedSeconds / 60)}:{(watchedSeconds % 60).toString().padStart(2, '0')} / {videoData.duration_seconds ? `${Math.floor(videoData.duration_seconds / 60)}:${(videoData.duration_seconds % 60).toString().padStart(2, '0')}` : '--:--'}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: videoData.duration_seconds
                      ? `${(watchedSeconds / videoData.duration_seconds) * 100}%`
                      : '0%',
                  },
                ]}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => router.back()}
          >
            <Text style={styles.completeButtonText}>Back to Academy</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  video: {
    width: '100%',
    height: 250,
    backgroundColor: '#000000',
  },
  infoContainer: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  progressContainer: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
  },
  progressTime: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.grey,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  completeButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
});
