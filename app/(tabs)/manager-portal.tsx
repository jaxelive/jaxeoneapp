
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
} from 'react-native';
import { Stack } from 'expo-router';
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

type SortOption = 'diamonds_high' | 'diamonds_low' | 'closest_graduation' | 'status_asc' | 'status_desc' | 'battle_missing' | 'eligible_first';
type FilterStatus = 'all' | 'rookie' | 'silver' | 'gold';
type FilterBattle = 'all' | 'booked' | 'missing';
type FilterPayout = 'all' | 'eligible' | 'ineligible' | 'paid';

export default function ManagerPortalScreen() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

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
  const [expandedCreatorId, setExpandedCreatorId] = useState<string | null>(null);
  
  // Filtering and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('diamonds_high');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterBattle, setFilterBattle] = useState<FilterBattle>('all');
  const [filterPayout, setFilterPayout] = useState<FilterPayout>('all');
  
  // Animation for hero diamonds
  const [diamondsAnim] = useState(new Animated.Value(0));
  const [displayDiamonds, setDisplayDiamonds] = useState(0);

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

  useEffect(() => {
    if (creator && !creatorLoading) {
      console.log('[ManagerPortal] 🚀 Creator loaded, fetching manager portal data');
      fetchManagerPortalData();
    }
  }, [creator, creatorLoading, fetchManagerPortalData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchManagerPortalData();
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
      Alert.alert('Info', 'WhatsApp group link not available');
      return;
    }
    
    try {
      await Clipboard.setStringAsync(managerIdentity.whatsapp_group_link);
      Alert.alert('Copied!', 'WhatsApp group link copied to clipboard');
    } catch (error) {
      console.error('[ManagerPortal] Error copying to clipboard:', error);
      Alert.alert('Error', 'Could not copy link to clipboard');
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

  // Filter and sort creators
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

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => {
        const level = getGraduationLevel(c.graduation_status);
        return level === filterStatus;
      });
    }

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

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'diamonds_high':
          return b.diamonds_monthly - a.diamonds_monthly;
        case 'diamonds_low':
          return a.diamonds_monthly - b.diamonds_monthly;
        case 'closest_graduation': {
          const aLevel = getGraduationLevel(a.graduation_status);
          const bLevel = getGraduationLevel(b.graduation_status);
          const aRemaining = getDiamondsToNextGraduation(a.diamonds_monthly, aLevel);
          const bRemaining = getDiamondsToNextGraduation(b.diamonds_monthly, bLevel);
          return aRemaining - bRemaining;
        }
        case 'status_asc': {
          const order = { rookie: 0, silver: 1, gold: 2 };
          const aLevel = getGraduationLevel(a.graduation_status);
          const bLevel = getGraduationLevel(b.graduation_status);
          return order[aLevel] - order[bLevel];
        }
        case 'status_desc': {
          const order = { rookie: 0, silver: 1, gold: 2 };
          const aLevel = getGraduationLevel(a.graduation_status);
          const bLevel = getGraduationLevel(b.graduation_status);
          return order[bLevel] - order[aLevel];
        }
        case 'battle_missing':
          return (a.battle_booked === b.battle_booked) ? 0 : a.battle_booked ? 1 : -1;
        case 'eligible_first': {
          const aEligible = a.graduation_eligible && !a.graduation_paid_this_month && !a.was_graduated_at_assignment;
          const bEligible = b.graduation_eligible && !b.graduation_paid_this_month && !b.was_graduated_at_assignment;
          return (aEligible === bEligible) ? 0 : aEligible ? -1 : 1;
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, [assignedCreators, searchQuery, sortBy, filterStatus, filterBattle, filterPayout]);

  const toggleCreatorExpand = (creatorId: string) => {
    setExpandedCreatorId(prev => prev === creatorId ? null : creatorId);
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
        {/* MANAGER IDENTITY CARD */}
        <View style={styles.managerIdentityCard}>
          {/* Manager Badge at Top */}
          <View style={styles.managerBadge}>
            <IconSymbol
              ios_icon_name="star.fill"
              android_material_icon_name="star"
              size={14}
              color="#FFFFFF"
            />
            <Text style={styles.managerBadgeText}>Manager</Text>
          </View>

          <View style={styles.managerHeader}>
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
          {managerIdentity.whatsapp_group_link && (
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
              <Text style={styles.whatsappGroupButtonText}>My WhatsApp Group</Text>
            </TouchableOpacity>
          )}
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

          {/* Filters - NO EMOJIS */}
          <View style={styles.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
              {/* Sort Options */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>Sort:</Text>
                <TouchableOpacity 
                  style={[styles.filterChip, sortBy === 'diamonds_high' && styles.filterChipActive]}
                  onPress={() => setSortBy('diamonds_high')}
                >
                  <Text style={[styles.filterChipText, sortBy === 'diamonds_high' && styles.filterChipTextActive]}>
                    High → Low
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterChip, sortBy === 'diamonds_low' && styles.filterChipActive]}
                  onPress={() => setSortBy('diamonds_low')}
                >
                  <Text style={[styles.filterChipText, sortBy === 'diamonds_low' && styles.filterChipTextActive]}>
                    Low → High
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterChip, sortBy === 'closest_graduation' && styles.filterChipActive]}
                  onPress={() => setSortBy('closest_graduation')}
                >
                  <Text style={[styles.filterChipText, sortBy === 'closest_graduation' && styles.filterChipTextActive]}>
                    Closest
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterChip, sortBy === 'battle_missing' && styles.filterChipActive]}
                  onPress={() => setSortBy('battle_missing')}
                >
                  <Text style={[styles.filterChipText, sortBy === 'battle_missing' && styles.filterChipTextActive]}>
                    Missing First
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterChip, sortBy === 'eligible_first' && styles.filterChipActive]}
                  onPress={() => setSortBy('eligible_first')}
                >
                  <Text style={[styles.filterChipText, sortBy === 'eligible_first' && styles.filterChipTextActive]}>
                    Eligible First
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Status Filter */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>Status:</Text>
                <TouchableOpacity 
                  style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
                  onPress={() => setFilterStatus('all')}
                >
                  <Text style={[styles.filterChipText, filterStatus === 'all' && styles.filterChipTextActive]}>
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterChip, filterStatus === 'rookie' && styles.filterChipActive]}
                  onPress={() => setFilterStatus('rookie')}
                >
                  <Text style={[styles.filterChipText, filterStatus === 'rookie' && styles.filterChipTextActive]}>
                    Rookie
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterChip, filterStatus === 'silver' && styles.filterChipActive]}
                  onPress={() => setFilterStatus('silver')}
                >
                  <Text style={[styles.filterChipText, filterStatus === 'silver' && styles.filterChipTextActive]}>
                    Silver
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterChip, filterStatus === 'gold' && styles.filterChipActive]}
                  onPress={() => setFilterStatus('gold')}
                >
                  <Text style={[styles.filterChipText, filterStatus === 'gold' && styles.filterChipTextActive]}>
                    Gold
                  </Text>
                </TouchableOpacity>
              </View>

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

          {/* Creators List */}
          {filteredAndSortedCreators.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="person.crop.circle.badge.questionmark"
                android_material_icon_name="person-add"
                size={48}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyStateText}>
                {searchQuery || filterStatus !== 'all' || filterBattle !== 'all' || filterPayout !== 'all'
                  ? 'No creators match your filters'
                  : 'No creators assigned yet'}
              </Text>
            </View>
          ) : (
            <View style={styles.creatorsList}>
              {filteredAndSortedCreators.map((assignedCreator) => {
                const isExpanded = expandedCreatorId === assignedCreator.id;
                const currentLevel = getGraduationLevel(assignedCreator.graduation_status);
                const diamondsToNext = getDiamondsToNextGraduation(assignedCreator.diamonds_monthly, currentLevel);
                const nextTarget = getNextGraduationTarget(currentLevel);
                const progressPercentage = getProgressPercentage(assignedCreator.diamonds_monthly, currentLevel);
                const isEligible = assignedCreator.graduation_eligible && !assignedCreator.graduation_paid_this_month && !assignedCreator.was_graduated_at_assignment;
                const isPaid = assignedCreator.graduation_paid_this_month;
                const isIneligible = assignedCreator.was_graduated_at_assignment;

                return (
                  <View key={assignedCreator.id} style={styles.creatorCard}>
                    {/* Collapsed Row */}
                    <TouchableOpacity 
                      style={styles.creatorRowCollapsed}
                      onPress={() => toggleCreatorExpand(assignedCreator.id)}
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
                      <View style={styles.creatorInfoCollapsed}>
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

                        {/* Diamond Progress Bar - Increased Height */}
                        {currentLevel !== 'gold' && (
                          <View style={styles.collapsedProgressBarContainer}>
                            <View style={styles.collapsedProgressBarBg}>
                              <View 
                                style={[
                                  styles.collapsedProgressBarFill,
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

                      {/* Expand Icon */}
                      <IconSymbol
                        ios_icon_name={isExpanded ? "chevron.up" : "chevron.down"}
                        android_material_icon_name={isExpanded ? "expand-less" : "expand-more"}
                        size={24}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <View style={styles.creatorExpanded}>
                        {/* A) Creator Identity */}
                        <View style={styles.expandedSection}>
                          <Text style={styles.expandedSectionTitle}>Creator Identity</Text>
                          <View style={styles.creatorIdentityContainer}>
                            <Text style={styles.creatorIdentityName}>
                              {assignedCreator.first_name} {assignedCreator.last_name}
                            </Text>
                            <TouchableOpacity 
                              style={styles.creatorIdentityLink}
                              onPress={() => handleTikTokPress(assignedCreator.creator_handle)}
                            >
                              <IconSymbol
                                ios_icon_name="music.note"
                                android_material_icon_name="music-note"
                                size={16}
                                color={colors.primary}
                              />
                              <Text style={styles.creatorIdentityLinkText}>
                                @{assignedCreator.creator_handle}
                              </Text>
                            </TouchableOpacity>
                            {assignedCreator.phone && (
                              <TouchableOpacity 
                                style={styles.creatorIdentityLink}
                                onPress={() => handleWhatsAppPress(assignedCreator.phone!)}
                              >
                                <IconSymbol
                                  ios_icon_name="message.fill"
                                  android_material_icon_name="chat"
                                  size={16}
                                  color={colors.primary}
                                />
                                <Text style={styles.creatorIdentityLinkText}>
                                  {assignedCreator.phone}
                                </Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity 
                              style={styles.creatorIdentityLink}
                              onPress={() => Linking.openURL(`mailto:${assignedCreator.email}`)}
                            >
                              <IconSymbol
                                ios_icon_name="envelope.fill"
                                android_material_icon_name="email"
                                size={16}
                                color={colors.primary}
                              />
                              <Text style={styles.creatorIdentityLinkText}>
                                {assignedCreator.email}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* B) Diamonds & Graduation Progress */}
                        <View style={styles.expandedSection}>
                          <Text style={styles.expandedSectionTitle}>
                            Diamonds & Graduation
                          </Text>
                          <View style={styles.diamondsLargeContainer}>
                            <IconSymbol
                              ios_icon_name="diamond.fill"
                              android_material_icon_name="diamond"
                              size={32}
                              color="#06B6D4"
                            />
                            <Text style={styles.diamondsLargeValue}>
                              {assignedCreator.diamonds_monthly.toLocaleString()}
                            </Text>
                            <Text style={styles.diamondsLargeLabel}>Monthly Diamonds</Text>
                          </View>

                          {currentLevel !== 'gold' && (
                            <>
                              <Text style={styles.progressToNextLabel}>
                                Progress to {nextTarget}
                              </Text>
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
                              <View style={styles.progressStats}>
                                <Text style={styles.progressStatText}>
                                  Current: {assignedCreator.diamonds_monthly.toLocaleString()}
                                </Text>
                                <Text style={styles.progressStatText}>
                                  Target: {(currentLevel === 'silver' ? GOLD_THRESHOLD : SILVER_THRESHOLD).toLocaleString()}
                                </Text>
                                <Text style={styles.progressStatText}>
                                  Remaining: {diamondsToNext.toLocaleString()}
                                </Text>
                              </View>
                            </>
                          )}
                        </View>

                        {/* C) Battle Information */}
                        <View style={styles.expandedSection}>
                          <Text style={styles.expandedSectionTitle}>Battle Status</Text>
                          <View style={styles.battleStatusRow}>
                            {assignedCreator.battle_booked ? (
                              <>
                                <IconSymbol
                                  ios_icon_name="checkmark.circle.fill"
                                  android_material_icon_name="check-circle"
                                  size={20}
                                  color={colors.success}
                                />
                                <Text style={styles.battleStatusText}>Battle: Booked ✅</Text>
                              </>
                            ) : (
                              <>
                                <IconSymbol
                                  ios_icon_name="exclamationmark.circle.fill"
                                  android_material_icon_name="error"
                                  size={20}
                                  color={colors.warning}
                                />
                                <Text style={styles.battleStatusText}>Battle: Missing ⚠️</Text>
                              </>
                            )}
                          </View>
                          {!assignedCreator.battle_booked && (
                            <TouchableOpacity style={styles.ctaButton}>
                              <Text style={styles.ctaButtonText}>Remind Creator</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* D) Manager Payout Information */}
                        <View style={styles.expandedSection}>
                          <Text style={styles.expandedSectionTitle}>Manager Payout Info</Text>
                          
                          {/* Payout Cards */}
                          <View style={styles.payoutCardsContainer}>
                            <View style={styles.payoutCard}>
                              <Text style={styles.payoutCardLabel}>Silver Graduation</Text>
                              <Text style={styles.payoutCardValue}>${SILVER_PAYOUT}</Text>
                            </View>
                            <View style={styles.payoutCard}>
                              <Text style={styles.payoutCardLabel}>Gold Graduation</Text>
                              <Text style={styles.payoutCardValue}>${GOLD_PAYOUT}</Text>
                            </View>
                          </View>

                          <View style={styles.payoutRules}>
                            <Text style={styles.payoutRulesTitle}>Rules:</Text>
                            <Text style={styles.payoutRulesText}>
                              ✓ Manager earns only on the first graduation per creator per month
                            </Text>
                            <Text style={styles.payoutRulesText}>
                              ✓ If creator is already Silver/Gold when assigned → $0 earned
                            </Text>
                            <Text style={styles.payoutRulesText}>
                              ✓ After graduation, no more bonuses from that creator for the month
                            </Text>
                          </View>
                          {isIneligible && (
                            <View style={styles.ineligibleBanner}>
                              <Text style={styles.ineligibleText}>
                                Ineligible — Already Graduated
                              </Text>
                            </View>
                          )}
                          {isPaid && (
                            <View style={styles.paidBanner}>
                              <Text style={styles.paidText}>
                                Bonus earned this month ✅
                              </Text>
                            </View>
                          )}
                          {isEligible && !isPaid && (
                            <View style={styles.eligibleBanner}>
                              <Text style={styles.eligibleText}>
                                Eligible for bonus 💰
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
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

  // MANAGER IDENTITY CARD
  managerIdentityCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.success,
  },
  managerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 16,
  },
  managerBadgeText: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  managerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
  },
  whatsappGroupButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
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
    overflow: 'hidden',
  },
  creatorRowCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
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
  creatorInfoCollapsed: {
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
  collapsedProgressBarContainer: {
    marginTop: 4,
  },
  collapsedProgressBarBg: {
    height: 8,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 4,
    overflow: 'hidden',
  },
  collapsedProgressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  creatorExpanded: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  expandedSection: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
  },
  expandedSectionTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    marginBottom: 12,
  },
  creatorIdentityContainer: {
    gap: 10,
  },
  creatorIdentityName: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 4,
  },
  creatorIdentityLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creatorIdentityLinkText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.primary,
  },
  diamondsLargeContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 16,
  },
  diamondsLargeValue: {
    fontSize: 36,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  diamondsLargeLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  progressToNextLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    marginBottom: 8,
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: colors.grey,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStatText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  battleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  battleStatusText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  payoutCardsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  payoutCard: {
    flex: 1,
    backgroundColor: colors.grey,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  payoutCardLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  payoutCardValue: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
  },
  payoutRules: {
    backgroundColor: colors.grey,
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  payoutRulesTitle: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    marginBottom: 4,
  },
  payoutRulesText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    lineHeight: 18,
  },
  ineligibleBanner: {
    backgroundColor: colors.error + '20',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.error,
  },
  ineligibleText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.error,
    textAlign: 'center',
  },
  paidBanner: {
    backgroundColor: colors.success + '20',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.success,
  },
  paidText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.success,
    textAlign: 'center',
  },
  eligibleBanner: {
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  eligibleText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
    textAlign: 'center',
  },
});
