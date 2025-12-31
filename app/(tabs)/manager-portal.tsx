
import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { Stack, useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { supabase } from '@/app/integrations/supabase/client';
import { useCreatorData } from '@/hooks/useCreatorData';
import * as Clipboard from 'expo-clipboard';

const CREATOR_HANDLE = 'avelezsanti';

// Graduation thresholds
const SILVER_THRESHOLD = 200000;
const GOLD_THRESHOLD = 500000;

// Manager payout amounts (in dollars)
const SILVER_PAYOUT = 100;
const GOLD_PAYOUT = 250;

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

type CreatorStatusTab = 'rookie' | 'silver' | 'gold';
type FilterBattle = 'all' | 'booked' | 'missing';
type FilterPayout = 'all' | 'eligible' | 'ineligible' | 'paid';
type TabOption = 'overview' | 'rankings';

export default function ManagerPortalScreen() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const router = useRouter();
  const { creator, loading: creatorLoading } = useCreatorData(CREATOR_HANDLE);
  const [managerIdentity, setManagerIdentity] = useState<ManagerIdentity | null>(null);
  const [assignedCreators, setAssignedCreators] = useState<AssignedCreator[]>([]);
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
  const [error, setError] = useState<string | null>(null);
  
  // Filtering and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatusTab, setActiveStatusTab] = useState<CreatorStatusTab>('rookie');
  const [filterBattle, setFilterBattle] = useState<FilterBattle>('all');
  const [filterPayout, setFilterPayout] = useState<FilterPayout>('all');
  
  // Animation for hero diamonds
  const [diamondsAnim] = useState(new Animated.Value(0));
  const [displayDiamonds, setDisplayDiamonds] = useState(0);

  // WhatsApp Group button state
  const [whatsappGroupCopied, setWhatsappGroupCopied] = useState(false);

  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editLanguage, setEditLanguage] = useState<'english' | 'spanish' | 'bilingual'>('english');
  const [editWhatsappGroup, setEditWhatsappGroup] = useState('');
  const [saving, setSaving] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<TabOption>('overview');

  // Rankings State
  const [rankings, setRankings] = useState<ManagerRanking[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState(false);

  const fetchManagerPortalData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[ManagerPortal] 🎯 Fetching manager portal data for logged-in user');

      if (!creator) {
        console.log('[ManagerPortal] ❌ No creator data available');
        setError('User data not available');
        setLoading(false);
        return;
      }

      if (creator.user_role !== 'manager') {
        console.log('[ManagerPortal] ❌ User is not a manager. Role:', creator.user_role);
        setError('You do not have manager access. This portal is only for managers.');
        setLoading(false);
        return;
      }

      console.log('[ManagerPortal] ✅ User is a manager. Fetching manager identity...');

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, avatar_url, role, creator_id')
        .eq('creator_id', creator.id)
        .eq('role', 'manager')
        .single();

      if (usersError || !usersData) {
        console.error('[ManagerPortal] ❌ Error fetching user data:', usersError);
        setError('Failed to fetch manager identity');
        setLoading(false);
        return;
      }

      console.log('[ManagerPortal] ✅ User record found:', usersData.id);

      const { data: managerData, error: managerError } = await supabase
        .from('managers')
        .select('*')
        .eq('user_id', usersData.id)
        .single();

      if (managerError || !managerData) {
        console.error('[ManagerPortal] ❌ Error fetching manager record:', managerError);
        setError('Failed to fetch manager details');
        setLoading(false);
        return;
      }

      console.log('[ManagerPortal] ✅ Manager record found:', managerData.id);

      const regions: string[] = [];
      if (managerData.manages_us) regions.push('USA & Canada');
      if (managerData.manages_latam) regions.push('Latin America');

      const languages: string[] = [];
      if (managerData.language_preference === 'english') languages.push('English');
      else if (managerData.language_preference === 'spanish') languages.push('Español');
      else if (managerData.language_preference === 'bilingual') languages.push('English', 'Español');

      const identity: ManagerIdentity = {
        id: managerData.id,
        user_id: usersData.id,
        first_name: usersData.first_name,
        last_name: usersData.last_name,
        email: usersData.email,
        avatar_url: usersData.avatar_url,
        whatsapp: managerData.whatsapp,
        tiktok_handle: managerData.tiktok_handle,
        promoted_to_manager_at: managerData.promoted_to_manager_at,
        manager_avatar_url: managerData.avatar_url,
        regions_managed: regions,
        languages: languages,
        whatsapp_group_link: managerData.whatsapp_group_link,
        language_preference: managerData.language_preference,
      };

      setManagerIdentity(identity);

      console.log('[ManagerPortal] 📊 Fetching assigned creators for manager:', managerData.id);

      const { data: creatorsData, error: creatorsError } = await supabase
        .from('creators')
        .select('id, first_name, last_name, creator_handle, email, region, graduation_status, total_diamonds, diamonds_monthly, phone, avatar_url, profile_picture_url, battle_booked, graduation_eligible, graduation_paid_this_month, was_graduated_at_assignment, assigned_at')
        .eq('assigned_manager_id', managerData.id)
        .eq('is_active', true)
        .order('diamonds_monthly', { ascending: false });

      if (creatorsError) {
        console.error('[ManagerPortal] ❌ Error fetching assigned creators:', creatorsError);
      } else {
        console.log('[ManagerPortal] ✅ Assigned creators loaded:', creatorsData?.length || 0);
        setAssignedCreators(creatorsData || []);

        // Calculate stats
        const totalCreators = creatorsData?.length || 0;
        const totalRookies = creatorsData?.filter(c => 
          !c.graduation_status || 
          c.graduation_status.toLowerCase().includes('rookie') ||
          c.graduation_status.toLowerCase().includes('new')
        ).length || 0;
        const totalSilver = creatorsData?.filter(c => 
          c.graduation_status && 
          c.graduation_status.toLowerCase().includes('silver')
        ).length || 0;
        const totalGold = creatorsData?.filter(c => 
          c.graduation_status && 
          c.graduation_status.toLowerCase().includes('gold')
        ).length || 0;
        const collectiveDiamonds = creatorsData?.reduce((sum, c) => sum + (c.diamonds_monthly || 0), 0) || 0;
        const creatorsBookedBattle = creatorsData?.filter(c => c.battle_booked === true).length || 0;
        const creatorsMissingBattle = creatorsData?.filter(c => c.battle_booked === false).length || 0;

        setStats({
          totalCreators,
          totalRookies,
          totalSilver,
          totalGold,
          collectiveDiamonds,
          creatorsBookedBattle,
          creatorsMissingBattle,
        });

        // Animate hero diamonds with listener
        diamondsAnim.setValue(0);
        const listener = diamondsAnim.addListener(({ value }) => {
          setDisplayDiamonds(Math.floor(value));
        });

        Animated.timing(diamondsAnim, {
          toValue: collectiveDiamonds,
          duration: 1100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start(() => {
          diamondsAnim.removeListener(listener);
          setDisplayDiamonds(collectiveDiamonds);
        });

        console.log('[ManagerPortal] ✅ Stats calculated:', {
          totalCreators,
          totalRookies,
          totalSilver,
          totalGold,
          collectiveDiamonds,
          creatorsBookedBattle,
          creatorsMissingBattle,
        });
      }
    } catch (err: any) {
      console.error('[ManagerPortal] ❌ Unexpected error:', err);
      setError(err?.message || 'Failed to fetch manager portal data');
    } finally {
      setLoading(false);
    }
  }, [creator, diamondsAnim]);

  const fetchRankings = useCallback(async () => {
    try {
      setRankingsLoading(true);
      console.log('[ManagerPortal] 📊 Fetching manager rankings...');

      const { data, error } = await supabase.rpc('get_manager_rankings');

      if (error) {
        console.error('[ManagerPortal] ❌ Error fetching rankings:', error);
        // Fallback to manual query
        const { data: managersData, error: managersError } = await supabase
          .from('managers')
          .select(`
            id,
            user_id,
            tiktok_handle,
            avatar_url,
            users!managers_user_id_fkey (
              first_name,
              last_name,
              avatar_url
            )
          `);

        if (managersError) {
          console.error('[ManagerPortal] ❌ Fallback query failed:', managersError);
          return;
        }

        // Manually count graduated creators for each manager
        const rankingsWithCounts = await Promise.all(
          (managersData || []).map(async (manager: any) => {
            const { count } = await supabase
              .from('creators')
              .select('id', { count: 'exact', head: true })
              .eq('assigned_manager_id', manager.id)
              .eq('is_active', true)
              .or('graduation_status.ilike.%silver%,graduation_status.ilike.%gold%');

            return {
              id: manager.id,
              first_name: manager.users?.first_name || '',
              last_name: manager.users?.last_name || '',
              graduated_creators: count || 0,
              tiktok_handle: manager.tiktok_handle,
              avatar_url: manager.avatar_url || manager.users?.avatar_url,
            };
          })
        );

        const sortedRankings = rankingsWithCounts
          .sort((a, b) => b.graduated_creators - a.graduated_creators)
          .slice(0, 10);

        setRankings(sortedRankings);
      } else {
        setRankings(data || []);
      }

      console.log('[ManagerPortal] ✅ Rankings loaded');
    } catch (err: any) {
      console.error('[ManagerPortal] ❌ Error fetching rankings:', err);
    } finally {
      setRankingsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (creator && !creatorLoading) {
      console.log('[ManagerPortal] 🚀 Creator loaded, fetching manager portal data');
      fetchManagerPortalData();
    }
  }, [creator, creatorLoading, fetchManagerPortalData]);

  useEffect(() => {
    if (activeTab === 'rankings' && rankings.length === 0) {
      fetchRankings();
    }
  }, [activeTab, rankings.length, fetchRankings]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchManagerPortalData();
    if (activeTab === 'rankings') {
      await fetchRankings();
    }
    setRefreshing(false);
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

  const handleWhatsAppGroupPress = async () => {
    if (!managerIdentity?.whatsapp_group_link) {
      Alert.alert('Info', 'No group link set.');
      return;
    }
    
    try {
      await Clipboard.setStringAsync(managerIdentity.whatsapp_group_link);
      setWhatsappGroupCopied(true);
      setTimeout(() => {
        setWhatsappGroupCopied(false);
      }, 2000);
    } catch (error) {
      console.error('[ManagerPortal] Error copying to clipboard:', error);
      Alert.alert('Error', 'Could not copy link to clipboard');
    }
  };

  const handleCreatorCardPress = (creatorId: string) => {
    console.log('[ManagerPortal] Navigating to creator detail:', creatorId);
    router.push({
      pathname: '/(tabs)/creator-detail',
      params: { creatorId },
    });
  };

  const handleRankingCardPress = (tiktokHandle: string | null) => {
    if (tiktokHandle) {
      handleTikTokPress(tiktokHandle);
    } else {
      Alert.alert('Info', 'TikTok profile not available for this manager');
    }
  };

  const handleEditPress = () => {
    if (!managerIdentity) return;
    setEditWhatsapp(managerIdentity.whatsapp || '');
    setEditLanguage((managerIdentity.language_preference as any) || 'english');
    setEditWhatsappGroup(managerIdentity.whatsapp_group_link || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!managerIdentity) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('managers')
        .update({
          whatsapp: editWhatsapp,
          language_preference: editLanguage,
          whatsapp_group_link: editWhatsappGroup,
        })
        .eq('id', managerIdentity.id);

      if (error) {
        console.error('[ManagerPortal] Error updating manager:', error);
        Alert.alert('Error', 'Failed to save changes. Please try again.');
        return;
      }

      // Update local state
      const languages: string[] = [];
      if (editLanguage === 'english') languages.push('English');
      else if (editLanguage === 'spanish') languages.push('Español');
      else if (editLanguage === 'bilingual') languages.push('English', 'Español');

      setManagerIdentity({
        ...managerIdentity,
        whatsapp: editWhatsapp,
        language_preference: editLanguage,
        languages: languages,
        whatsapp_group_link: editWhatsappGroup,
      });

      setEditModalVisible(false);
      Alert.alert('Success', 'Your profile has been updated successfully!');
    } catch (err: any) {
      console.error('[ManagerPortal] Error saving:', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
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
    if (!status) return colors.success;
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('gold')) return '#FFD700';
    if (lowerStatus.includes('silver')) return '#C0C0C0';
    return colors.success;
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
    if (currentLevel === 'gold') return 'Gold';
    if (currentLevel === 'silver') return 'Gold';
    return 'Silver';
  };

  const getProgressPercentage = (monthlyDiamonds: number, currentLevel: 'rookie' | 'silver' | 'gold') => {
    if (currentLevel === 'gold') return 100;
    const target = currentLevel === 'silver' ? GOLD_THRESHOLD : SILVER_THRESHOLD;
    return Math.min(100, (monthlyDiamonds / target) * 100);
  };

  // Calculate Potential Earnings This Month
  const potentialEarnings = useMemo(() => {
    let totalBonus = 0;
    let eligibleCreators = 0;

    assignedCreators.forEach(creator => {
      // Skip if already graduated at assignment or already paid this month
      if (creator.was_graduated_at_assignment || creator.graduation_paid_this_month) {
        return;
      }

      const currentLevel = getGraduationLevel(creator.graduation_status);
      const monthlyDiamonds = creator.diamonds_monthly || 0;

      // Check if creator can graduate to Silver
      if (currentLevel === 'rookie' && monthlyDiamonds >= SILVER_THRESHOLD) {
        totalBonus += SILVER_PAYOUT;
        eligibleCreators++;
      }
      // Check if creator can graduate to Gold
      else if (currentLevel === 'silver' && monthlyDiamonds >= GOLD_THRESHOLD) {
        totalBonus += GOLD_PAYOUT;
        eligibleCreators++;
      }
    });

    // Calculate progress (how close are we to max possible earnings)
    const maxPossibleBonus = assignedCreators.filter(c => 
      !c.was_graduated_at_assignment && !c.graduation_paid_this_month
    ).length * GOLD_PAYOUT;

    const progressPercentage = maxPossibleBonus > 0 ? (totalBonus / maxPossibleBonus) * 100 : 0;

    return {
      totalBonus,
      eligibleCreators,
      progressPercentage,
    };
  }, [assignedCreators]);

  // Filter and sort creators by active status tab
  const filteredAndSortedCreators = useMemo(() => {
    let filtered = [...assignedCreators];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.creator_handle.toLowerCase().includes(query) ||
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(query)
      );
    }

    // Status filter - filter by active tab
    filtered = filtered.filter(c => {
      const level = getGraduationLevel(c.graduation_status);
      return level === activeStatusTab;
    });

    // Battle filter
    if (filterBattle !== 'all') {
      filtered = filtered.filter(c => {
        if (filterBattle === 'booked') return c.battle_booked === true;
        if (filterBattle === 'missing') return c.battle_booked === false;
        return true;
      });
    }

    // Payout filter
    if (filterPayout !== 'all') {
      filtered = filtered.filter(c => {
        if (filterPayout === 'eligible') return c.graduation_eligible && !c.graduation_paid_this_month && !c.was_graduated_at_assignment;
        if (filterPayout === 'ineligible') return c.was_graduated_at_assignment;
        if (filterPayout === 'paid') return c.graduation_paid_this_month;
        return true;
      });
    }

    // Sort by diamonds (descending) - highest first
    filtered.sort((a, b) => b.diamonds_monthly - a.diamonds_monthly);

    return filtered;
  }, [assignedCreators, searchQuery, activeStatusTab, filterBattle, filterPayout]);

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

  if (error || !managerIdentity) {
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
          <Text style={styles.errorText}>{error || 'Manager identity not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchManagerPortalData}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const profileImageUrl = managerIdentity.manager_avatar_url || managerIdentity.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop';

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

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rankings' && styles.tabActive]}
          onPress={() => setActiveTab('rankings')}
        >
          <Text style={[styles.tabText, activeTab === 'rankings' && styles.tabTextActive]}>
            Rankings
          </Text>
        </TouchableOpacity>
      </View>

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
        {activeTab === 'overview' ? (
          <>
            {/* MANAGER IDENTITY CARD */}
            <View style={styles.managerIdentityCard}>
              {/* Manager Header with Badge in Top-Right */}
              <View style={styles.managerHeaderRow}>
                <View style={styles.managerHeaderLeft}>
                  <Image
                    source={{ uri: profileImageUrl }}
                    style={styles.managerAvatar}
                  />
                  <View style={styles.managerInfo}>
                    <Text style={styles.managerName}>
                      {managerIdentity.first_name} {managerIdentity.last_name}
                    </Text>
                  </View>
                </View>
                
                {/* Manager Badge - Top Right Corner */}
                <View style={styles.managerBadgeTopRight}>
                  <IconSymbol
                    ios_icon_name="star.fill"
                    android_material_icon_name="star"
                    size={14}
                    color="#FFFFFF"
                  />
                  <Text style={styles.managerBadgeText}>Manager</Text>
                </View>
              </View>

              {/* Manager Details */}
              <View style={styles.managerDetails}>
                {/* Regions */}
                {managerIdentity.regions_managed.length > 0 && (
                  <View style={styles.managerDetailRow}>
                    <IconSymbol
                      ios_icon_name="globe"
                      android_material_icon_name="public"
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.managerDetailText}>
                      {managerIdentity.regions_managed.join(' • ')}
                    </Text>
                  </View>
                )}

                {/* Languages */}
                {managerIdentity.languages.length > 0 && (
                  <View style={styles.managerDetailRow}>
                    <IconSymbol
                      ios_icon_name="text.bubble.fill"
                      android_material_icon_name="language"
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.managerDetailText}>
                      {managerIdentity.languages.join(' • ')}
                    </Text>
                  </View>
                )}

                {/* Email - Text Line Item (NOT a button) */}
                <View style={styles.managerDetailRow}>
                  <IconSymbol
                    ios_icon_name="envelope.fill"
                    android_material_icon_name="email"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={styles.managerDetailText}>
                    {managerIdentity.email}
                  </Text>
                </View>

                {/* Manager Since */}
                {managerIdentity.promoted_to_manager_at && (
                  <View style={styles.managerDetailRow}>
                    <IconSymbol
                      ios_icon_name="calendar"
                      android_material_icon_name="event"
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.managerDetailText}>
                      Manager since {formatDate(managerIdentity.promoted_to_manager_at)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Contact Buttons - Only WhatsApp and TikTok */}
              <View style={styles.managerActions}>
                {managerIdentity.whatsapp && (
                  <TouchableOpacity 
                    style={styles.managerActionButton}
                    onPress={() => handleWhatsAppPress(managerIdentity.whatsapp!)}
                  >
                    <IconSymbol
                      ios_icon_name="message.fill"
                      android_material_icon_name="chat"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.managerActionText}>WhatsApp</Text>
                  </TouchableOpacity>
                )}

                {managerIdentity.tiktok_handle && (
                  <TouchableOpacity 
                    style={styles.managerActionButton}
                    onPress={() => handleTikTokPress(managerIdentity.tiktok_handle!)}
                  >
                    <IconSymbol
                      ios_icon_name="music.note"
                      android_material_icon_name="music-note"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.managerActionText}>TikTok</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* My WhatsApp Group Button */}
              {managerIdentity.whatsapp_group_link ? (
                <TouchableOpacity 
                  style={styles.whatsappGroupButton}
                  onPress={handleWhatsAppGroupPress}
                >
                  <IconSymbol
                    ios_icon_name="person.3.fill"
                    android_material_icon_name="group"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.whatsappGroupButtonText}>
                    {whatsappGroupCopied ? 'Copied!' : 'My WhatsApp Group'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.whatsappGroupButtonDisabled}>
                  <IconSymbol
                    ios_icon_name="person.3.fill"
                    android_material_icon_name="group"
                    size={20}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.whatsappGroupButtonDisabledText}>
                    No group link set.
                  </Text>
                </View>
              )}

              {/* Edit Button */}
              <TouchableOpacity 
                style={styles.editButton}
                onPress={handleEditPress}
              >
                <IconSymbol
                  ios_icon_name="pencil"
                  android_material_icon_name="edit"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>

              {/* POTENTIAL EARNINGS THIS MONTH - GREEN THEME */}
              <View style={styles.potentialEarningsSection}>
                <Text style={styles.potentialEarningsTitle}>Potential Earnings This Month</Text>
                <Text style={styles.potentialEarningsSubtitle}>(Not yet earned)</Text>
                
                {/* Progress Bar - GREEN */}
                <View style={styles.earningsProgressContainer}>
                  <View style={styles.earningsProgressBg}>
                    <View 
                      style={[
                        styles.earningsProgressFill,
                        { width: `${Math.min(100, potentialEarnings.progressPercentage)}%` }
                      ]}
                    />
                  </View>
                </View>

                {/* Projected Amount - GREEN */}
                <View style={styles.projectedAmountContainer}>
                  <Text style={styles.projectedAmountLabel}>Projected Earnings</Text>
                  <Text style={styles.projectedAmount}>
                    ${potentialEarnings.totalBonus}
                  </Text>
                  <Text style={styles.projectedCreatorCount}>
                    ({potentialEarnings.eligibleCreators} {potentialEarnings.eligibleCreators === 1 ? 'creator' : 'creators'})
                  </Text>
                </View>
              </View>
            </View>

            {/* PERFORMANCE SUMMARY SECTION */}
            <View style={styles.performanceCard}>
              <Text style={styles.sectionTitle}>Performance Summary</Text>
              
              {/* HERO: Collective Diamonds */}
              <View style={styles.heroMetric}>
                <View style={styles.heroIconContainer}>
                  <IconSymbol
                    ios_icon_name="diamond.fill"
                    android_material_icon_name="diamond"
                    size={32}
                    color="#06B6D4"
                  />
                </View>
                <Text style={styles.heroValue}>
                  {displayDiamonds.toLocaleString()}
                </Text>
                <Text style={styles.heroLabel}>This Month (Sum of Active Creators)</Text>
              </View>

              {/* Graduation Breakdown */}
              <View style={styles.graduationBreakdown}>
                <View style={styles.miniCard}>
                  <View style={[styles.miniCardIcon, { backgroundColor: colors.success }]}>
                    <IconSymbol
                      ios_icon_name="star.fill"
                      android_material_icon_name="star"
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>
                  <Text style={styles.miniCardValue}>{stats.totalRookies}</Text>
                  <Text style={styles.miniCardLabel}>Rookies</Text>
                </View>

                <View style={styles.miniCard}>
                  <View style={[styles.miniCardIcon, { backgroundColor: '#C0C0C0' }]}>
                    <IconSymbol
                      ios_icon_name="trophy.fill"
                      android_material_icon_name="emoji-events"
                      size={20}
                      color="#000000"
                    />
                  </View>
                  <Text style={styles.miniCardValue}>{stats.totalSilver}</Text>
                  <Text style={styles.miniCardLabel}>Silver Graduates</Text>
                </View>

                <View style={styles.miniCard}>
                  <View style={[styles.miniCardIcon, { backgroundColor: '#FFD700' }]}>
                    <IconSymbol
                      ios_icon_name="trophy.fill"
                      android_material_icon_name="emoji-events"
                      size={20}
                      color="#000000"
                    />
                  </View>
                  <Text style={styles.miniCardValue}>{stats.totalGold}</Text>
                  <Text style={styles.miniCardLabel}>Gold Graduates</Text>
                </View>
              </View>

              {/* Battles Tracking */}
              <View style={styles.battlesBlock}>
                <Text style={styles.battlesTitle}>Battles Tracking</Text>
                <View style={styles.battlesRow}>
                  <TouchableOpacity 
                    style={styles.battleStat}
                    onPress={() => setFilterBattle('booked')}
                  >
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check-circle"
                      size={24}
                      color={colors.success}
                    />
                    <Text style={styles.battleStatValue}>{stats.creatorsBookedBattle}</Text>
                    <Text style={styles.battleStatLabel}>Booked a Battle</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.battleStat}
                    onPress={() => setFilterBattle('missing')}
                  >
                    <IconSymbol
                      ios_icon_name="exclamationmark.circle.fill"
                      android_material_icon_name="error"
                      size={24}
                      color={colors.warning}
                    />
                    <Text style={styles.battleStatValue}>{stats.creatorsMissingBattle}</Text>
                    <Text style={styles.battleStatLabel}>Missing a Battle</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.battlesHelper}>
                  Tap counts to filter the creator list
                </Text>
              </View>
            </View>

            {/* MY CREATORS SECTION */}
            <View style={styles.creatorsCard}>
              <Text style={styles.sectionTitle}>
                My Creators ({filteredAndSortedCreators.length})
              </Text>

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
                  placeholder="Search by handle or name..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <IconSymbol
                      ios_icon_name="xmark.circle.fill"
                      android_material_icon_name="cancel"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* STATUS TABS - Replace Sorting */}
              <View style={styles.statusTabsContainer}>
                <TouchableOpacity
                  style={[styles.statusTab, activeStatusTab === 'rookie' && styles.statusTabActive]}
                  onPress={() => setActiveStatusTab('rookie')}
                >
                  <Text style={[styles.statusTabText, activeStatusTab === 'rookie' && styles.statusTabTextActive]}>
                    Rookies
                  </Text>
                  <View style={[styles.statusTabBadge, activeStatusTab === 'rookie' && styles.statusTabBadgeActive]}>
                    <Text style={[styles.statusTabBadgeText, activeStatusTab === 'rookie' && styles.statusTabBadgeTextActive]}>
                      {stats.totalRookies}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusTab, activeStatusTab === 'silver' && styles.statusTabActive]}
                  onPress={() => setActiveStatusTab('silver')}
                >
                  <Text style={[styles.statusTabText, activeStatusTab === 'silver' && styles.statusTabTextActive]}>
                    Silvers
                  </Text>
                  <View style={[styles.statusTabBadge, activeStatusTab === 'silver' && styles.statusTabBadgeActive]}>
                    <Text style={[styles.statusTabBadgeText, activeStatusTab === 'silver' && styles.statusTabBadgeTextActive]}>
                      {stats.totalSilver}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusTab, activeStatusTab === 'gold' && styles.statusTabActive]}
                  onPress={() => setActiveStatusTab('gold')}
                >
                  <Text style={[styles.statusTabText, activeStatusTab === 'gold' && styles.statusTabTextActive]}>
                    Graduated (Gold)
                  </Text>
                  <View style={[styles.statusTabBadge, activeStatusTab === 'gold' && styles.statusTabBadgeActive]}>
                    <Text style={[styles.statusTabBadgeText, activeStatusTab === 'gold' && styles.statusTabBadgeTextActive]}>
                      {stats.totalGold}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Additional Filters */}
              <View style={styles.filtersContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
                  {/* Battle Filter */}
                  <View style={styles.filterGroup}>
                    <Text style={styles.filterGroupLabel}>Battle:</Text>
                    <TouchableOpacity 
                      style={[styles.filterChip, filterBattle === 'all' && styles.filterChipActive]}
                      onPress={() => setFilterBattle('all')}
                    >
                      <Text style={[styles.filterChipText, filterBattle === 'all' && styles.filterChipTextActive]}>
                        All
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.filterChip, filterBattle === 'booked' && styles.filterChipActive]}
                      onPress={() => setFilterBattle('booked')}
                    >
                      <Text style={[styles.filterChipText, filterBattle === 'booked' && styles.filterChipTextActive]}>
                        Booked
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.filterChip, filterBattle === 'missing' && styles.filterChipActive]}
                      onPress={() => setFilterBattle('missing')}
                    >
                      <Text style={[styles.filterChipText, filterBattle === 'missing' && styles.filterChipTextActive]}>
                        Missing
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Payout Filter */}
                  <View style={styles.filterGroup}>
                    <Text style={styles.filterGroupLabel}>Payout:</Text>
                    <TouchableOpacity 
                      style={[styles.filterChip, filterPayout === 'all' && styles.filterChipActive]}
                      onPress={() => setFilterPayout('all')}
                    >
                      <Text style={[styles.filterChipText, filterPayout === 'all' && styles.filterChipTextActive]}>
                        All
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.filterChip, filterPayout === 'eligible' && styles.filterChipActive]}
                      onPress={() => setFilterPayout('eligible')}
                    >
                      <Text style={[styles.filterChipText, filterPayout === 'eligible' && styles.filterChipTextActive]}>
                        Eligible
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.filterChip, filterPayout === 'ineligible' && styles.filterChipActive]}
                      onPress={() => setFilterPayout('ineligible')}
                    >
                      <Text style={[styles.filterChipText, filterPayout === 'ineligible' && styles.filterChipTextActive]}>
                        Ineligible
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.filterChip, filterPayout === 'paid' && styles.filterChipActive]}
                      onPress={() => setFilterPayout('paid')}
                    >
                      <Text style={[styles.filterChipText, filterPayout === 'paid' && styles.filterChipTextActive]}>
                        Paid
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>

              {/* Creators List - COMPACT CARDS ONLY */}
              {filteredAndSortedCreators.length === 0 ? (
                <View style={styles.emptyState}>
                  <IconSymbol
                    ios_icon_name="person.crop.circle.badge.questionmark"
                    android_material_icon_name="person-add"
                    size={48}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.emptyStateText}>
                    {searchQuery || filterBattle !== 'all' || filterPayout !== 'all'
                      ? 'No creators match your filters'
                      : `No ${activeStatusTab} creators yet`}
                  </Text>
                </View>
              ) : (
                <View style={styles.creatorsList}>
                  {filteredAndSortedCreators.map((assignedCreator) => {
                    const currentLevel = getGraduationLevel(assignedCreator.graduation_status);
                    const diamondsToNext = getDiamondsToNextGraduation(assignedCreator.diamonds_monthly, currentLevel);
                    const nextTarget = getNextGraduationTarget(currentLevel);
                    const progressPercentage = getProgressPercentage(assignedCreator.diamonds_monthly, currentLevel);

                    return (
                      <TouchableOpacity 
                        key={assignedCreator.id}
                        style={styles.creatorCard}
                        onPress={() => handleCreatorCardPress(assignedCreator.id)}
                        activeOpacity={0.7}
                      >
                        {/* Avatar */}
                        <View style={styles.creatorAvatarContainer}>
                          {assignedCreator.avatar_url || assignedCreator.profile_picture_url ? (
                            <Image
                              source={{ uri: assignedCreator.avatar_url || assignedCreator.profile_picture_url }}
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

                        {/* Info */}
                        <View style={styles.creatorInfo}>
                          <View style={styles.creatorNameRow}>
                            <Text style={styles.creatorName}>
                              @{assignedCreator.creator_handle}
                            </Text>
                            <View 
                              style={[
                                styles.statusPill,
                                { backgroundColor: getGraduationBadgeColor(assignedCreator.graduation_status) }
                              ]}
                            >
                              <Text style={styles.statusPillText}>
                                {currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)}
                              </Text>
                            </View>
                          </View>
                          
                          <View style={styles.creatorStatsRow}>
                            <View style={styles.creatorStat}>
                              <IconSymbol
                                ios_icon_name="diamond.fill"
                                android_material_icon_name="diamond"
                                size={14}
                                color={colors.textSecondary}
                              />
                              <Text style={styles.creatorStatText}>
                                {assignedCreator.diamonds_monthly.toLocaleString()}
                              </Text>
                            </View>
                            {currentLevel !== 'gold' && (
                              <Text style={styles.diamondsToNext}>
                                {diamondsToNext.toLocaleString()} to {nextTarget}
                              </Text>
                            )}
                          </View>

                          {/* Diamond Progress Bar - Increased Height (Always Visible) */}
                          {currentLevel !== 'gold' && (
                            <View style={styles.progressBarContainer}>
                              <View style={styles.progressBarBg}>
                                <View 
                                  style={[
                                    styles.progressBarFill,
                                    { 
                                      width: `${progressPercentage}%`,
                                      backgroundColor: currentLevel === 'silver' ? '#FFD700' : '#C0C0C0'
                                    }
                                  ]}
                                />
                              </View>
                            </View>
                          )}
                        </View>

                        {/* Chevron Icon */}
                        <IconSymbol
                          ios_icon_name="chevron.right"
                          android_material_icon_name="chevron-right"
                          size={24}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        ) : (
          /* RANKINGS TAB */
          <View style={styles.rankingsCard}>
            <Text style={styles.sectionTitle}>Top 10 Managers</Text>
            <Text style={styles.rankingsSubtitle}>Ranked by total creators graduated</Text>

            {rankingsLoading ? (
              <View style={styles.rankingsLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading rankings...</Text>
              </View>
            ) : rankings.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="trophy.fill"
                  android_material_icon_name="emoji-events"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyStateText}>No rankings available yet</Text>
              </View>
            ) : (
              <View style={styles.rankingsList}>
                {rankings.map((manager, index) => {
                  const managerProfileUrl = manager.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop';
                  
                  return (
                    <TouchableOpacity
                      key={manager.id}
                      style={styles.rankingItem}
                      onPress={() => handleRankingCardPress(manager.tiktok_handle)}
                      activeOpacity={0.7}
                    >
                      {/* Rank Badge */}
                      <View style={[
                        styles.rankBadge,
                        index === 0 && styles.rankBadgeGold,
                        index === 1 && styles.rankBadgeSilver,
                        index === 2 && styles.rankBadgeBronze,
                      ]}>
                        <Text style={[
                          styles.rankNumber,
                          index < 3 && styles.rankNumberTop3
                        ]}>
                          {index + 1}
                        </Text>
                      </View>

                      {/* Profile Picture */}
                      <Image
                        source={{ uri: managerProfileUrl }}
                        style={styles.rankingAvatar}
                      />

                      {/* Manager Info */}
                      <View style={styles.rankingInfo}>
                        <Text style={styles.rankingName}>
                          {manager.first_name} {manager.last_name}
                        </Text>
                        <Text style={styles.rankingCount}>
                          {manager.graduated_creators} {manager.graduated_creators === 1 ? 'creator' : 'creators'} graduated
                        </Text>
                      </View>

                      {/* Trophy Icon for Top 3 */}
                      {index < 3 && (
                        <IconSymbol
                          ios_icon_name="trophy.fill"
                          android_material_icon_name="emoji-events"
                          size={24}
                          color={index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* EDIT MODAL */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={28}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* WhatsApp Number */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>WhatsApp Number</Text>
                <TextInput
                  style={styles.formInput}
                  value={editWhatsapp}
                  onChangeText={setEditWhatsapp}
                  placeholder="+1 234 567 8900"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Language Preference */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Language Preference</Text>
                <View style={styles.languageOptions}>
                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      editLanguage === 'english' && styles.languageOptionActive
                    ]}
                    onPress={() => setEditLanguage('english')}
                  >
                    <Text style={[
                      styles.languageOptionText,
                      editLanguage === 'english' && styles.languageOptionTextActive
                    ]}>
                      English
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      editLanguage === 'spanish' && styles.languageOptionActive
                    ]}
                    onPress={() => setEditLanguage('spanish')}
                  >
                    <Text style={[
                      styles.languageOptionText,
                      editLanguage === 'spanish' && styles.languageOptionTextActive
                    ]}>
                      Español
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      editLanguage === 'bilingual' && styles.languageOptionActive
                    ]}
                    onPress={() => setEditLanguage('bilingual')}
                  >
                    <Text style={[
                      styles.languageOptionText,
                      editLanguage === 'bilingual' && styles.languageOptionTextActive
                    ]}>
                      Bilingual
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* WhatsApp Group Link */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>WhatsApp Group Link</Text>
                <TextInput
                  style={styles.formInput}
                  value={editWhatsappGroup}
                  onChangeText={setEditWhatsappGroup}
                  placeholder="https://chat.whatsapp.com/..."
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              {/* Non-Editable Fields Notice */}
              <View style={styles.noticeBox}>
                <IconSymbol
                  ios_icon_name="info.circle.fill"
                  android_material_icon_name="info"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.noticeText}>
                  Name, region, role, and manager since date cannot be edited.
                </Text>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setEditModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  // TAB NAVIGATION
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },

  // MANAGER IDENTITY CARD
  managerIdentityCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.success,
  },
  managerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  managerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  managerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    borderWidth: 3,
    borderColor: colors.success,
  },
  managerInfo: {
    flex: 1,
  },
  managerName: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
  },
  managerBadgeTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  managerBadgeText: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  managerDetails: {
    gap: 12,
    marginBottom: 20,
  },
  managerDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  managerDetailText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: colors.text,
    flex: 1,
  },
  managerActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  managerActionButton: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  managerActionText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  whatsappGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  whatsappGroupButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  whatsappGroupButtonDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.grey,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  whatsappGroupButtonDisabledText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textSecondary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  editButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },

  // POTENTIAL EARNINGS SECTION - GREEN THEME
  potentialEarningsSection: {
    backgroundColor: colors.grey,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.success,
  },
  potentialEarningsTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  potentialEarningsSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  earningsProgressContainer: {
    marginBottom: 20,
  },
  earningsProgressBg: {
    height: 12,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 6,
    overflow: 'hidden',
  },
  earningsProgressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 6,
  },
  projectedAmountContainer: {
    alignItems: 'center',
  },
  projectedAmountLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  projectedAmount: {
    fontSize: 36,
    fontFamily: 'Poppins_700Bold',
    color: colors.success,
    marginBottom: 4,
  },
  projectedCreatorCount: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },

  // PERFORMANCE SUMMARY
  performanceCard: {
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
  heroMetric: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 24,
    borderRadius: 20,
    backgroundColor: colors.grey,
  },
  heroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroValue: {
    fontSize: 48,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 8,
  },
  heroLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  graduationBreakdown: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  miniCard: {
    flex: 1,
    backgroundColor: colors.grey,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  miniCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  miniCardValue: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 4,
  },
  miniCardLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  battlesBlock: {
    backgroundColor: colors.grey,
    borderRadius: 16,
    padding: 16,
  },
  battlesTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    marginBottom: 12,
  },
  battlesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  battleStat: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  battleStatValue: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  battleStatLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  battlesHelper: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // CREATORS SECTION
  creatorsCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grey,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: colors.text,
  },

  // STATUS TABS
  statusTabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statusTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.grey,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 6,
  },
  statusTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusTabText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statusTabTextActive: {
    color: '#FFFFFF',
  },
  statusTabBadge: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  statusTabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  statusTabBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
  },
  statusTabBadgeTextActive: {
    color: '#FFFFFF',
  },

  filtersContainer: {
    marginBottom: 16,
  },
  filtersScroll: {
    flexDirection: 'row',
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 16,
  },
  filterGroupLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textSecondary,
  },
  filterChip: {
    backgroundColor: colors.grey,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
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
    textAlign: 'center',
  },
  creatorsList: {
    gap: 12,
  },
  creatorCard: {
    backgroundColor: colors.grey,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
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
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: '#000000',
  },
  creatorStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  creatorStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  creatorStatText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
  },
  diamondsToNext: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  progressBarContainer: {
    marginTop: 4,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },

  // RANKINGS TAB
  rankingsCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  rankingsSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    marginBottom: 20,
  },
  rankingsLoading: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  rankingsList: {
    gap: 12,
  },
  rankingItem: {
    backgroundColor: colors.grey,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rankBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeGold: {
    backgroundColor: '#FFD700',
  },
  rankBadgeSilver: {
    backgroundColor: '#C0C0C0',
  },
  rankBadgeBronze: {
    backgroundColor: '#CD7F32',
  },
  rankNumber: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
  },
  rankNumberTop3: {
    color: '#000000',
  },
  rankingAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.border,
  },
  rankingInfo: {
    flex: 1,
  },
  rankingName: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 4,
  },
  rankingCount: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },

  // EDIT MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.backgroundAlt,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
  },
  modalBody: {
    padding: 24,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: colors.grey,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  languageOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  languageOption: {
    flex: 1,
    backgroundColor: colors.grey,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  languageOptionText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textSecondary,
  },
  languageOptionTextActive: {
    color: '#FFFFFF',
  },
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: colors.grey,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: colors.grey,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
});
