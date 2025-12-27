
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Image,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Carousel from 'react-native-reanimated-carousel';
import { useTheme } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/app/integrations/supabase/client';
import { Video, ResizeMode } from 'expo-av';
import { IconSymbol } from '@/components/IconSymbol';
import { uploadImageToStorage } from '@/utils/imageUpload';
import { useCreatorData } from '@/hooks/useCreatorData';

interface OnboardingSlide {
  id: string;
  slide_order: number;
  title: string;
  content: string;
  media_url: string;
  media_type?: 'image' | 'video' | 'none';
  slide_type: 'default' | 'notification_request' | 'profile_upload';
}

const { width, height } = Dimensions.get('window');

const Onboarding = () => {
  const theme = useTheme();
  const router = useRouter();
  const { creator } = useCreatorData();
  const [slides, setSlides] = useState<OnboardingSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [currentMediaUrl, setCurrentMediaUrl] = useState<string | null>(null);
  const videoPlayer = useRef<Video>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const astronautAnim = useRef(new Animated.Value(0)).current;

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);

  const [notificationStatus, setNotificationStatus] = useState<boolean | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(astronautAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, astronautAnim]);

  useEffect(() => {
    const fetchOnboardingSlides = async () => {
      try {
        const { data, error } = await supabase
          .from('onboarding_slides')
          .select('*')
          .order('slide_order', { ascending: true });

        if (error) {
          console.error('Error fetching onboarding slides:', error);
          return;
        }

        if (data && data.length > 0) {
          setSlides(data);
          setCurrentMediaUrl(data[0].media_url);
        } else {
          console.warn('No onboarding slides found.');
        }
      } catch (error) {
        console.error('Unexpected error fetching onboarding slides:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOnboardingSlides();
  }, []);

  const handleSlideChange = (index: number) => {
    setCurrentSlideIndex(index);
    setCurrentMediaUrl(slides[index]?.media_url || null);
  };

  const renderItem = ({ item }: { item: OnboardingSlide }) => {
    return (
      <View style={styles.slide}>
        {item.media_url ? (
          <>
            {item.media_type === 'video' ? (
              <Video
                ref={videoPlayer}
                style={styles.video}
                source={{ uri: item.media_url }}
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                shouldPlay
                isMuted
              />
            ) : (
              <Image
                source={{ uri: item.media_url }}
                style={styles.image}
                resizeMode="contain"
              />
            )}
          </>
        ) : (
          <IconSymbol 
            ios_icon_name="photo" 
            android_material_icon_name="image" 
            size={100} 
            color={theme.colors.text} 
          />
        )}
        <Text style={[styles.title, { color: theme.colors.text }]}>{item.title}</Text>
        <Text style={[styles.text, { color: theme.colors.text }]}>{item.content}</Text>
      </View>
    );
  };

  const handleNotificationRequest = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setNotificationStatus(status === 'granted');
    // Move to the next slide after the request
    if (currentSlideIndex < slides.length - 1) {
      handleSlideChange(currentSlideIndex + 1);
    } else {
      router.replace('/(tabs)/home');
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    console.log('[Onboarding] Image picker result:', result);

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleProfileUpload = async () => {
    if (!profileImage) {
      Alert.alert('No Image Selected', 'Please select a profile image first.');
      return;
    }

    if (!creator) {
      Alert.alert('Error', 'Creator profile not found. Please try again later.');
      return;
    }

    setIsUploadingProfile(true);
    try {
      console.log('[Onboarding] Uploading profile picture...');
      
      // Upload the image to Supabase Storage
      const uploadResult = await uploadImageToStorage(
        profileImage,
        'avatars',
        `creators/${creator.id}`,
        800,
        800,
        0.8
      );

      console.log('[Onboarding] Profile picture uploaded:', uploadResult.publicUrl);

      // Update the creators table with the new profile picture URL
      const { error: updateError } = await supabase
        .from('creators')
        .update({
          profile_picture_url: uploadResult.publicUrl,
          avatar_url: uploadResult.publicUrl,
        })
        .eq('id', creator.id);

      if (updateError) {
        console.error('[Onboarding] Error updating creator profile:', updateError);
        Alert.alert('Upload Error', 'Failed to save profile picture. Please try again.');
        return;
      }

      console.log('[Onboarding] Profile picture saved successfully');
      Alert.alert('Success', 'Profile picture uploaded successfully!');

      // Move to the next slide or home
      if (currentSlideIndex < slides.length - 1) {
        handleSlideChange(currentSlideIndex + 1);
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (error) {
      console.error('[Onboarding] Error uploading profile picture:', error);
      Alert.alert('Upload Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsUploadingProfile(false);
    }
  };

  const currentSlide = slides[currentSlideIndex];

  useEffect(() => {
    if (currentSlide?.media_type === 'video' && currentMediaUrl) {
      videoPlayer.current?.playAsync();
    } else {
      videoPlayer.current?.pauseAsync();
    }
  }, [currentMediaUrl, currentSlide?.media_type]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <Carousel
        width={width}
        height={height}
        data={slides}
        renderItem={renderItem}
        loop={false}
        onSnapToItem={handleSlideChange}
      />
      <View style={styles.buttonsContainer}>
        {currentSlide?.slide_type === 'notification_request' ? (
          <TouchableOpacity style={styles.button} onPress={handleNotificationRequest}>
            <Text style={styles.buttonText}>
              {notificationStatus === null
                ? 'Request Notifications'
                : notificationStatus
                  ? 'Notifications Enabled'
                  : 'Enable Notifications'}
            </Text>
          </TouchableOpacity>
        ) : currentSlide?.slide_type === 'profile_upload' ? (
          <>
            <TouchableOpacity 
              style={[styles.button, isUploadingProfile && styles.buttonDisabled]} 
              onPress={pickImage}
              disabled={isUploadingProfile}
            >
              <Text style={styles.buttonText}>
                {profileImage ? 'Change Image' : 'Pick an Image'}
              </Text>
            </TouchableOpacity>
            {profileImage && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: profileImage }} style={styles.imagePreview} />
              </View>
            )}
            <TouchableOpacity 
              style={[styles.button, styles.uploadButton, (!profileImage || isUploadingProfile) && styles.buttonDisabled]} 
              onPress={handleProfileUpload}
              disabled={!profileImage || isUploadingProfile}
            >
              {isUploadingProfile ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Upload Profile Picture</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.skipButton]}
              onPress={() => {
                if (currentSlideIndex < slides.length - 1) {
                  handleSlideChange(currentSlideIndex + 1);
                } else {
                  router.replace('/(tabs)/home');
                }
              }}
            >
              <Text style={styles.skipButtonText}>Skip for Now</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              if (currentSlideIndex < slides.length - 1) {
                handleSlideChange(currentSlideIndex + 1);
              } else {
                router.replace('/(tabs)/home');
              }
            }}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  image: {
    width: '100%',
    height: '50%',
    marginBottom: 20,
  },
  video: {
    width: '100%',
    height: '50%',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
  },
  buttonsContainer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#8B5CF6',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  uploadButton: {
    backgroundColor: '#10B981',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  skipButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePreview: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: '#8B5CF6',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    minWidth: 200,
  },
});

export default Onboarding;
