
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/app/integrations/supabase/client';
import { useSupabase } from '@/contexts/SupabaseContext';
import { VideoView, useVideoPlayer } from 'expo-video';

const { width } = Dimensions.get('window');

const WELCOME_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

const ONBOARDING_SLIDES = [
  {
    emoji: '🏠',
    title: 'Your Homepage',
    description: 'Track your diamonds, graduation progress, and all your stats in one beautiful dashboard.',
  },
  {
    emoji: '💎',
    title: 'Diamonds & Graduation',
    description: 'Earn diamonds and level up from Rookie to Silver, Gold, and Elite status.',
  },
  {
    emoji: '⚔️',
    title: 'Battles',
    description: 'Compete with other creators in exciting live battles and climb the leaderboard.',
  },
  {
    emoji: '💰',
    title: 'Bonuses',
    description: 'Unlock monthly bonuses based on your performance and diamond count.',
  },
  {
    emoji: '📚',
    title: 'Learning Hub',
    description: 'Complete the 21-Day Challenge and UR Education to master your craft.',
  },
  {
    emoji: '✨',
    title: 'AI Flyers',
    description: 'Create stunning promotional flyers with AI in seconds.',
  },
  {
    emoji: '🚀',
    title: 'Ready to Go!',
    description: 'Level up your creator journey with JAXE One.',
  },
];

export default function OnboardingScreen() {
  const { user } = useSupabase();
  const [step, setStep] = useState(1);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [videoWatchProgress, setVideoWatchProgress] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);

  const videoRef = useRef<any>(null);
  const player = useVideoPlayer(WELCOME_VIDEO_URL, (player) => {
    player.loop = false;
    player.play();
  });

  useEffect(() => {
    if (step === 2 && player) {
      const interval = setInterval(() => {
        if (player.currentTime && player.duration) {
          const progress = (player.currentTime / player.duration) * 100;
          setVideoWatchProgress(progress);
        }
      }, 500);

      return () => clearInterval(interval);
    }
  }, [step, player]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need camera roll permissions to upload your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const uploadProfilePicture = async () => {
    if (!profileImage || !user) {
      Alert.alert('Error', 'Please select a profile picture first.');
      return;
    }

    setUploading(true);

    try {
      // In a real app, you would upload to Supabase Storage
      // For now, we'll just update the creators table with the URI
      const { error } = await supabase
        .from('creators')
        .update({ avatar_url: profileImage })
        .eq('email', user.email);

      if (error) {
        console.error('[Onboarding] Upload error:', error);
        Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
        setUploading(false);
        return;
      }

      setStep(2);
    } catch (error: any) {
      console.error('[Onboarding] Unexpected error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleVideoComplete = () => {
    if (videoWatchProgress >= 75) {
      setStep(3);
    } else {
      Alert.alert(
        'Almost There!',
        'Please watch at least 75% of the video to continue.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleNextSlide = () => {
    if (slideIndex < ONBOARDING_SLIDES.length - 1) {
      setSlideIndex(slideIndex + 1);
    } else {
      router.replace('/(tabs)/(home)/');
    }
  };

  const handlePrevSlide = () => {
    if (slideIndex > 0) {
      setSlideIndex(slideIndex - 1);
    }
  };

  if (step === 1) {
    return (
      <LinearGradient
        colors={['#FFFFFF', '#FAF5FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.content}>
          <Text style={styles.stepTitle}>Step 1: Profile Picture</Text>
          <Text style={styles.stepSubtitle}>Let's add a photo so everyone knows it's you!</Text>

          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>📸</Text>
                <Text style={styles.avatarPlaceholderLabel}>Tap to upload</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, !profileImage && styles.buttonDisabled]}
            onPress={uploadProfilePicture}
            disabled={!profileImage || uploading}
          >
            <LinearGradient
              colors={profileImage ? colors.gradientPurple : ['#E5E7EB', '#E5E7EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              {uploading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  if (step === 2) {
    return (
      <View style={styles.container}>
        <View style={styles.videoContainer}>
          <VideoView
            ref={videoRef}
            style={styles.video}
            player={player}
            allowsFullscreen
            allowsPictureInPicture
          />
        </View>

        <View style={styles.videoControls}>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${videoWatchProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {videoWatchProgress >= 75 ? '✅ Ready to continue!' : `${Math.round(videoWatchProgress)}% watched (need 75%)`}
          </Text>
          
          <TouchableOpacity
            style={[styles.button, videoWatchProgress < 75 && styles.buttonDisabled]}
            onPress={handleVideoComplete}
            disabled={videoWatchProgress < 75}
          >
            <LinearGradient
              colors={videoWatchProgress >= 75 ? colors.gradientPurple : ['#E5E7EB', '#E5E7EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentSlide = ONBOARDING_SLIDES[slideIndex];

  return (
    <LinearGradient
      colors={['#FFFFFF', '#FAF5FF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.slideContent}>
        <Text style={styles.slideEmoji}>{currentSlide.emoji}</Text>
        <Text style={styles.slideTitle}>{currentSlide.title}</Text>
        <Text style={styles.slideDescription}>{currentSlide.description}</Text>

        <View style={styles.slideIndicators}>
          {ONBOARDING_SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.slideIndicator,
                index === slideIndex && styles.slideIndicatorActive,
              ]}
            />
          ))}
        </View>

        <View style={styles.slideButtons}>
          {slideIndex > 0 && (
            <TouchableOpacity style={styles.slideButtonSecondary} onPress={handlePrevSlide}>
              <Text style={styles.slideButtonSecondaryText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.slideButtonPrimary} onPress={handleNextSlide}>
            <LinearGradient
              colors={colors.gradientPurple}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>
                {slideIndex === ONBOARDING_SLIDES.length - 1 ? 'Get Started! 🚀' : 'Next'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 48,
  },
  avatarContainer: {
    marginBottom: 48,
  },
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  avatarPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.grey,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  avatarPlaceholderText: {
    fontSize: 48,
    marginBottom: 8,
  },
  avatarPlaceholderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  button: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoControls: {
    padding: 24,
    backgroundColor: colors.backgroundAlt,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.grey,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  slideEmoji: {
    fontSize: 100,
    marginBottom: 32,
  },
  slideTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  slideDescription: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 48,
  },
  slideIndicators: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 48,
  },
  slideIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.grey,
  },
  slideIndicatorActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  slideButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  slideButtonSecondary: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: colors.grey,
    alignItems: 'center',
  },
  slideButtonSecondaryText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  slideButtonPrimary: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
});
