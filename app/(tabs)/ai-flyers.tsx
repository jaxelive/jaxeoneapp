
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { colors } from '@/styles/commonStyles';
import { useBattleFlyerGen } from '@/hooks/useBattleFlyerGen';
import { IconSymbol } from '@/components/IconSymbol';

export default function AIFlyersScreen() {
  const { generate, loading, error, data, reset } = useBattleFlyerGen();
  
  const [title, setTitle] = useState('Official Battle');
  const [creatorName, setCreatorName] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [battleDate, setBattleDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [generatedFlyerUrl, setGeneratedFlyerUrl] = useState<string | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant permission to access your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleGenerateFlyer = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!creatorName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!opponentName.trim()) {
      Alert.alert('Error', 'Please enter opponent name');
      return;
    }

    if (!photoUri) {
      Alert.alert('Error', 'Please upload a face photo');
      return;
    }

    const formattedDate = battleDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const result = await generate({
      title,
      creatorName,
      opponentName,
      battleDate: formattedDate,
      image: {
        uri: photoUri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      },
    });

    if (result) {
      setGeneratedFlyerUrl(result.url);
      Alert.alert('Success', 'Your battle flyer has been forged!');
    }
  };

  const handleRegenerate = () => {
    setGeneratedFlyerUrl(null);
    reset();
  };

  const saveToGallery = async () => {
    if (!generatedFlyerUrl) return;

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to save to gallery');
        return;
      }

      const fileUri = FileSystem.documentDirectory + 'battle-flyer.png';
      const downloadResult = await FileSystem.downloadAsync(generatedFlyerUrl, fileUri);

      if (downloadResult.uri) {
        await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
        Alert.alert('Success', 'Flyer saved to gallery!');
      }
    } catch (error: any) {
      console.error('Error saving to gallery:', error);
      Alert.alert('Error', 'Failed to save to gallery');
    }
  };

  const shareFlyer = async () => {
    if (!generatedFlyerUrl) return;

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      const fileUri = FileSystem.documentDirectory + 'battle-flyer.png';
      await FileSystem.downloadAsync(generatedFlyerUrl, fileUri);
      await Sharing.shareAsync(fileUri);
    } catch (error: any) {
      console.error('Error sharing flyer:', error);
      Alert.alert('Error', 'Failed to share flyer');
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'AI Flyer Creator',
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <LinearGradient
          colors={['#1A1A1A', '#2A2A2A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <Text style={styles.emoji}>⚔️</Text>
          <Text style={styles.headerTitle}>Official Battle Generator</Text>
          <Text style={styles.headerSubtitle}>Create epic medieval warrior battle flyers</Text>
          <Text style={styles.headerNote}>Powered by Google Gemini AI</Text>
        </LinearGradient>

        {/* Error Display */}
        {error && !loading && (
          <View style={styles.errorCard}>
            <View style={styles.errorHeader}>
              <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="error" size={24} color="#FF6B6B" />
              <Text style={styles.errorTitle}>Generation Failed</Text>
            </View>
            <Text style={styles.errorText}>{error}</Text>
            {error.includes('GEMINI_API_KEY') && (
              <Text style={styles.errorHint}>
                The administrator needs to configure the GEMINI_API_KEY environment variable in Supabase Edge Functions.
              </Text>
            )}
            {error.includes('Authentication') && (
              <View style={styles.errorActions}>
                <Text style={styles.errorHint}>
                  Your session may have expired. Try logging out and logging back in.
                </Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => {
                    reset();
                    Alert.alert(
                      'Session Issue',
                      'Please log out and log back in to refresh your session, then try again.',
                      [{ text: 'OK' }]
                    );
                  }}
                >
                  <Text style={styles.retryButtonText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {!generatedFlyerUrl ? (
          <>
            {/* Form Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Battle Details</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Title *</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Official Battle"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={40}
                />
                <Text style={styles.helperText}>{title.length}/40 characters</Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Your Name *</Text>
                <TextInput
                  style={styles.input}
                  value={creatorName}
                  onChangeText={setCreatorName}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={40}
                />
                <Text style={styles.helperText}>{creatorName.length}/40 characters</Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Opponent Name *</Text>
                <TextInput
                  style={styles.input}
                  value={opponentName}
                  onChangeText={setOpponentName}
                  placeholder="@username or full name"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={40}
                />
                <Text style={styles.helperText}>
                  {opponentName.length}/40 characters • Example: @username or full name
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Battle Date *</Text>
                <TouchableOpacity
                  style={styles.inputButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <IconSymbol ios_icon_name="calendar" android_material_icon_name="calendar-today" size={20} color={colors.primary} />
                  <Text style={styles.inputButtonText}>{formatDate(battleDate)}</Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={battleDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (date) setBattleDate(date);
                  }}
                />
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Upload Face Photo *</Text>
                <Text style={styles.helperText}>
                  Good lighting, no sunglasses. Face should be clearly visible.
                </Text>
                
                {photoUri ? (
                  <View style={styles.photoPreview}>
                    <Image source={{ uri: photoUri }} style={styles.photoImage} />
                    <TouchableOpacity
                      style={styles.changePhotoButton}
                      onPress={pickImage}
                    >
                      <Text style={styles.changePhotoText}>Change Photo</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.photoButtons}>
                    <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                      <IconSymbol ios_icon_name="camera" android_material_icon_name="camera-alt" size={24} color={colors.primary} />
                      <Text style={styles.photoButtonText}>Take Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                      <IconSymbol ios_icon_name="photo" android_material_icon_name="photo-library" size={24} color={colors.primary} />
                      <Text style={styles.photoButtonText}>Choose from Gallery</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* Generate Button */}
            <TouchableOpacity
              style={[styles.generateButton, loading && styles.buttonDisabled]}
              onPress={handleGenerateFlyer}
              disabled={loading}
            >
              <LinearGradient
                colors={colors.gradientPurple}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientButton}
              >
                <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto-awesome" size={24} color="#FFFFFF" />
                <Text style={styles.generateButtonText}>
                  {loading ? 'Forging your battle poster…' : 'Generate Flyer'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {loading && (
              <View style={styles.loadingInfo}>
                <Text style={styles.loadingText}>
                  This may take 10-30 seconds. The AI is creating your custom battle flyer...
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Generated Flyer Preview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Battle Flyer</Text>
              <View style={styles.flyerPreview}>
                <Image
                  source={{ uri: generatedFlyerUrl }}
                  style={styles.flyerImage}
                  resizeMode="contain"
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton} onPress={saveToGallery}>
                  <IconSymbol ios_icon_name="arrow.down.circle.fill" android_material_icon_name="download" size={28} color={colors.primary} />
                  <Text style={styles.actionButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={shareFlyer}>
                  <IconSymbol ios_icon_name="square.and.arrow.up.fill" android_material_icon_name="share" size={28} color={colors.primary} />
                  <Text style={styles.actionButtonText}>Share</Text>
                </TouchableOpacity>
              </View>

              {/* Regenerate Button */}
              <TouchableOpacity
                style={styles.regenerateButton}
                onPress={handleRegenerate}
              >
                <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={20} color={colors.text} />
                <Text style={styles.regenerateButtonText}>Regenerate</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  headerCard: {
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  headerNote: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 8,
  },
  errorCard: {
    backgroundColor: '#FF6B6B20',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FF6B6B40',
    gap: 12,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF6B6B',
    lineHeight: 20,
  },
  errorHint: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 18,
  },
  errorActions: {
    gap: 12,
    marginTop: 4,
  },
  retryButton: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  helperText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 6,
  },
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  photoButton: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  photoPreview: {
    marginTop: 8,
    alignItems: 'center',
  },
  photoImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
    marginBottom: 12,
  },
  changePhotoButton: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  generateButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 12,
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingInfo: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  flyerPreview: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: colors.backgroundAlt,
    aspectRatio: 9 / 16,
  },
  flyerImage: {
    width: '100%',
    height: '100%',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  regenerateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
