
import { supabase } from '@/app/integrations/supabase/client';
import * as ImageManipulator from 'expo-image-manipulator';

export interface ImageUploadResult {
  publicUrl: string;
  path: string;
}

/**
 * Uploads an image to Supabase Storage
 * @param imageUri - Local URI of the image to upload
 * @param bucket - Storage bucket name (default: 'avatars')
 * @param folder - Optional folder path within the bucket
 * @param maxWidth - Maximum width for image compression (default: 800)
 * @param maxHeight - Maximum height for image compression (default: 800)
 * @param quality - Image quality 0-1 (default: 0.8)
 * @returns Promise with public URL and storage path
 */
export async function uploadImageToStorage(
  imageUri: string,
  bucket: string = 'avatars',
  folder?: string,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.8
): Promise<ImageUploadResult> {
  try {
    console.log('[ImageUpload] Starting upload process for:', imageUri);

    // Step 1: Compress and resize the image
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: maxWidth, height: maxHeight } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    );

    console.log('[ImageUpload] Image compressed:', manipulatedImage.uri);

    // Step 2: Convert image to blob
    const response = await fetch(manipulatedImage.uri);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);

    console.log('[ImageUpload] Image converted to binary, size:', fileData.length, 'bytes');

    // Step 3: Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileName = `${timestamp}-${randomString}.jpg`;
    
    // Build the storage path
    const storagePath = folder ? `${folder}/${fileName}` : fileName;

    console.log('[ImageUpload] Uploading to bucket:', bucket, 'path:', storagePath);

    // Step 4: Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileData, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('[ImageUpload] Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    console.log('[ImageUpload] Upload successful:', uploadData);

    // Step 5: Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    console.log('[ImageUpload] Public URL generated:', urlData.publicUrl);

    return {
      publicUrl: urlData.publicUrl,
      path: storagePath,
    };
  } catch (error) {
    console.error('[ImageUpload] Unexpected error:', error);
    throw error;
  }
}

/**
 * Deletes an image from Supabase Storage
 * @param path - Storage path of the image to delete
 * @param bucket - Storage bucket name (default: 'avatars')
 */
