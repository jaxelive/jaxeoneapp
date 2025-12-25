
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { supabase } from '@/app/integrations/supabase/client';

interface ManagerData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
  username: string | null;
  whatsapp: string | null;
  role: string;
  tiktok_handle: string | null;
  manager_avatar_url: string | null;
}

export default function ManagerDetailsScreen() {
  const params = useLocalSearchParams();
  const managerId = params.managerId as string;

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [manager, setManager] = useState<ManagerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (managerId) {
      fetchManagerData();
    }
  }, [managerId]);

  const fetchManagerData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[ManagerDetails] Fetching manager data for ID:', managerId);

      // Fetch manager with user data
      const { data, error: fetchError } = await supabase
        .from('managers')
        .select(`
          id,
          whatsapp,
          tiktok_handle,
          avatar_url,
          users:user_id (
            id,
            first_name,
            last_name,
            email,
            avatar_url,
            username,
            role
          )
        `)
        .eq('id', managerId)
        .single();

      if (fetchError) {
        console.error('[ManagerDetails] Fetch error:', fetchError);
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      if (data && data.users) {
        const managerData: ManagerData = {
          id: data.users.id,
          first_name: data.users.first_name,
          last_name: data.users.last_name,
          email: data.users.email,
          avatar_url: data.users.avatar_url,
          username: data.users.username,
          whatsapp: data.whatsapp,
          role: data.users.role,
          tiktok_handle: data.tiktok_handle,
          manager_avatar_url: data.avatar_url,
        };

        console.log('[ManagerDetails] Manager data loaded:', managerData);
        setManager(managerData);
      } else {
        setError('Manager not found');
      }
    } catch (err: any) {
      console.error('[ManagerDetails] Unexpected error:', err);
      setError(err?.message || 'Failed to fetch manager data');
    } finally {
      setLoading(false);
    }
  };

  const handleTikTokPress = () => {
    // Use tiktok_handle from managers table first, fallback to username from users table
    const tiktokHandle = manager?.tiktok_handle || manager?.username;
    
    if (!tiktokHandle) {
      Alert.alert('Info', 'TikTok handle not available');
      return;
    }
    
    // Remove @ if it exists at the start
    const cleanHandle = tiktokHandle.startsWith('@') ? tiktokHandle.slice(1) : tiktokHandle;
    const url = `https://www.tiktok.com/@${cleanHandle}`;
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open TikTok');
    });
  };

  const handleEmailPress = () => {
    if (!manager?.email) {
      Alert.alert('Info', 'Email not available');
      return;
    }
    Linking.openURL(`mailto:${manager.email}`).catch(() => {
      Alert.alert('Error', 'Could not open email app');
    });
  };

  const handleWhatsAppPress = () => {
    if (!manager?.whatsapp) {
      Alert.alert('Info', 'WhatsApp number not available');
      return;
    }
    const phoneNumber = manager.whatsapp.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${phoneNumber}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open WhatsApp');
    });
  };

  if (!fontsLoaded || loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Manager Details',
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading manager details...</Text>
        </View>
      </>
    );
  }

  if (error || !manager) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Manager Details',
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.errorText}>{error || 'Manager not found'}</Text>
        </View>
      </>
    );
  }

  // Use manager_avatar_url from managers table first, fallback to avatar_url from users table
  const profileImageUrl = manager.manager_avatar_url || manager.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop';
  
  // Use tiktok_handle from managers table first, fallback to username from users table
  const tiktokHandle = manager.tiktok_handle || manager.username;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Manager Details',
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: profileImageUrl }}
              style={styles.profileImage}
            />
            <View style={styles.onlineIndicator} />
          </View>

          <Text style={styles.managerName}>
            {manager.first_name} {manager.last_name}
          </Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {manager.role === 'manager' ? 'CREATOR MANAGER' : manager.role.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Contact Options */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Contact Options</Text>

          {/* TikTok */}
          {tiktokHandle && (
            <TouchableOpacity style={styles.contactCard} onPress={handleTikTokPress}>
              <View style={styles.contactIconContainer}>
                <IconSymbol
                  ios_icon_name="music.note"
                  android_material_icon_name="music-note"
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>TikTok</Text>
                <Text style={styles.contactValue}>
                  {tiktokHandle.startsWith('@') ? tiktokHandle : `@${tiktokHandle}`}
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          )}

          {/* Email */}
          <TouchableOpacity style={styles.contactCard} onPress={handleEmailPress}>
            <View style={styles.contactIconContainer}>
              <IconSymbol
                ios_icon_name="envelope.fill"
                android_material_icon_name="email"
                size={24}
                color={colors.primary}
              />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>{manager.email}</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>

          {/* WhatsApp */}
          {manager.whatsapp && (
            <TouchableOpacity style={styles.contactCard} onPress={handleWhatsAppPress}>
              <View style={styles.contactIconContainer}>
                <IconSymbol
                  ios_icon_name="message.fill"
                  android_material_icon_name="chat"
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>WhatsApp</Text>
                <Text style={styles.contactValue}>{manager.whatsapp}</Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          )}
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
            Your manager is here to support you on your creator journey. Feel free to reach out with any questions or concerns.
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
    paddingHorizontal: 32,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  profileCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.primary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    borderWidth: 4,
    borderColor: colors.backgroundAlt,
  },
  managerName: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  contactSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 16,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  contactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.grey,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
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
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
