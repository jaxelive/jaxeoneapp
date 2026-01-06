
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
import { useVideoProgress } from '@/hooks/useVideoProgress';

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
  const hasMarkedWatchedRef = useRef(false);

  const { markVideoAsWatched, refetch } = useVideoProgress(CREATOR_HANDLE);

  const player = useVideoPlayer(videoData?.video_url || '', (player) => {
    player.play();
  });

  const fetchVideoData = useCallback(async () => {
    if (!videoId) return;

    try {
      console.log('[VideoPlayer] Fetching video data for:', videoId);
      setLoading(true);

      // Fetch video data
      const { data: video, error: videoError } = await supabase
        .from('course_videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (videoError) {
        console.error('[VideoPlayer] Error fetching video:', videoError);
        throw videoError;
      }
      
      console.log('[VideoPlayer] Video data fetched:', video.title);
      setVideoData(video);

      // Mark video as watched immediately when opened
      if (!hasMarkedWatchedRef.current) {
        console.log('[VideoPlayer] Marking video as watched on open');
        hasMarkedWatchedRef.current = true;
        await markVideoAsWatched(videoId);
        console.log('[VideoPlayer] Video marked as watched, refetching progress...');
        // Refetch progress to update the UI
        await refetch();
        console.log('[VideoPlayer] Progress refetch completed');
      }
    } catch (error: any) {
      console.error('[VideoPlayer] Error in fetchVideoData:', error);
      Alert.alert('Error', 'Failed to load video');
    } finally {
      setLoading(false);
    }
  }, [videoId, markVideoAsWatched, refetch]);

  useEffect(() => {
    fetchVideoData();
  }, [videoId]);

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
          <View style={styles.watchedBadgeContainer}>
            <View style={styles.watchedBadge}>
              <Text style={styles.watchedBadgeText}>✓ Marked as Watched</Text>
            </View>
          </View>

          <Text style={styles.title}>{videoData.title}</Text>
          {videoData.description && (
            <Text style={styles.description}>{videoData.description}</Text>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={async () => {
                console.log('[VideoPlayer] Back button pressed - triggering final refetch');
                await refetch();
                router.back();
              }}
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
  watchedBadgeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  watchedBadge: {
    backgroundColor: 'rgba(102, 66, 239, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  watchedBadgeText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
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
