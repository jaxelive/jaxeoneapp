
import { useCreatorData } from '@/hooks/useCreatorData';
import { IconSymbol } from '@/components/IconSymbol';
import { Stack, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
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
  TextInput,
  Animated,
  Easing,
  Modal,
} from 'react-native';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/app/integrations/supabase/client';
import { colors } from '@/styles/commonStyles';

interface ManagerIdentity {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
  whatsapp: string | null;
  tiktok_handle: string | null;
  promoted_to_manager_at: string | null;
  manager_avatar_url: string | null;
  regions_managed: string[];
  languages: string[];
  whatsapp_group_link: string | null;
  language_preference: string | null;
}

interface AssignedCreator {
  id: string;
  first_name: string;
  last_name: string;
  creator_handle: string;
  email: string;
  region: string | null;
  graduation_status: string | null;
  total_diamonds: number;
  diamonds_monthly: number;
  phone: string | null;
  avatar_url: string | null;
  profile_picture_url: string | null;
  battle_booked: boolean;
  graduation_eligible: boolean;
  graduation_paid_this_month: boolean;
  was_graduated_at_assignment: boolean;
  assigned_at: string | null;
}

interface ManagerStats {
  totalCreators: number;
  totalRookies: number;
  totalSilver: number;
  totalGold: number;
  collectiveDiamonds: number;
  creatorsBookedBattle: number;
  creatorsMissingBattle: number;
}

interface ManagerRanking {
  id: string;
  first_name: string;
  last_name: string;
  graduated_creators: number;
  tiktok_handle: string | null;
  avatar_url: string | null;
}

type CreatorStatusTab = 'all' | 'rookie' | 'silver' | 'gold';
type FilterBattle = 'all' | 'booked' | 'missing';
type FilterPayout = 'all' | 'eligible' | 'paid';
type TabOption = 'creators' | 'rankings';

const CREATOR_HANDLE = 'camilocossio';
const SILVER_THRESHOLD = 200000;
const GOLD_THRESHOLD = 500000;
const SILVER_PAYOUT = 100;
const GOLD_PAYOUT = 200;

function ManagerPortalScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const { creator, loading: creatorLoading } = useCreatorData(CREATOR_HANDLE);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [managerIdentity, setManagerIdentity] = useState<ManagerIdentity | null>(null);
  const [isManagerUser, setIsManagerUser] = useState(false);
  const [assignedCreators, setAssignedCreators] = useState<AssignedCreator[]>([]);
  const [managerRankings, setManagerRankings] = useState<ManagerRanking[]>([]);
  const [activeTab, setActiveTab] = useState<TabOption>('creators');
  const [statusFilter, setStatusFilter] = useState<CreatorStatusTab>('all');
  const [battleFilter, setBattleFilter] = useState<FilterBattle>('all');
  const [payoutFilter, setPayoutFilter] = useState<FilterPayout>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editedWhatsAppLink, setEditedWhatsAppLink] = useState('');

  // Fetch manager data and validate manager status
  useEffect(() => {
    const fetchManagerData = async () => {
      if (!creator?.creator_handle) {
        console.log('No creator handle available');
        return;
      }
      
      setLoading(true);
      try {
        console.log('Fetching manager data for:', creator.creator_handle);
        
        // Query managers table joined with users table
        const { data: managerData, error: managerError } = await supabase
          .from('managers')
          .select(`
            id,
            user_id,
            tiktok_handle,
            promoted_to_manager_at,
            whatsapp,
            whatsapp_group_link,
            avatar_url,
            language_preference,
            users!inner (
              first_name,
              last_name,
              email,
              avatar_url
            )
          `)
          .eq('tiktok_handle', creator.creator_handle)
          .maybeSingle();

        if (managerError) {
          console.error('Manager query error:', managerError);
        }

        console.log('Manager data received:', managerData);

        // Check if user is a manager - must have a record AND promoted_to_manager_at is not null
        const isManager = managerData && managerData.promoted_to_manager_at !== null;
        
        console.log('Is manager:', isManager);
        console.log('Promoted at:', managerData?.promoted_to_manager_at);

        if (managerData && isManager) {
          // Flatten the joined user data
          const flattenedData: ManagerIdentity = {
            id: managerData.id,
            user_id: managerData.user_id,
            first_name: (managerData.users as any).first_name,
            last_name: (managerData.users as any).last_name,
            email: (managerData.users as any).email,
            avatar_url: managerData.avatar_url || (managerData.users as any).avatar_url,
            whatsapp: managerData.whatsapp,
            tiktok_handle: managerData.tiktok_handle,
            promoted_to_manager_at: managerData.promoted_to_manager_at,
            manager_avatar_url: managerData.avatar_url,
            regions_managed: [],
            languages: [],
            whatsapp_group_link: managerData.whatsapp_group_link,
            language_preference: managerData.language_preference,
          };

          setManagerIdentity(flattenedData);
          setEditedWhatsAppLink(flattenedData.whatsapp_group_link || '');
        }
        
        setIsManagerUser(isManager);

        if (isManager) {
          // Fetch assigned creators and other manager data
          await fetchAssignedCreators();
          await fetchManagerRankings();
        }
      } catch (err) {
        console.error('Error fetching manager data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!creatorLoading) {
      fetchManagerData();
    }
  }, [creator, creatorLoading]);

  const fetchAssignedCreators = async () => {
    try {
      if (!managerIdentity?.id) return;

      const { data, error } = await supabase
        .from('creators')
        .select('*')
        .eq('assigned_manager_id', managerIdentity.id)
        .order('diamonds_monthly', { ascending: false });

      if (error) {
        console.error('Error fetching assigned creators:', error);
        return;
      }

      setAssignedCreators(data || []);
    } catch (err) {
      console.error('Error in fetchAssignedCreators:', err);
    }
  };

  const fetchManagerRankings = async () => {
    try {
      // Fetch top 10 managers by graduated creators count
      const { data, error } = await supabase
        .from('managers')
        .select(`
          id,
          tiktok_handle,
          avatar_url,
          users!inner (
            first_name,
            last_name
          )
        `)
        .not('promoted_to_manager_at', 'is', null)
        .limit(10);

      if (error) {
        console.error('Error fetching manager rankings:', error);
        return;
      }

      // Transform the data
      const rankings: ManagerRanking[] = (data || []).map((manager: any) => ({
        id: manager.id,
        first_name: manager.users.first_name,
        last_name: manager.users.last_name,
        graduated_creators: 0, // TODO: Calculate from creators table
        tiktok_handle: manager.tiktok_handle,
        avatar_url: manager.avatar_url,
      }));

      setManagerRankings(rankings);
    } catch (err) {
      console.error('Error in fetchManagerRankings:', err);
    }
  };

  useEffect(() => {
    if (isManagerUser && managerIdentity) {
      fetchAssignedCreators();
    }
  }, [activeTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (isManagerUser && managerIdentity) {
      await fetchAssignedCreators();
      await fetchManagerRankings();
    }
    setRefreshing(false);
  }, [isManagerUser, managerIdentity]);

  const stats: ManagerStats = useMemo(() => {
    const totalCreators = assignedCreators.length;
    const totalRookies = assignedCreators.filter(c => (c.diamonds_monthly || 0) < SILVER_THRESHOLD).length;
    const totalSilver = assignedCreators.filter(c => (c.diamonds_monthly || 0) >= SILVER_THRESHOLD && (c.diamonds_monthly || 0) < GOLD_THRESHOLD).length;
    const totalGold = assignedCreators.filter(c => (c.diamonds_monthly || 0) >= GOLD_THRESHOLD).length;
    const collectiveDiamonds = assignedCreators.reduce((sum, c) => sum + (c.diamonds_monthly || 0), 0);
    const creatorsBookedBattle = assignedCreators.filter(c => c.battle_booked).length;
    const creatorsMissingBattle = totalCreators - creatorsBookedBattle;

    return {
      totalCreators,
      totalRookies,
      totalSilver,
      totalGold,
      collectiveDiamonds,
      creatorsBookedBattle,
      creatorsMissingBattle,
    };
  }, [assignedCreators]);

  const filteredCreators = useMemo(() => {
    let filtered = [...assignedCreators];

    // Status filter
    if (statusFilter === 'rookie') {
      filtered = filtered.filter(c => (c.diamonds_monthly || 0) < SILVER_THRESHOLD);
    } else if (statusFilter === 'silver') {
      filtered = filtered.filter(c => (c.diamonds_monthly || 0) >= SILVER_THRESHOLD && (c.diamonds_monthly || 0) < GOLD_THRESHOLD);
    } else if (statusFilter === 'gold') {
      filtered = filtered.filter(c => (c.diamonds_monthly || 0) >= GOLD_THRESHOLD);
    }

    // Battle filter
    if (battleFilter === 'booked') {
      filtered = filtered.filter(c => c.battle_booked);
    } else if (battleFilter === 'missing') {
      filtered = filtered.filter(c => !c.battle_booked);
    }

    // Payout filter
    if (payoutFilter === 'eligible') {
      filtered = filtered.filter(c => c.graduation_eligible);
    } else if (payoutFilter === 'paid') {
      filtered = filtered.filter(c => c.graduation_paid_this_month);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.first_name?.toLowerCase().includes(query) ||
        c.last_name?.toLowerCase().includes(query) ||
        c.creator_handle?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [assignedCreators, statusFilter, battleFilter, payoutFilter, searchQuery]);

  const handleTikTokPress = (handle: string) => {
    Linking.openURL(`https://www.tiktok.com/@${handle}`);
  };

  const handleWhatsAppPress = (phone: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    Linking.openURL(`https://wa.me/${cleanPhone}`);
  };

  const handleWhatsAppGroupPress = () => {
    if (managerIdentity?.whatsapp_group_link) {
      Clipboard.setStringAsync(managerIdentity.whatsapp_group_link);
      Alert.alert('Copied!', 'WhatsApp group link copied to clipboard');
    }
  };

  const handleCreatorCardPress = (creatorId: string) => {
    router.push(`/creator-detail?creatorId=${creatorId}`);
  };

  const handleRankingCardPress = (tiktokHandle: string | null) => {
    if (tiktokHandle) {
      handleTikTokPress(tiktokHandle);
    }
  };

  const handleEditPress = () => {
    setIsEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!managerIdentity) return;

    try {
      const { error } = await supabase
        .from('managers')
        .update({ whatsapp_group_link: editedWhatsAppLink })
        .eq('id', managerIdentity.id);

      if (error) throw error;

      setManagerIdentity({
        ...managerIdentity,
        whatsapp_group_link: editedWhatsAppLink,
      });

      Alert.alert('Success', 'WhatsApp group link updated');
      setIsEditModalVisible(false);
    } catch (err) {
      console.error('Error updating WhatsApp link:', err);
      Alert.alert('Error', 'Failed to update WhatsApp link');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getGraduationBadgeColor = (status: string | null) => {
    if (!status) return colors.textSecondary;
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('gold')) return '#FFD700';
    if (lowerStatus.includes('silver')) return '#C0C0C0';
    return colors.textSecondary;
  };

  const getGraduationLevel = (status: string | null): 'rookie' | 'silver' | 'gold' => {
    if (!status) return 'rookie';
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('gold')) return 'gold';
    if (lowerStatus.includes('silver')) return 'silver';
    return 'rookie';
  };

  const getDiamondsToNextGraduation = (monthlyDiamonds: number, currentLevel: 'rookie' | 'silver' | 'gold') => {
    if (currentLevel === 'gold') return 0;
    if (currentLevel === 'silver') return Math.max(0, GOLD_THRESHOLD - monthlyDiamonds);
    return Math.max(0, SILVER_THRESHOLD - monthlyDiamonds);
  };

  const getNextGraduationTarget = (currentLevel: 'rookie' | 'silver' | 'gold') => {
    if (currentLevel === 'gold') return 'Max Level';
    if (currentLevel === 'silver') return 'Gold';
    return 'Silver';
  };

  const getProgressPercentage = (monthlyDiamonds: number, currentLevel: 'rookie' | 'silver' | 'gold') => {
    if (currentLevel === 'gold') return 100;
    if (currentLevel === 'silver') {
      return Math.min(100, (monthlyDiamonds / GOLD_THRESHOLD) * 100);
    }
    return Math.min(100, (monthlyDiamonds / SILVER_THRESHOLD) * 100);
  };

  if (!fontsLoaded || creatorLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isManagerUser) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Manager Portal',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.notManagerContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="warning"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.notManagerTitle}>Not a Manager</Text>
          <Text style={styles.notManagerText}>
            You are not a manager. This portal is only accessible to users with manager privileges.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Manager Portal',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerRight: () => (
            <TouchableOpacity onPress={handleEditPress} style={styles.editButton}>
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Manager Info Card */}
        <View style={styles.managerCard}>
          <View style={styles.managerHeader}>
            {managerIdentity?.avatar_url ? (
              <Image source={{ uri: managerIdentity.avatar_url }} style={styles.managerAvatar} />
            ) : (
              <View style={[styles.managerAvatar, styles.avatarPlaceholder]}>
                <IconSymbol
                  ios_icon_name="person.circle"
                  android_material_icon_name="person"
                  size={40}
                  color={colors.textSecondary}
                />
              </View>
            )}
            <View style={styles.managerInfo}>
              <Text style={styles.managerName}>
                {managerIdentity?.first_name} {managerIdentity?.last_name}
              </Text>
              <Text style={styles.managerEmail}>{managerIdentity?.email}</Text>
              {managerIdentity?.tiktok_handle && (
                <TouchableOpacity onPress={() => handleTikTokPress(managerIdentity.tiktok_handle!)}>
                  <Text style={styles.managerHandle}>@{managerIdentity.tiktok_handle}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {managerIdentity?.whatsapp_group_link && (
            <TouchableOpacity style={styles.whatsappButton} onPress={handleWhatsAppGroupPress}>
              <IconSymbol
                ios_icon_name="link"
                android_material_icon_name="link"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.whatsappButtonText}>Copy WhatsApp Group Link</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalCreators}</Text>
            <Text style={styles.statLabel}>Total Creators</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.collectiveDiamonds.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Collective Diamonds</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalRookies}</Text>
            <Text style={styles.statLabel}>Rookies</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalSilver}</Text>
            <Text style={styles.statLabel}>Silver</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalGold}</Text>
            <Text style={styles.statLabel}>Gold</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.creatorsBookedBattle}</Text>
            <Text style={styles.statLabel}>Battles Booked</Text>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'creators' && styles.activeTab]}
            onPress={() => setActiveTab('creators')}
          >
            <Text style={[styles.tabText, activeTab === 'creators' && styles.activeTabText]}>
              My Creators
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'rankings' && styles.activeTab]}
            onPress={() => setActiveTab('rankings')}
          >
            <Text style={[styles.tabText, activeTab === 'rankings' && styles.activeTabText]}>
              Rankings
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'creators' ? (
          <>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <IconSymbol
                ios_icon_name="magnifyingglass"
                android_material_icon_name="search"
                size={20}
                color={colors.textSecondary}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search creators..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Filters */}
            <View style={styles.filtersContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
                  onPress={() => setStatusFilter('all')}
                >
                  <Text style={[styles.filterChipText, statusFilter === 'all' && styles.filterChipTextActive]}>
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, statusFilter === 'rookie' && styles.filterChipActive]}
                  onPress={() => setStatusFilter('rookie')}
                >
                  <Text style={[styles.filterChipText, statusFilter === 'rookie' && styles.filterChipTextActive]}>
                    Rookie
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, statusFilter === 'silver' && styles.filterChipActive]}
                  onPress={() => setStatusFilter('silver')}
                >
                  <Text style={[styles.filterChipText, statusFilter === 'silver' && styles.filterChipTextActive]}>
                    Silver
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, statusFilter === 'gold' && styles.filterChipActive]}
                  onPress={() => setStatusFilter('gold')}
                >
                  <Text style={[styles.filterChipText, statusFilter === 'gold' && styles.filterChipTextActive]}>
                    Gold
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Creators List */}
            {filteredCreators.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="person.3"
                  android_material_icon_name="group"
                  size={64}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyStateText}>No creators found</Text>
              </View>
            ) : (
              filteredCreators.map((creator) => {
                const currentLevel = getGraduationLevel(creator.graduation_status);
                const diamondsToNext = getDiamondsToNextGraduation(creator.diamonds_monthly || 0, currentLevel);
                const nextTarget = getNextGraduationTarget(currentLevel);
                const progress = getProgressPercentage(creator.diamonds_monthly || 0, currentLevel);

                return (
                  <TouchableOpacity
                    key={creator.id}
                    style={styles.creatorCard}
                    onPress={() => handleCreatorCardPress(creator.id)}
                  >
                    <View style={styles.creatorHeader}>
                      {creator.avatar_url || creator.profile_picture_url ? (
                        <Image
                          source={{ uri: creator.avatar_url || creator.profile_picture_url || '' }}
                          style={styles.creatorAvatar}
                        />
                      ) : (
                        <View style={[styles.creatorAvatar, styles.avatarPlaceholder]}>
                          <IconSymbol
                            ios_icon_name="person.circle"
                            android_material_icon_name="person"
                            size={24}
                            color={colors.textSecondary}
                          />
                        </View>
                      )}
                      <View style={styles.creatorInfo}>
                        <Text style={styles.creatorName}>
                          {creator.first_name} {creator.last_name}
                        </Text>
                        <TouchableOpacity onPress={() => handleTikTokPress(creator.creator_handle)}>
                          <Text style={styles.creatorHandle}>@{creator.creator_handle}</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.creatorBadges}>
                        {creator.battle_booked && (
                          <View style={styles.badge}>
                            <IconSymbol
                              ios_icon_name="checkmark.circle"
                              android_material_icon_name="check-circle"
                              size={16}
                              color="#4CAF50"
                            />
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.creatorStats}>
                      <View style={styles.statItem}>
                        <Text style={styles.statItemValue}>{(creator.diamonds_monthly || 0).toLocaleString()}</Text>
                        <Text style={styles.statItemLabel}>Monthly Diamonds</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={[styles.statItemValue, { color: getGraduationBadgeColor(creator.graduation_status) }]}>
                          {currentLevel.toUpperCase()}
                        </Text>
                        <Text style={styles.statItemLabel}>Status</Text>
                      </View>
                    </View>

                    {currentLevel !== 'gold' && (
                      <View style={styles.progressContainer}>
                        <View style={styles.progressHeader}>
                          <Text style={styles.progressLabel}>Next: {nextTarget}</Text>
                          <Text style={styles.progressValue}>{diamondsToNext.toLocaleString()} to go</Text>
                        </View>
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, { width: `${progress}%` }]} />
                        </View>
                      </View>
                    )}

                    {creator.phone && (
                      <TouchableOpacity
                        style={styles.contactButton}
                        onPress={() => handleWhatsAppPress(creator.phone!)}
                      >
                        <IconSymbol
                          ios_icon_name="message"
                          android_material_icon_name="message"
                          size={16}
                          color={colors.primary}
                        />
                        <Text style={styles.contactButtonText}>WhatsApp</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </>
        ) : (
          <>
            {/* Rankings List */}
            <Text style={styles.sectionTitle}>Top 10 Managers</Text>
            {managerRankings.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="chart.bar"
                  android_material_icon_name="bar-chart"
                  size={64}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyStateText}>No rankings available</Text>
              </View>
            ) : (
              managerRankings.map((manager, index) => (
                <TouchableOpacity
                  key={manager.id}
                  style={styles.rankingCard}
                  onPress={() => handleRankingCardPress(manager.tiktok_handle)}
                >
                  <View style={styles.rankingBadge}>
                    <Text style={styles.rankingNumber}>#{index + 1}</Text>
                  </View>
                  {manager.avatar_url ? (
                    <Image source={{ uri: manager.avatar_url }} style={styles.rankingAvatar} />
                  ) : (
                    <View style={[styles.rankingAvatar, styles.avatarPlaceholder]}>
                      <IconSymbol
                        ios_icon_name="person.circle"
                        android_material_icon_name="person"
                        size={24}
                        color={colors.textSecondary}
                      />
                    </View>
                  )}
                  <View style={styles.rankingInfo}>
                    <Text style={styles.rankingName}>
                      {manager.first_name} {manager.last_name}
                    </Text>
                    {manager.tiktok_handle && (
                      <Text style={styles.rankingHandle}>@{manager.tiktok_handle}</Text>
                    )}
                  </View>
                  <View style={styles.rankingStats}>
                    <Text style={styles.rankingValue}>{manager.graduated_creators}</Text>
                    <Text style={styles.rankingLabel}>Graduated</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit WhatsApp Group Link</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter WhatsApp group link"
              placeholderTextColor={colors.textSecondary}
              value={editedWhatsAppLink}
              onChangeText={setEditedWhatsAppLink}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveEdit}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSave]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  notManagerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  notManagerTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  notManagerText: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  editButton: {
    marginRight: 16,
  },
  managerCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  managerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  managerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  avatarPlaceholder: {
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  managerInfo: {
    flex: 1,
  },
  managerName: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 4,
  },
  managerEmail: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  managerHandle: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.primary,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  whatsappButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.text,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    marginTop: 16,
  },
  creatorCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  creatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  creatorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  creatorInfo: {
    flex: 1,
  },
  creatorName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    marginBottom: 2,
  },
  creatorHandle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.primary,
  },
  creatorBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
  },
  statItemValue: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 2,
  },
  statItemLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.text,
  },
  progressValue: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  contactButtonText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 16,
  },
  rankingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  rankingBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankingNumber: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  rankingAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  rankingInfo: {
    flex: 1,
  },
  rankingName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    marginBottom: 2,
  },
  rankingHandle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
  },
  rankingStats: {
    alignItems: 'flex-end',
  },
  rankingValue: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
    marginBottom: 2,
  },
  rankingLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.text,
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.border,
  },
  modalButtonSave: {
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
  },
  modalButtonTextSave: {
    color: '#FFFFFF',
  },
});

export default ManagerPortalScreen;
