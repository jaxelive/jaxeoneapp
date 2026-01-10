
import { supabase } from '@/app/integrations/supabase/client';
import { colors } from '@/styles/commonStyles';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useCreatorData } from '@/hooks/useCreatorData';
import { IconSymbol } from '@/components/IconSymbol';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import * as Clipboard from 'expo-clipboard';
import { Stack, useRouter } from 'expo-router';
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
const GOLD_PAYOUT = 250;

export default function ManagerPortalScreen() {
  const router = useRouter();
  const { creator, creatorLoading } = useCreatorData();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [activeTab, setActiveTab] = useState<TabOption>('creators');
  const [statusFilter, setStatusFilter] = useState<CreatorStatusTab>('all');
  const [battleFilter, setBattleFilter] = useState<FilterBattle>('all');
  const [payoutFilter, setPayoutFilter] = useState<FilterPayout>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [managerIdentity, setManagerIdentity] = useState<ManagerIdentity | null>(null);
  const [assignedCreators, setAssignedCreators] = useState<AssignedCreator[]>([]);
  const [rankings, setRankings] = useState<ManagerRanking[]>([]);
  const [stats, setStats] = useState<ManagerStats>({
    totalCreators: 0,
    totalRookies: 0,
    totalSilver: 0,
    totalGold: 0,
    collectiveDiamonds: 0,
    creatorsBookedBattle: 0,
    creatorsMissingBattle: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedWhatsAppLink, setEditedWhatsAppLink] = useState('');

  useEffect(() => {
    if (creator && !creatorLoading) {
      fetchManagerPortalData();
    }
  }, [creator, creatorLoading]);

  useEffect(() => {
    if (activeTab === 'rankings' && rankings.length === 0) {
      fetchRankings();
    }
  }, [activeTab]);

  const fetchManagerPortalData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[Manager Portal] Fetching data for creator:', creator?.creator_handle);

      // Fetch manager identity
      const { data: managerData, error: managerError } = await supabase
        .from('manager_identities')
        .select('*')
        .eq('user_id', creator?.id)
        .single();

      if (managerError) {
        console.error('[Manager Portal] Error fetching manager identity:', managerError);
        throw managerError;
      }

      console.log('[Manager Portal] Manager identity:', managerData);
      setManagerIdentity(managerData);
      setEditedWhatsAppLink(managerData?.whatsapp_group_link || '');

      // Fetch assigned creators
      const { data: creatorsData, error: creatorsError } = await supabase
        .from('manager_creator_assignments')
        .select(`
          id,
          assigned_at,
          was_graduated_at_assignment,
          creator:creator_profiles!manager_creator_assignments_creator_id_fkey (
            id,
            first_name,
            last_name,
            creator_handle,
            email,
            region,
            graduation_status,
            total_diamonds,
            diamonds_monthly,
            phone,
            avatar_url,
            profile_picture_url,
            battle_booked,
            graduation_eligible,
            graduation_paid_this_month
          )
        `)
        .eq('manager_id', managerData.id);

      if (creatorsError) {
        console.error('[Manager Portal] Error fetching creators:', creatorsError);
        throw creatorsError;
      }

      console.log('[Manager Portal] Assigned creators:', creatorsData);

      const formattedCreators: AssignedCreator[] = creatorsData.map((assignment: any) => ({
        id: assignment.creator.id,
        first_name: assignment.creator.first_name,
        last_name: assignment.creator.last_name,
        creator_handle: assignment.creator.creator_handle,
        email: assignment.creator.email,
        region: assignment.creator.region,
        graduation_status: assignment.creator.graduation_status,
        total_diamonds: assignment.creator.total_diamonds || 0,
        diamonds_monthly: assignment.creator.diamonds_monthly || 0,
        phone: assignment.creator.phone,
        avatar_url: assignment.creator.avatar_url,
        profile_picture_url: assignment.creator.profile_picture_url,
        battle_booked: assignment.creator.battle_booked || false,
        graduation_eligible: assignment.creator.graduation_eligible || false,
        graduation_paid_this_month: assignment.creator.graduation_paid_this_month || false,
        was_graduated_at_assignment: assignment.was_graduated_at_assignment || false,
        assigned_at: assignment.assigned_at,
      }));

      setAssignedCreators(formattedCreators);

      // Calculate stats
      const totalCreators = formattedCreators.length;
      const totalRookies = formattedCreators.filter(c => 
        c.diamonds_monthly < SILVER_THRESHOLD
      ).length;
      const totalSilver = formattedCreators.filter(c => 
        c.diamonds_monthly >= SILVER_THRESHOLD && c.diamonds_monthly < GOLD_THRESHOLD
      ).length;
      const totalGold = formattedCreators.filter(c => 
        c.diamonds_monthly >= GOLD_THRESHOLD
      ).length;
      const collectiveDiamonds = formattedCreators.reduce((sum, c) => sum + c.diamonds_monthly, 0);
      const creatorsBookedBattle = formattedCreators.filter(c => c.battle_booked).length;
      const creatorsMissingBattle = formattedCreators.filter(c => !c.battle_booked).length;

      setStats({
        totalCreators,
        totalRookies,
        totalSilver,
        totalGold,
        collectiveDiamonds,
        creatorsBookedBattle,
        creatorsMissingBattle,
      });

    } catch (error) {
      console.error('[Manager Portal] Error:', error);
      Alert.alert('Error', 'Failed to load manager portal data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [creator]);

  const fetchRankings = useCallback(async () => {
    try {
      console.log('[Manager Portal] Fetching rankings...');

      const { data: rankingsData, error: rankingsError } = await supabase
        .rpc('get_manager_rankings');

      if (rankingsError) {
        console.error('[Manager Portal] Error fetching rankings:', rankingsError);
        throw rankingsError;
      }

      console.log('[Manager Portal] Rankings data:', rankingsData);
      setRankings(rankingsData || []);
    } catch (error) {
      console.error('[Manager Portal] Error fetching rankings:', error);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchManagerPortalData();
    if (activeTab === 'rankings') {
      fetchRankings();
    }
  }, [fetchManagerPortalData, fetchRankings, activeTab]);

  const filteredCreators = useMemo(() => {
    let filtered = [...assignedCreators];

    // Status filter
    if (statusFilter === 'rookie') {
      filtered = filtered.filter(c => c.diamonds_monthly < SILVER_THRESHOLD);
    } else if (statusFilter === 'silver') {
      filtered = filtered.filter(c => c.diamonds_monthly >= SILVER_THRESHOLD && c.diamonds_monthly < GOLD_THRESHOLD);
    } else if (statusFilter === 'gold') {
      filtered = filtered.filter(c => c.diamonds_monthly >= GOLD_THRESHOLD);
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
        c.first_name.toLowerCase().includes(query) ||
        c.last_name.toLowerCase().includes(query) ||
        c.creator_handle.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [assignedCreators, statusFilter, battleFilter, payoutFilter, searchQuery]);

  const handleTikTokPress = (handle: string) => {
    const url = `https://www.tiktok.com/@${handle}`;
    Linking.openURL(url);
  };

  const handleWhatsAppPress = (phone: string) => {
    const url = `https://wa.me/${phone.replace(/\D/g, '')}`;
    Linking.openURL(url);
  };

  const handleWhatsAppGroupPress = () => {
    if (managerIdentity?.whatsapp_group_link) {
      Linking.openURL(managerIdentity.whatsapp_group_link);
    }
  };

  const handleCreatorCardPress = (creatorId: string) => {
    router.push({
      pathname: '/(tabs)/creator-detail',
      params: { creatorId },
    });
  };

  const handleRankingCardPress = (tiktokHandle: string | null) => {
    if (tiktokHandle) {
      handleTikTokPress(tiktokHandle);
    }
  };

  const handleEditPress = () => {
    setIsEditMode(true);
  };

  const handleSaveEdit = async () => {
    try {
      if (!managerIdentity) return;

      const { error } = await supabase
        .from('manager_identities')
        .update({ whatsapp_group_link: editedWhatsAppLink })
        .eq('id', managerIdentity.id);

      if (error) throw error;

      setManagerIdentity({
        ...managerIdentity,
        whatsapp_group_link: editedWhatsAppLink,
      });
      setIsEditMode(false);
      Alert.alert('Success', 'WhatsApp group link updated');
    } catch (error) {
      console.error('[Manager Portal] Error updating WhatsApp link:', error);
      Alert.alert('Error', 'Failed to update WhatsApp group link');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getGraduationBadgeColor = (status: string | null) => {
    if (!status) return colors.textSecondary;
    if (status.toLowerCase().includes('gold')) return '#FFD700';
    if (status.toLowerCase().includes('silver')) return '#C0C0C0';
    return colors.primary;
  };

  const getGraduationLevel = (status: string | null): 'rookie' | 'silver' | 'gold' => {
    if (!status) return 'rookie';
    if (status.toLowerCase().includes('gold')) return 'gold';
    if (status.toLowerCase().includes('silver')) return 'silver';
    return 'rookie';
  };

  const getDiamondsToNextGraduation = (monthlyDiamonds: number, currentLevel: 'rookie' | 'silver' | 'gold') => {
    if (currentLevel === 'gold') return 0;
    if (currentLevel === 'silver') return GOLD_THRESHOLD - monthlyDiamonds;
    return SILVER_THRESHOLD - monthlyDiamonds;
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

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!managerIdentity) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Manager Portal',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.emptyContainer}>
          <IconSymbol ios_icon_name="person.crop.circle.badge.xmark" android_material_icon_name="person-off" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>You are not a manager</Text>
          <Text style={styles.emptySubtext}>Contact support to become a manager</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Manager Portal',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
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
            {managerIdentity.avatar_url ? (
              <Image
                source={{ uri: managerIdentity.avatar_url }}
                style={styles.managerAvatar}
              />
            ) : (
              <View style={[styles.managerAvatar, styles.avatarPlaceholder]}>
                <IconSymbol ios_icon_name="person.circle.fill" android_material_icon_name="account-circle" size={40} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.managerInfo}>
              <Text style={styles.managerName}>
                {managerIdentity.first_name} {managerIdentity.last_name}
              </Text>
              {managerIdentity.tiktok_handle && (
                <TouchableOpacity onPress={() => handleTikTokPress(managerIdentity.tiktok_handle!)}>
                  <Text style={styles.managerHandle}>@{managerIdentity.tiktok_handle}</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.managerEmail}>{managerIdentity.email}</Text>
            </View>
          </View>

          {/* WhatsApp Group Link */}
          {isEditMode ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.editInput}
                value={editedWhatsAppLink}
                onChangeText={setEditedWhatsAppLink}
                placeholder="WhatsApp Group Link"
                placeholderTextColor={colors.textSecondary}
              />
              <View style={styles.editButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditMode(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.whatsappContainer}>
              {managerIdentity.whatsapp_group_link ? (
                <TouchableOpacity style={styles.whatsappButton} onPress={handleWhatsAppGroupPress}>
                  <IconSymbol ios_icon_name="message.fill" android_material_icon_name="chat" size={20} color="#fff" />
                  <Text style={styles.whatsappButtonText}>WhatsApp Group</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.noWhatsappText}>No WhatsApp group link set</Text>
              )}
              <TouchableOpacity style={styles.editButton} onPress={handleEditPress}>
                <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
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
            <Text style={styles.statLabel}>Collective 💎</Text>
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
        <View style={styles.tabSelector}>
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

        {/* Creators Tab */}
        {activeTab === 'creators' && (
          <>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <TouchableOpacity
                  style={[styles.filterChip, statusFilter === 'all' && styles.activeFilterChip]}
                  onPress={() => setStatusFilter('all')}
                >
                  <Text style={[styles.filterChipText, statusFilter === 'all' && styles.activeFilterChipText]}>
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, statusFilter === 'rookie' && styles.activeFilterChip]}
                  onPress={() => setStatusFilter('rookie')}
                >
                  <Text style={[styles.filterChipText, statusFilter === 'rookie' && styles.activeFilterChipText]}>
                    Rookie
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, statusFilter === 'silver' && styles.activeFilterChip]}
                  onPress={() => setStatusFilter('silver')}
                >
                  <Text style={[styles.filterChipText, statusFilter === 'silver' && styles.activeFilterChipText]}>
                    Silver
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, statusFilter === 'gold' && styles.activeFilterChip]}
                  onPress={() => setStatusFilter('gold')}
                >
                  <Text style={[styles.filterChipText, statusFilter === 'gold' && styles.activeFilterChipText]}>
                    Gold
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, battleFilter === 'booked' && styles.activeFilterChip]}
                  onPress={() => setBattleFilter(battleFilter === 'booked' ? 'all' : 'booked')}
                >
                  <Text style={[styles.filterChipText, battleFilter === 'booked' && styles.activeFilterChipText]}>
                    Battle Booked
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, battleFilter === 'missing' && styles.activeFilterChip]}
                  onPress={() => setBattleFilter(battleFilter === 'missing' ? 'all' : 'missing')}
                >
                  <Text style={[styles.filterChipText, battleFilter === 'missing' && styles.activeFilterChipText]}>
                    No Battle
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Creators List */}
            <View style={styles.creatorsContainer}>
              {filteredCreators.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <IconSymbol ios_icon_name="person.crop.circle.badge.questionmark" android_material_icon_name="person-search" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>No creators found</Text>
                </View>
              ) : (
                filteredCreators.map((creator, index) => {
                  const currentLevel = getGraduationLevel(creator.graduation_status);
                  const nextTarget = getNextGraduationTarget(currentLevel);
                  const remaining = getDiamondsToNextGraduation(creator.diamonds_monthly, currentLevel);
                  const progress = getProgressPercentage(creator.diamonds_monthly, currentLevel);

                  return (
                    <TouchableOpacity
                      key={creator.id}
                      style={styles.creatorCard}
                      onPress={() => handleCreatorCardPress(creator.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.creatorHeader}>
                        {creator.avatar_url || creator.profile_picture_url ? (
                          <Image
                            source={{ uri: creator.avatar_url || creator.profile_picture_url || '' }}
                            style={styles.creatorAvatar}
                          />
                        ) : (
                          <View style={[styles.creatorAvatar, styles.avatarPlaceholder]}>
                            <IconSymbol ios_icon_name="person.circle.fill" android_material_icon_name="account-circle" size={24} color={colors.textSecondary} />
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
                        <View style={styles.creatorActions}>
                          {creator.phone && (
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => handleWhatsAppPress(creator.phone!)}
                            >
                              <IconSymbol ios_icon_name="message.fill" android_material_icon_name="chat" size={20} color={colors.primary} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      <View style={styles.creatorStats}>
                        <View style={styles.statItem}>
                          <Text style={styles.statItemValue}>{creator.diamonds_monthly.toLocaleString()}</Text>
                          <Text style={styles.statItemLabel}>Monthly 💎</Text>
                        </View>
                        <View style={styles.statItem}>
                          <View style={[styles.badge, { backgroundColor: getGraduationBadgeColor(creator.graduation_status) }]}>
                            <Text style={styles.badgeText}>{currentLevel.toUpperCase()}</Text>
                          </View>
                        </View>
                        <View style={styles.statItem}>
                          {creator.battle_booked ? (
                            <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check-circle" size={24} color="#4CAF50" />
                          ) : (
                            <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={24} color="#F44336" />
                          )}
                          <Text style={styles.statItemLabel}>Battle</Text>
                        </View>
                      </View>

                      {currentLevel !== 'gold' && (
                        <View style={styles.progressContainer}>
                          <View style={styles.progressHeader}>
                            <Text style={styles.progressLabel}>Next: {nextTarget}</Text>
                            <Text style={styles.progressValue}>{remaining.toLocaleString()} 💎 to go</Text>
                          </View>
                          <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${progress}%` }]} />
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </>
        )}

        {/* Rankings Tab */}
        {activeTab === 'rankings' && (
          <View style={styles.rankingsContainer}>
            <Text style={styles.rankingsTitle}>Top 10 Managers</Text>
            <Text style={styles.rankingsSubtitle}>Ranked by graduated creators</Text>

            {rankings.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.emptyText}>Loading rankings...</Text>
              </View>
            ) : (
              rankings.slice(0, 10).map((manager, index) => (
                <TouchableOpacity
                  key={manager.id}
                  style={styles.rankingCard}
                  onPress={() => handleRankingCardPress(manager.tiktok_handle)}
                  activeOpacity={0.7}
                >
                  <View style={styles.rankingRank}>
                    <Text style={styles.rankingRankText}>#{index + 1}</Text>
                  </View>

                  {/* Use avatar_url from database, with proper fallback */}
                  {manager.avatar_url ? (
                    <Image
                      source={{ uri: manager.avatar_url }}
                      style={styles.rankingAvatar}
                      onError={(error) => {
                        console.log('[Manager Portal] Image load error for manager:', manager.first_name, error.nativeEvent.error);
                      }}
                    />
                  ) : (
                    <View style={[styles.rankingAvatar, styles.avatarPlaceholder]}>
                      <IconSymbol ios_icon_name="person.circle.fill" android_material_icon_name="account-circle" size={24} color={colors.textSecondary} />
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
                    <Text style={styles.rankingGraduated}>{manager.graduated_creators}</Text>
                    <Text style={styles.rankingLabel}>Graduated</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    marginTop: 8,
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
  managerHandle: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.primary,
    marginBottom: 4,
  },
  managerEmail: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
  },
  whatsappContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  whatsappButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 12,
    padding: 12,
    marginRight: 8,
  },
  whatsappButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#fff',
    marginLeft: 8,
  },
  noWhatsappText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  editButton: {
    padding: 12,
  },
  editContainer: {
    marginTop: 8,
  },
  editInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.text,
    marginBottom: 12,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#fff',
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
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tabSelector: {
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
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.text,
    marginLeft: 8,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textSecondary,
  },
  activeFilterChipText: {
    color: '#fff',
  },
  creatorsContainer: {
    gap: 12,
  },
  creatorCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
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
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.primary,
  },
  creatorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  creatorStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statItemValue: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 4,
  },
  statItemLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
  },
  progressContainer: {
    marginTop: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
  },
  progressValue: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  rankingsContainer: {
    gap: 12,
  },
  rankingsTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 4,
  },
  rankingsSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    marginBottom: 20,
  },
  rankingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  rankingRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankingRankText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
  },
  rankingAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.primary,
  },
  rankingStats: {
    alignItems: 'center',
  },
  rankingGraduated: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 2,
  },
  rankingLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
  },
});
