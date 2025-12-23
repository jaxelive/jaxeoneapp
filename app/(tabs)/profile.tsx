
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

export default function ProfileScreen() {
  const { creator, loading: creatorLoading, refetch } = useCreatorData();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Editable fields
  const [email, setEmail] = useState('');
  const [language, setLanguage] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [profileFeature, setProfileFeature] = useState<string | null>(null);

  useEffect(() => {
    if (creator) {
      setEmail(creator.email || '');
      setLanguage(creator.language || 'English');
      setPaypalEmail(creator.paypal_email || '');
      setProfilePicture(creator.profile_picture_url || creator.avatar_url || null);
      setProfileFeature((creator as any).profile_feature_url || null);
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

      // Only update profile picture if it changed
      if (profilePicture && profilePicture !== creator.profile_picture_url) {
        updates.profile_picture_url = profilePicture;
      }

      // Only update profile feature if it changed
      if (profileFeature !== (creator as any).profile_feature_url) {
        updates.profile_feature_url = profileFeature;
      }

      const { error } = await supabase
        .from('creators')
        .update(updates)
        .eq('id', creator.id);

      if (error) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', 'Failed to update profile. Please try again.');
      } else {
        Alert.alert('Success', 'Profile updated successfully!');
        setIsEditing(false);
        refetch();
      }
    } catch (error) {
      console.error('Error saving profile:', error);
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
            disabled={!isEditing}
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
                <Text style={styles.editBadgeText}>✏️</Text>
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
            disabled={!isEditing}
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
                <Text style={styles.editBadgeText}>✏️</Text>
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
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
