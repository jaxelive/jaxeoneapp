
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import { useCreatorData } from '@/hooks/useCreatorData';
import { IconSymbol } from '@/components/IconSymbol';
import { uploadImageToStorage, deleteImageFromStorage, extractStoragePathFromUrl } from '@/utils/imageUpload';

const LANGUAGE_OPTIONS = ['English', 'Español'];

export default function ProfileScreen() {
  const { creator, loading: creatorLoading, refetch } = useCreatorData();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingProfilePic, setIsUploadingProfilePic] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Editable fields
  const [email, setEmail] = useState('');
  const [language, setLanguage] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (creator) {
      console.log('[Profile] Creator data loaded:', {
        id: creator.id,
        handle: creator.creator_handle,
        profile_picture_url: creator.profile_picture_url,
        avatar_url: creator.avatar_url,
      });
      setEmail(creator.email || '');
      setLanguage(creator.language || 'English');
      setPaypalEmail(creator.paypal_email || '');
      
      // Use profile_picture_url first, fallback to avatar_url
      const imageUrl = creator.profile_picture_url || creator.avatar_url;
      if (imageUrl) {
        // Add timestamp to force cache refresh
        setProfilePicture(`${imageUrl}?t=${Date.now()}`);
      } else {
        setProfilePicture(null);
      }
      setSelectedImageUri(null);
    }
  }, [creator]);

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

    if (!result.canceled && result.assets[0]) {
      console.log('[Profile] Image selected:', result.assets[0].uri);
      setSelectedImageUri(result.assets[0].uri);
      setProfilePicture(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!creator) {
      console.error('[Profile] No creator data available');
      Alert.alert('Error', 'No creator data available');
      return;
    }

    setIsSaving(true);
    
    try {
      let uploadedImageUrl: string | null = null;

      // Upload profile picture if a new one was selected
      if (selectedImageUri) {
        setIsUploadingProfilePic(true);
        try {
          console.log('[Profile] Uploading new profile picture...');
          
          // Delete old profile picture if it exists
          if (creator.profile_picture_url) {
            const oldPath = extractStoragePathFromUrl(creator.profile_picture_url, 'avatars');
            if (oldPath) {
              try {
                await deleteImageFromStorage(oldPath, 'avatars');
                console.log('[Profile] Old profile picture deleted');
              } catch (deleteError) {
                console.warn('[Profile] Could not delete old profile picture:', deleteError);
              }
            }
          }

          // Upload new profile picture
          const uploadResult = await uploadImageToStorage(
            selectedImageUri,
            'avatars',
            `creators/${creator.id}`,
            800,
            800,
            0.8
          );

          uploadedImageUrl = uploadResult.publicUrl;
          console.log('[Profile] Profile picture uploaded successfully:', uploadedImageUrl);
        } catch (uploadError) {
          console.error('[Profile] Profile picture upload error:', uploadError);
          Alert.alert('Upload Error', 'Failed to upload profile picture. Please try again.');
          setIsSaving(false);
          setIsUploadingProfilePic(false);
          return;
        } finally {
          setIsUploadingProfilePic(false);
        }
      }

      // Prepare updates object
      const updates: any = {
        email,
        language,
        paypal_email: paypalEmail,
      };

      // Add profile picture URLs if a new image was uploaded
      if (uploadedImageUrl) {
        updates.profile_picture_url = uploadedImageUrl;
        updates.avatar_url = uploadedImageUrl;
        console.log('[Profile] Adding profile picture URLs to update:', uploadedImageUrl);
      }

      // Update the creators table
      console.log('[Profile] Updating creators table with:', updates);
      const { error, data } = await supabase
        .from('creators')
        .update(updates)
        .eq('id', creator.id)
        .select();

      if (error) {
        console.error('[Profile] Error updating profile:', error);
        Alert.alert('Error', `Failed to update profile: ${error.message}`);
      } else {
        console.log('[Profile] Profile updated successfully:', data);
        
        // Verify the update
        if (data && data.length > 0) {
          console.log('[Profile] Updated data from database:', {
            profile_picture_url: data[0].profile_picture_url,
            avatar_url: data[0].avatar_url,
          });
        }
        
        // Clear image cache
        if (uploadedImageUrl) {
          try {
            await Image.clearMemoryCache();
            await Image.clearDiskCache();
            console.log('[Profile] Image cache cleared');
          } catch (cacheError) {
            console.warn('[Profile] Could not clear image cache:', cacheError);
          }
        }
        
        Alert.alert('Success', 'Profile updated successfully!');
        setIsEditing(false);
        setSelectedImageUri(null);
        
        // Refetch creator data to show updated profile picture
        console.log('[Profile] Refetching creator data...');
        await refetch();
      }
    } catch (error: any) {
      console.error('[Profile] Error saving profile:', error);
      Alert.alert('Error', `An unexpected error occurred: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestManager = () => {
    Alert.alert(
      'Request Manager',
      'Your request has been submitted. A manager will be assigned to you soon.',
      [{ text: 'OK' }]
    );
  };

  if (creatorLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Profile', headerShown: true }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!creator) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Profile', headerShown: true }} />
        <Text style={styles.errorText}>No profile data available</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Profile',
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                if (isEditing) {
                  // Cancel editing
                  setEmail(creator.email || '');
                  setLanguage(creator.language || 'English');
                  setPaypalEmail(creator.paypal_email || '');
                  const imageUrl = creator.profile_picture_url || creator.avatar_url;
                  setProfilePicture(imageUrl ? `${imageUrl}?t=${Date.now()}` : null);
                  setSelectedImageUri(null);
                  setIsEditing(false);
                } else {
                  setIsEditing(true);
                }
              }}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>
                {isEditing ? 'Cancel' : 'Edit'}
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Profile Header - Simplified */}
        <LinearGradient
          colors={['#FFFFFF', '#FAF5FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <TouchableOpacity
            onPress={isEditing ? pickImage : undefined}
            disabled={!isEditing || isUploadingProfilePic}
            style={styles.avatarContainer}
            activeOpacity={isEditing ? 0.7 : 1}
          >
            {profilePicture ? (
              <Image 
                source={{ uri: profilePicture }}
                style={styles.avatar}
                cachePolicy="none"
                contentFit="cover"
                transition={300}
                recyclingKey={profilePicture}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <IconSymbol
                  ios_icon_name="person.fill"
                  android_material_icon_name="person"
                  size={48}
                  color="#fff"
                />
              </View>
            )}
            {isEditing && (
              <View style={styles.editBadge}>
                {isUploadingProfilePic ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <IconSymbol
                    ios_icon_name="camera.fill"
                    android_material_icon_name="photo_camera"
                    size={16}
                    color="#fff"
                  />
                )}
              </View>
            )}
          </TouchableOpacity>
          
          {isEditing && (
            <Text style={styles.uploadHint}>Tap to change profile picture</Text>
          )}
          
          <Text style={styles.name}>
            {creator.first_name} {creator.last_name}
          </Text>
        </LinearGradient>

        {/* Contact Information */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Email</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            ) : (
              <Text style={styles.fieldValue}>{email || 'Not set'}</Text>
            )}
          </View>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Language</Text>
            {isEditing ? (
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowLanguageModal(true)}
              >
                <Text style={styles.dropdownButtonText}>{language || 'Select language'}</Text>
                <IconSymbol
                  ios_icon_name="chevron.down"
                  android_material_icon_name="arrow_drop_down"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            ) : (
              <Text style={styles.fieldValue}>{language || 'Not set'}</Text>
            )}
          </View>
        </View>

        {/* Payment Information */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          <Text style={styles.sectionSubtitle}>For receiving payments only</Text>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>PayPal Email</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={paypalEmail}
                onChangeText={setPaypalEmail}
                placeholder="Enter your PayPal email"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            ) : (
              <Text style={styles.fieldValue}>{paypalEmail || 'Not set'}</Text>
            )}
          </View>
        </View>

        {/* Creator Information - Read Only */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Creator Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Username</Text>
            <Text style={styles.infoValue}>@{creator.creator_handle}</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Region</Text>
            <Text style={styles.infoValue}>{creator.region || 'Not set'}</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Graduation Tier</Text>
            <Text style={styles.infoValue}>
              {creator.graduation_status || 'Rookie'}
            </Text>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/onboarding' as any)}
          >
            <View style={styles.settingLeft}>
              <IconSymbol
                ios_icon_name="book.fill"
                android_material_icon_name="menu_book"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.settingLabel}>View Onboarding</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron_right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Manager Section */}
        {!creator.assigned_manager_id && (
          <TouchableOpacity
            style={styles.requestButton}
            onPress={handleRequestManager}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.requestButtonGradient}
            >
              <Text style={styles.requestButtonText}>Request Manager</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Save Button */}
        {isEditing && (
          <TouchableOpacity
            style={[styles.saveButton, (isSaving || isUploadingProfilePic) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving || isUploadingProfilePic}
          >
            {(isSaving || isUploadingProfilePic) ? (
              <View style={styles.savingContainer}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.saveButtonText}>
                  {isUploadingProfilePic ? 'Uploading...' : 'Saving...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Language</Text>
            {LANGUAGE_OPTIONS.map((option, index) => (
              <React.Fragment key={option}>
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    setLanguage(option);
                    setShowLanguageModal(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{option}</Text>
                  {language === option && (
                    <IconSymbol
                      ios_icon_name="checkmark"
                      android_material_icon_name="check"
                      size={20}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
                {index < LANGUAGE_OPTIONS.length - 1 && <View style={styles.modalDivider} />}
              </React.Fragment>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    borderRadius: 24,
    padding: 32,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  editBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  uploadHint: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  name: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    paddingVertical: 4,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdownButton: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  requestButton: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  requestButtonGradient: {
    padding: 18,
    alignItems: 'center',
  },
  requestButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    marginRight: 16,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  modalDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
