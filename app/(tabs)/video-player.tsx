
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useVideoPlayer, VideoView } from 'expo-video';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';

interface VideoData {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  duration_seconds: number | null;
}

// Hardcoded creator handle - no authentication needed
const CREATOR_HANDLE = 'avelezsanti';

export default function VideoPlayerScreen() {
  const { videoId } = useLocalSearchParams<{ videoId: string }>();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedProgressRef = useRef<number>(0);
  const hasMarkedWatchedRef = useRef(false);

  const player = useVideoPlayer(videoData?.video_url || '', (player) => {
    player.play();
  });

  const markVideoAsWatched = useCallback(async () => {
    if (!videoId || hasMarkedWatchedRef.current) return;

    try {
      console.log('[VideoPlayer] Marking video as watched:', videoId);
      hasMarkedWatchedRef.current = true;

      const { error } = await supabase
        .from('user_video_progress')
        .upsert({
          creator_handle: CREATOR_HANDLE,
          video_id: videoId,
          watched_seconds: 0,
          completed: true,
          completed_at: new Date().toISOString(),
          last_watched_at: new Date().toISOString(),
        }, {
          onConflict: 'creator_handle,video_id',
        });

      if (error) {
        console.error('[VideoPlayer] Error marking video as watched:', error);
      } else {
        console.log('[VideoPlayer] Video marked as watched successfully');
        setIsCompleted(true);
      }
    } catch (error: any) {
      console.error('[VideoPlayer] Exception marking video as watched:', error);
    }
  }, [videoId]);

  const fetchVideoData = useCallback(async () => {
    if (!videoId) return;

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

      // Mark video as watched immediately when opened
      await markVideoAsWatched();

      // Fetch existing progress using creator_handle
      const { data: progress, error: progressError } = await supabase
        .from('user_video_progress')
        .select('*')
        .eq('creator_handle', CREATOR_HANDLE)
        .eq('video_id', videoId)
        .single();

      if (progress && !progressError) {
        setWatchedSeconds(progress.watched_seconds || 0);
        setIsCompleted(progress.completed || false);
        
        // Calculate initial progress percentage
        if (video.duration_seconds && video.duration_seconds > 0) {
          const percentage = Math.min(100, Math.round((progress.watched_seconds / video.duration_seconds) * 100));
          setProgressPercentage(percentage);
        }
      }
    } catch (error: any) {
      console.error('[VideoPlayer] Error fetching video data:', error);
      Alert.alert('Error', 'Failed to load video');
    } finally {
      setLoading(false);
    }
  }, [videoId, markVideoAsWatched]);

  const updateProgress = useCallback(async (currentTime: number, forceUpdate: boolean = false) => {
    if (!videoId || !videoData) return;

    // Only update if we've progressed at least 5 seconds since last save, or if forced
    if (!forceUpdate && Math.abs(currentTime - lastSavedProgressRef.current) < 5) {
      return;
    }

    try {
      console.log('[VideoPlayer] Updating progress:', currentTime, 'seconds');
      
      const { error } = await supabase
        .from('user_video_progress')
        .upsert({
          creator_handle: CREATOR_HANDLE,
          video_id: videoId,
          watched_seconds: Math.floor(currentTime),
          completed: true,
          last_watched_at: new Date().toISOString(),
        }, {
          onConflict: 'creator_handle,video_id',
        });

      if (error) {
        console.error('[VideoPlayer] Error updating progress:', error);
      } else {
        lastSavedProgressRef.current = currentTime;
        console.log('[VideoPlayer] Progress saved successfully');
      }
    } catch (error: any) {
      console.error('[VideoPlayer] Exception updating progress:', error);
    }
  }, [videoId, videoData]);

  useEffect(() => {
    fetchVideoData();
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [videoId]);

  useEffect(() => {
    if (player && videoData && videoData.duration_seconds) {
      // Track progress every second
      progressIntervalRef.current = setInterval(() => {
        const currentTime = Math.floor(player.currentTime);
        setWatchedSeconds(currentTime);
        
        // Calculate progress percentage
        const percentage = Math.min(100, Math.round((currentTime / videoData.duration_seconds!) * 100));
        setProgressPercentage(percentage);
        
        // Update progress in database every 5 seconds
        if (currentTime % 5 === 0 && currentTime > 0) {
          updateProgress(currentTime);
        }
      }, 1000);

      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        // Save final progress when leaving
        if (player.currentTime > 0) {
          updateProgress(Math.floor(player.currentTime), true);
        }
      };
    }
  }, [player, videoData, updateProgress]);

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

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>
                Back to Academy
              </Text>
            </TouchableOpacity>
          </View>
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
  buttonContainer: {
    gap: 12,
  },
  backButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
});