export async function deleteImageFromStorage(
  path: string,
  bucket: string = 'avatars'
): Promise<void> {
  try {
    console.log('[ImageUpload] Deleting image from bucket:', bucket, 'path:', path);

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error('[ImageUpload] Delete error:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }

    console.log('[ImageUpload] Image deleted successfully');
  } catch (error) {
    console.error('[ImageUpload] Unexpected error during deletion:', error);
    throw error;
  }
}

/**
 * Extracts the storage path from a public URL
 * @param publicUrl - The public URL from Supabase Storage
 * @param bucket - Storage bucket name (default: 'avatars')
 * @returns The storage path or null if invalid URL
 */
export function extractStoragePathFromUrl(
  publicUrl: string,
  bucket: string = 'avatars'
): string | null {
  try {
    const url = new URL(publicUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.indexOf(bucket);
    
    if (bucketIndex === -1) {
      return null;
    }
    
    return pathParts.slice(bucketIndex + 1).join('/');
  } catch (error) {
    console.error('[ImageUpload] Error extracting path from URL:', error);
    return null;
  }
}
</parameter>
</invoke>

Now let me install the required dependency for image manipulation:Now let's update the profile screen to use the new image upload utility:

<write file="app/(tabs)/profile.tsx">
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
  Image,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import { useCreatorData } from '@/hooks/useCreatorData';
import { IconSymbol } from '@/components/IconSymbol';
import { uploadImageToStorage, deleteImageFromStorage, extractStoragePathFromUrl } from '@/utils/imageUpload';

export default function ProfileScreen() {
  const { creator, loading: creatorLoading, refetch } = useCreatorData();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingProfilePic, setIsUploadingProfilePic] = useState(false);
  const [isUploadingFeature, setIsUploadingFeature] = useState(false);

  // Editable fields
  const [email, setEmail] = useState('');
  const [language, setLanguage] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [profileFeature, setProfileFeature] = useState<string | null>(null);

  // Track if images have changed
  const [profilePictureChanged, setProfilePictureChanged] = useState(false);
  const [profileFeatureChanged, setProfileFeatureChanged] = useState(false);

  useEffect(() => {
    if (creator) {
      setEmail(creator.email || '');
      setLanguage(creator.language || 'English');
      setPaypalEmail(creator.paypal_email || '');
      setProfilePicture(creator.profile_picture_url || creator.avatar_url || null);
      setProfileFeature((creator as any).profile_feature_url || null);
      setProfilePictureChanged(false);
      setProfileFeatureChanged(false);
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
      setProfilePicture(result.assets[0].uri);
      setProfilePictureChanged(true);
    }
  };

  const pickProfileFeature = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileFeature(result.assets[0].uri);
      setProfileFeatureChanged(true);
    }
  };

  const handleSave = async () => {
    if (!creator) return;

    setIsSaving(true);
    try {
      const updates: any = {
        email,
        language,
        paypal_email: paypalEmail,
      };

      // Upload profile picture if it changed
      if (profilePictureChanged && profilePicture) {
        setIsUploadingProfilePic(true);
        try {
          console.log('[Profile] Uploading profile picture...');
          
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
            profilePicture,
            'avatars',
            `creators/${creator.id}`,
            800,
            800,
            0.8
          );

          console.log('[Profile] Profile picture uploaded:', uploadResult.publicUrl);
          updates.profile_picture_url = uploadResult.publicUrl;
          updates.avatar_url = uploadResult.publicUrl;
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

      // Upload profile feature if it changed
      if (profileFeatureChanged && profileFeature) {
        setIsUploadingFeature(true);
        try {
          console.log('[Profile] Uploading profile feature...');
          
          // Delete old profile feature if it exists
          if ((creator as any).profile_feature_url) {
            const oldPath = extractStoragePathFromUrl((creator as any).profile_feature_url, 'avatars');
            if (oldPath) {
              try {
                await deleteImageFromStorage(oldPath, 'avatars');
                console.log('[Profile] Old profile feature deleted');
              } catch (deleteError) {
                console.warn('[Profile] Could not delete old profile feature:', deleteError);
              }
            }
          }

          // Upload new profile feature
          const uploadResult = await uploadImageToStorage(
            profileFeature,
            'avatars',
            `creators/${creator.id}/features`,
            1600,
            900,
            0.85
          );

          console.log('[Profile] Profile feature uploaded:', uploadResult.publicUrl);
          updates.profile_feature_url = uploadResult.publicUrl;
        } catch (uploadError) {
          console.error('[Profile] Profile feature upload error:', uploadError);
          Alert.alert('Upload Error', 'Failed to upload profile feature. Please try again.');
          setIsSaving(false);
          setIsUploadingFeature(false);
          return;
        } finally {
          setIsUploadingFeature(false);
        }
      }

      // Update the creators table
      console.log('[Profile] Updating creators table with:', updates);
      const { error } = await supabase
        .from('creators')
        .update(updates)
        .eq('id', creator.id);

      if (error) {
        console.error('[Profile] Error updating profile:', error);
        Alert.alert('Error', 'Failed to update profile. Please try again.');
      } else {
        Alert.alert('Success', 'Profile updated successfully!');
        setIsEditing(false);
        setProfilePictureChanged(false);
        setProfileFeatureChanged(false);
        await refetch();
      }
    } catch (error) {
      console.error('[Profile] Error saving profile:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
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
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Profile', headerShown: true }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!creator) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Profile', headerShown: true }} />
        <Text style={styles.errorText}>No profile data available</Text>
      </View>
    );
  }

  const liveHours = Math.floor((creator.live_duration_seconds_30d || 0) / 3600);

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
                  setProfilePicture(creator.profile_picture_url || creator.avatar_url || null);
                  setProfileFeature((creator as any).profile_feature_url || null);
                  setProfilePictureChanged(false);
                  setProfileFeatureChanged(false);
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
        {/* Profile Header */}
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
          >
            {profilePicture ? (
              <Image source={{ uri: profilePicture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {creator.first_name?.[0]}{creator.last_name?.[0]}
                </Text>
              </View>
            )}
            {isEditing && (
              <View style={styles.editBadge}>
                {isUploadingProfilePic ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.editBadgeText}>✏️</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.name}>
            {creator.first_name} {creator.last_name}
          </Text>
          <Text style={styles.handle}>@{creator.creator_handle}</Text>
          
          {/* Verify Icon - Clickable */}
          <TouchableOpacity 
            style={styles.verifyIconContainer}
            onPress={() => router.push('/tier-explanation' as any)}
          >
            <IconSymbol
              ios_icon_name="checkmark.seal.fill"
              android_material_icon_name="verified"
              size={32}
              color="#FFD700"
            />
          </TouchableOpacity>
        </LinearGradient>

        {/* Profile Feature Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profile Feature</Text>
          <TouchableOpacity
            onPress={isEditing ? pickProfileFeature : undefined}
            disabled={!isEditing || isUploadingFeature}
            style={styles.profileFeatureContainer}
          >
            {profileFeature ? (
              <Image source={{ uri: profileFeature }} style={styles.profileFeatureImage} />
            ) : (
              <View style={styles.profileFeaturePlaceholder}>
                <IconSymbol
                  ios_icon_name="photo"
                  android_material_icon_name="image"
                  size={48}
                  color={colors.textTertiary}
                />
                <Text style={styles.profileFeaturePlaceholderText}>
                  {isEditing ? 'Tap to add profile feature' : 'No profile feature'}
                </Text>
              </View>
            )}
            {isEditing && profileFeature && (
              <View style={styles.editBadgeFeature}>
                {isUploadingFeature ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.editBadgeText}>✏️</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Editable Fields */}
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
              <TextInput
                style={styles.input}
                value={language}
                onChangeText={setLanguage}
                placeholder="e.g., English, Spanish"
                placeholderTextColor={colors.textSecondary}
              />
            ) : (
              <Text style={styles.fieldValue}>{language || 'Not set'}</Text>
            )}
          </View>
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

        {/* Non-Editable Fields */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Creator Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>TikTok Handle</Text>
            <Text style={styles.infoValue}>@{creator.creator_handle}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Region</Text>
            <Text style={styles.infoValue}>{creator.region || 'Not set'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Language</Text>
            <Text style={styles.infoValue}>{creator.language || 'Not set'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Graduation Tier</Text>
            <Text style={styles.infoValue}>
              {creator.graduation_status || 'Rookie'}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Diamonds</Text>
              <Text style={styles.statValue}>
                {(creator.total_diamonds || 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Live Hours</Text>
              <Text style={styles.statValue}>{liveHours}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Live Days</Text>
              <Text style={styles.statValue}>{creator.live_days_30d || 0}</Text>
            </View>
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
            style={[styles.saveButton, (isSaving || isUploadingProfilePic || isUploadingFeature) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving || isUploadingProfilePic || isUploadingFeature}
          >
            {(isSaving || isUploadingProfilePic || isUploadingFeature) ? (
              <View style={styles.savingContainer}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.saveButtonText}>
                  {isUploadingProfilePic ? 'Uploading profile picture...' : 
                   isUploadingFeature ? 'Uploading feature image...' : 
                   'Saving...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
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
    borderRadius: 24,
    padding: 32,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadgeText: {
    fontSize: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  handle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  verifyIconContainer: {
    marginTop: 12,
  },
  card: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  profileFeatureContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  profileFeatureImage: {
    width: '100%',
    height: '100%',
  },
  profileFeaturePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  profileFeaturePlaceholderText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 8,
  },
  editBadgeFeature: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
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
    padding: 16,
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
    padding: 16,
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
});
