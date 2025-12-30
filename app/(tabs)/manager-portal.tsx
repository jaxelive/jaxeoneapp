
import React, { useEffect, useState, useCallback } from 'react';
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
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { supabase } from '@/app/integrations/supabase/client';
import { useCreatorData } from '@/hooks/useCreatorData';

const CREATOR_HANDLE = 'avelezsanti';

interface ManagerData {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
  whatsapp: string | null;
  tiktok_handle: string | null;
  promoted_to_manager_at: string | null;
}

interface CreatorData {
  id: string;
  first_name: string;
  last_name: string;
  creator_handle: string;
  email: string;
  region: string | null;
  graduation_status: string | null;
  total_diamonds: number;
  phone: string | null;
  avatar_url: string | null;
  profile_picture_url: string | null;
}

interface ManagerStats {
  totalCreators: number;
  totalRookies: number;
  totalGraduated: number;
  collectiveDiamonds: number;
}

export default function ManagerPortalScreen() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const { creator, loading: creatorLoading } = useCreatorData(CREATOR_HANDLE);
  const [manager, setManager] = useState<ManagerData | null>(null);
  const [assignedCreators, setAssignedCreators] = useState<CreatorData[]>([]);
  const [stats, setStats] = useState<ManagerStats>({
    totalCreators: 0,
    totalRookies: 0,
    totalGraduated: 0,
    collectiveDiamonds: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchManagerData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[ManagerPortal] Fetching manager data for creator:', CREATOR_HANDLE);

      // Get the logged-in creator's manager ID
      if (!creator?.assigned_manager_id) {
        console.log('[ManagerPortal] No manager assigned to creator');
        setError('You do not have a manager assigned yet.');
        setLoading(false);
        return;
      }

      const managerId = creator.assigned_manager_id;
      console.log('[ManagerPortal] Manager ID:', managerId);

      // Fetch manager details
      const { data: managerData, error: managerError } = await supabase
        .from('managers')
        .select(`
          id,
          user_id,
          whatsapp,
          tiktok_handle,
          avatar_url,
          promoted_to_manager_at,
          users:user_id (
            id,
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .eq('id', managerId)
        .single();

      if (managerError) {
        console.error('[ManagerPortal] Manager fetch error:', managerError);
        setError(managerError.message);
        setLoading(false);
        return;
      }

      if (managerData && managerData.users) {
        const managerUser = managerData.users as any;
        const managerInfo: ManagerData = {
          id: managerData.id,
          user_id: managerUser.id,
          first_name: managerUser.first_name,
          last_name: managerUser.last_name,
          email: managerUser.email,
          avatar_url: managerData.avatar_url || managerUser.avatar_url,
          whatsapp: managerData.whatsapp,
          tiktok_handle: managerData.tiktok_handle,
          promoted_to_manager_at: managerData.promoted_to_manager_at,
        };

        console.log('[ManagerPortal] Manager data loaded:', managerInfo);
        setManager(managerInfo);

        // Fetch all creators assigned to this manager
        const { data: creatorsData, error: creatorsError } = await supabase
          .from('creators')
          .select('id, first_name, last_name, creator_handle, email, region, graduation_status, total_diamonds, phone, avatar_url, profile_picture_url')
          .eq('assigned_manager_id', managerId)
          .eq('is_active', true)
          .order('total_diamonds', { ascending: false });

        if (creatorsError) {
          console.error('[ManagerPortal] Creators fetch error:', creatorsError);
        } else {
          console.log('[ManagerPortal] Assigned creators loaded:', creatorsData?.length || 0);
          setAssignedCreators(creatorsData || []);

          // Calculate stats
          const totalCreators = creatorsData?.length || 0;
          const totalRookies = creatorsData?.filter(c => 
            !c.graduation_status || 
            c.graduation_status.toLowerCase().includes('rookie') ||
            c.graduation_status.toLowerCase().includes('new')
          ).length || 0;
          const totalGraduated = creatorsData?.filter(c => 
            c.graduation_status && 
            (c.graduation_status.toLowerCase().includes('silver') || 
             c.graduation_status.toLowerCase().includes('gold'))
          ).length || 0;
          const collectiveDiamonds = creatorsData?.reduce((sum, c) => sum + (c.total_diamonds || 0), 0) || 0;

          setStats({
            totalCreators,
            totalRookies,
            totalGraduated,
            collectiveDiamonds,
          });

          console.log('[ManagerPortal] Stats calculated:', {
            totalCreators,
            totalRookies,
            totalGraduated,
            collectiveDiamonds,
          });
        }
      } else {
        setError('Manager not found');
      }
    } catch (err: any) {
      console.error('[ManagerPortal] Unexpected error:', err);
      setError(err?.message || 'Failed to fetch manager data');
    } finally {
      setLoading(false);
    }
  }, [creator]);

  useEffect(() => {
    if (creator && !creatorLoading) {
      fetchManagerData();
    }
  }, [creator, creatorLoading]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchManagerData();
    setRefreshing(false);
  };

  const handleEmailPress = (email: string) => {
    if (!email) {
      Alert.alert('Info', 'Email not available');
      return;
    }
    Linking.openURL(`mailto:${email}`).catch(() => {
      Alert.alert('Error', 'Could not open email app');
    });
  };

  const handleTikTokPress = (handle: string) => {
    if (!handle) {
      Alert.alert('Info', 'TikTok handle not available');
      return;
    }
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;
    const url = `https://www.tiktok.com/@${cleanHandle}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open TikTok');
    });
  };

  const handleWhatsAppPress = (phone: string) => {
    if (!phone) {
      Alert.alert('Info', 'WhatsApp number not available');
      return;
    }
    const phoneNumber = phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${phoneNumber}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open WhatsApp');
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getGraduationBadgeColor = (status: string | null) => {
    if (!status) return colors.grey;
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('gold')) return '#FFD700';
    if (lowerStatus.includes('silver')) return '#C0C0C0';
    return colors.primary;
  };

  if (!fontsLoaded || loading || creatorLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Manager Portal',
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading manager portal...</Text>
        </View>
      </>
    );
  }

  if (error || !manager) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Manager Portal',
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={[styles.container, styles.centerContent]}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="warning"
            size={64}
            color={colors.error}
          />
          <Text style={styles.errorText}>{error || 'Manager not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchManagerData}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const profileImageUrl = manager.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Manager Portal',
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* MANAGER HEADER SECTION */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.profileImageContainer}>
              <Image
                source={{ uri: profileImageUrl }}
                style={styles.profileImage}
              />
              <View style={styles.onlineIndicator} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.managerName}>
                {manager.first_name} {manager.last_name}
              </Text>
              <TouchableOpacity 
                style={styles.emailRow}
                onPress={() => handleEmailPress(manager.email)}
              >
                <IconSymbol
                  ios_icon_name="envelope.fill"
                  android_material_icon_name="email"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.emailText}>{manager.email}</Text>
              </TouchableOpacity>
              <View style={styles.managerSinceRow}>
                <IconSymbol
                  ios_icon_name="calendar"
                  android_material_icon_name="calendar-today"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.managerSinceText}>
                  Manager Since: {formatDate(manager.promoted_to_manager_at)}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Contact Actions */}
          <View style={styles.quickActions}>
            {manager.tiktok_handle && (
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => handleTikTokPress(manager.tiktok_handle!)}
              >
                <IconSymbol
                  ios_icon_name="music.note"
                  android_material_icon_name="music-note"
                  size={20}
                  color={colors.text}
                />
                <Text style={styles.quickActionText}>TikTok</Text>
              </TouchableOpacity>
            )}
            {manager.whatsapp && (
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => handleWhatsAppPress(manager.whatsapp!)}
              >
                <IconSymbol
                  ios_icon_name="message.fill"
                  android_material_icon_name="chat"
                  size={20}
                  color={colors.text}
                />
                <Text style={styles.quickActionText}>WhatsApp</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => handleEmailPress(manager.email)}
            >
              <IconSymbol
                ios_icon_name="envelope.fill"
                android_material_icon_name="email"
                size={20}
                color={colors.text}
              />
              <Text style={styles.quickActionText}>Email</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* MANAGER STATS SECTION */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Performance Summary</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <View style={styles.statIconContainer}>
                <IconSymbol
                  ios_icon_name="person.3.fill"
                  android_material_icon_name="group"
                  size={24}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.statValue}>{stats.totalCreators}</Text>
              <Text style={styles.statLabel}>Total Creators</Text>
            </View>

            <View style={styles.statBox}>
              <View style={styles.statIconContainer}>
                <IconSymbol
                  ios_icon_name="star.fill"
                  android_material_icon_name="star"
                  size={24}
                  color="#10B981"
                />
              </View>
              <Text style={styles.statValue}>{stats.totalRookies}</Text>
              <Text style={styles.statLabel}>Rookies</Text>
            </View>

            <View style={styles.statBox}>
              <View style={styles.statIconContainer}>
                <IconSymbol
                  ios_icon_name="trophy.fill"
                  android_material_icon_name="emoji-events"
                  size={24}
                  color="#FFD700"
                />
              </View>
              <Text style={styles.statValue}>{stats.totalGraduated}</Text>
              <Text style={styles.statLabel}>Graduated</Text>
            </View>

            <View style={styles.statBox}>
              <View style={styles.statIconContainer}>
                <IconSymbol
                  ios_icon_name="diamond.fill"
                  android_material_icon_name="diamond"
                  size={24}
                  color="#06B6D4"
                />
              </View>
              <Text style={styles.statValue}>
                {stats.collectiveDiamonds.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Collective Diamonds</Text>
            </View>
          </View>
        </View>

        {/* ASSIGNED CREATORS SECTION */}
        <View style={styles.creatorsCard}>
          <Text style={styles.sectionTitle}>
            Assigned Creators ({assignedCreators.length})
          </Text>
          
          {assignedCreators.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="person.crop.circle.badge.questionmark"
                android_material_icon_name="person-add"
                size={48}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyStateText}>No creators assigned yet</Text>
            </View>
          ) : (
            <View style={styles.creatorsList}>
              {assignedCreators.map((creator, index) => (
                <View key={creator.id} style={styles.creatorRow}>
                  {/* Creator Avatar */}
                  <View style={styles.creatorAvatarContainer}>
                    {creator.avatar_url || creator.profile_picture_url ? (
                      <Image
                        source={{ uri: creator.avatar_url || creator.profile_picture_url }}
                        style={styles.creatorAvatar}
                      />
                    ) : (
                      <View style={styles.creatorAvatarPlaceholder}>
                        <IconSymbol
                          ios_icon_name="person.fill"
                          android_material_icon_name="person"
                          size={20}
                          color={colors.textSecondary}
                        />
                      </View>
                    )}
                  </View>

                  {/* Creator Info */}
                  <View style={styles.creatorInfo}>
                    <View style={styles.creatorNameRow}>
                      <Text style={styles.creatorName}>
                        {creator.first_name} {creator.last_name}
                      </Text>
                      {creator.graduation_status && (
                        <View 
                          style={[
                            styles.graduationBadge,
                            { backgroundColor: getGraduationBadgeColor(creator.graduation_status) }
                          ]}
                        >
                          <Text style={styles.graduationBadgeText}>
                            {creator.graduation_status}
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.creatorDetailsRow}>
                      {creator.region && (
                        <View style={styles.creatorDetail}>
                          <IconSymbol
                            ios_icon_name="location.fill"
                            android_material_icon_name="location-on"
                            size={14}
                            color={colors.textSecondary}
                          />
                          <Text style={styles.creatorDetailText}>{creator.region}</Text>
                        </View>
                      )}
                      <View style={styles.creatorDetail}>
                        <IconSymbol
                          ios_icon_name="diamond.fill"
                          android_material_icon_name="diamond"
                          size={14}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.creatorDetailText}>
                          {creator.total_diamonds.toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    {/* Contact Actions */}
                    <View style={styles.creatorActions}>
                      <TouchableOpacity 
                        style={styles.creatorActionButton}
                        onPress={() => handleEmailPress(creator.email)}
                      >
                        <IconSymbol
                          ios_icon_name="envelope.fill"
                          android_material_icon_name="email"
                          size={16}
                          color={colors.primary}
                        />
                        <Text style={styles.creatorActionText}>Email</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.creatorActionButton}
                        onPress={() => handleTikTokPress(creator.creator_handle)}
                      >
                        <IconSymbol
                          ios_icon_name="music.note"
                          android_material_icon_name="music-note"
                          size={16}
                          color={colors.primary}
                        />
                        <Text style={styles.creatorActionText}>TikTok</Text>
                      </TouchableOpacity>

                      {creator.phone && (
                        <TouchableOpacity 
                          style={styles.creatorActionButton}
                          onPress={() => handleWhatsAppPress(creator.phone!)}
                        >
                          <IconSymbol
                            ios_icon_name="message.fill"
                            android_material_icon_name="chat"
                            size={16}
                            color={colors.primary}
                          />
                          <Text style={styles.creatorActionText}>WhatsApp</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 120 }} />
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
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  // HEADER CARD
  headerCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.success,
    borderWidth: 3,
    borderColor: colors.backgroundAlt,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  managerName: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 8,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  emailText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.primary,
  },
  managerSinceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  managerSinceText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: colors.grey,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  quickActionText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
  },

  // STATS CARD
  statsCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.grey,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // CREATORS CARD
  creatorsCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    marginTop: 12,
  },
  creatorsList: {
    gap: 16,
  },
  creatorRow: {
    flexDirection: 'row',
    backgroundColor: colors.grey,
    borderRadius: 16,
    padding: 16,
  },
  creatorAvatarContainer: {
    marginRight: 12,
  },
  creatorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  creatorAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorInfo: {
    flex: 1,
  },
  creatorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  creatorName: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
  },
  graduationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  graduationBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: '#000000',
  },
  creatorDetailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  creatorDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  creatorDetailText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  creatorActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  creatorActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  creatorActionText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
});
