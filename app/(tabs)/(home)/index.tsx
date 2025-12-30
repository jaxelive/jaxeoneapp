
import React, { useRef, useEffect, useState, useCallback } from "react";
import { Stack, router } from "expo-router";
import { 
  ScrollView, 
  StyleSheet, 
  View, 
  Text, 
  Image, 
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from "react-native";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import { useCreatorData } from "@/hooks/useCreatorData";
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';
import { supabase } from "@/app/integrations/supabase/client";
import { RotatingCard } from "@/components/RotatingCard";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { AnimatedProgressBar } from "@/components/AnimatedProgressBar";
import { ChatDrawer } from "@/components/ChatDrawer";
import { formatTo12Hour } from "@/utils/timeFormat";

const { width } = Dimensions.get('window');

// Hardcoded creator handle - no authentication needed
const CREATOR_HANDLE = 'avelezsanti';

// Region-based tier calculation function
function getTierFromDiamonds(diamonds: number, region: string): string {
  const isLatAm = region?.toLowerCase().includes('latin') || region?.toLowerCase().includes('latam');
  
  if (isLatAm) {
    if (diamonds >= 300000) return 'Gold';
    if (diamonds >= 100000) return 'Silver';
  } else {
    // USA & Canada
    if (diamonds >= 500000) return 'Gold';
    if (diamonds >= 200000) return 'Silver';
  }
  
  return 'Rookie';
}

function getNextTierInfo(diamonds: number, region: string): { tier: string; target: number } | null {
  const isLatAm = region?.toLowerCase().includes('latin') || region?.toLowerCase().includes('latam');
  
  if (isLatAm) {
    if (diamonds < 100000) return { tier: 'Silver', target: 100000 };
    if (diamonds < 300000) return { tier: 'Gold', target: 300000 };
  } else {
    // USA & Canada
    if (diamonds < 200000) return { tier: 'Silver', target: 200000 };
    if (diamonds < 500000) return { tier: 'Gold', target: 500000 };
  }
  
  return null; // Max tier reached
}

// Get checkmark color based on tier
function getTierCheckmarkColor(tier: string): string {
  if (tier === 'Gold') return '#FFD700';
  if (tier === 'Silver') return '#C0C0C0';
  return '#10B981'; // Rookie green
}

interface TopCreator {
  creator_handle: string;
  diamonds_monthly: number;
  total_diamonds: number;
  avatar_url: string | null;
  profile_picture_url: string | null;
  region: string | null;
}

interface UserRank {
  rank: number;
  total_creators: number;
}

interface LiveEvent {
  id: string;
  event_name: string;
  language: string;
  event_info: string;
  event_link: string;
  event_date: string;
  event_hour: string;
  region: string | null;
  time_zone: string | null;
}

export default function HomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });
  
  const { creator, loading, error, refetch } = useCreatorData(CREATOR_HANDLE);
  const [nextBattle, setNextBattle] = useState<any>(null);
  const [challengeProgress, setChallengeProgress] = useState<any>(null);
  const [educationProgress, setEducationProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [chatDrawerVisible, setChatDrawerVisible] = useState(false);
  const [topCreators, setTopCreators] = useState<TopCreator[]>([]);
  const [userRank, setUserRank] = useState<UserRank | null>(null);
  const [showAcademy, setShowAcademy] = useState(true);
  const [showChallenge, setShowChallenge] = useState(true);
  const [academyCompletedAt, setAcademyCompletedAt] = useState<string | null>(null);
  const [challengeCompletedAt, setChallengeCompletedAt] = useState<string | null>(null);
  const [totalCourseVideos, setTotalCourseVideos] = useState(0);
  const [featuredLiveEvent, setFeaturedLiveEvent] = useState<LiveEvent | null>(null);
  const [isRegisteredForEvent, setIsRegisteredForEvent] = useState(false);
  const [registeringEventId, setRegisteringEventId] = useState<string | null>(null);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    await fetchBattleData();
    await fetchChallengeData();
    await fetchEducationData();
    await fetchTopCreators();
    await fetchFeaturedLiveEvent();
    await checkUnreadNotifications();
    setRefreshing(false);
  };

  const checkUnreadNotifications = useCallback(async () => {
    if (!creator) return;

    try {
      console.log('[HomeScreen] Checking for unread notifications...');
      
      // Get the last time user viewed notifications from local storage or use a default
      // For now, we'll check if there are any notifications from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .or(`region.eq.${creator.region},region.eq.All`)
        .gte('created_at', sevenDaysAgo.toISOString())
        .limit(1);

      if (error) {
        console.error('[HomeScreen] Error checking notifications:', error);
        return;
      }

      const hasNotifications = data && data.length > 0;
      setHasUnreadNotifications(hasNotifications);
      console.log('[HomeScreen] Has unread notifications:', hasNotifications);
    } catch (error: any) {
      console.error('[HomeScreen] Unexpected error checking notifications:', error);
    }
  }, [creator]);

  useEffect(() => {
    if (creator) {
      console.log('[HomeScreen] Creator loaded:', {
        handle: creator.creator_handle,
        name: `${creator.first_name} ${creator.last_name}`,
        monthlyDiamonds: creator.diamonds_monthly,
        totalDiamonds: creator.total_diamonds,
        liveDays: creator.live_days_30d,
        liveHours: Math.floor(creator.live_duration_seconds_30d / 3600),
        hasManager: !!creator.manager,
        managerName: creator.manager ? `${creator.manager.first_name} ${creator.manager.last_name}` : 'None',
        creatorType: creator.creator_type,
        userRole: creator.user_role
      });
      fetchBattleData();
      fetchChallengeData();
      fetchEducationData();
      fetchTopCreators();
      fetchFeaturedLiveEvent();
      checkUnreadNotifications();
    }
  }, [creator]);

  const fetchFeaturedLiveEvent = async () => {
    try {
      console.log('[HomeScreen] Fetching featured live event...');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = today.toISOString().split('T')[0];

      // Fetch the next upcoming live event
      const { data: eventData, error: eventError } = await supabase
        .from('live_events')
        .select('*')
        .gte('event_date', todayString)
        .order('event_date', { ascending: true })
        .order('event_hour', { ascending: true })
        .limit(1)
        .single();

      if (eventError) {
        if (eventError.code !== 'PGRST116') {
          console.error('[HomeScreen] Error fetching featured event:', eventError);
        } else {
          console.log('[HomeScreen] No upcoming live events found');
        }
        setFeaturedLiveEvent(null);
        return;
      }

      console.log('[HomeScreen] Featured live event found:', eventData);
      setFeaturedLiveEvent(eventData);

      // Check if user is registered for this event
      const { data: registrationData, error: registrationError } = await supabase
        .from('live_event_registrations')
        .select('*')
        .eq('live_event_id', eventData.id)
        .eq('creator_handle', CREATOR_HANDLE)
        .single();

      if (registrationError) {
        if (registrationError.code !== 'PGRST116') {
          console.error('[HomeScreen] Error checking registration:', registrationError);
        }
        setIsRegisteredForEvent(false);
      } else {
        console.log('[HomeScreen] User is registered for event');
        setIsRegisteredForEvent(true);
      }
    } catch (error: any) {
      console.error('[HomeScreen] Unexpected error fetching featured event:', error);
    }
  };

  const handleRegisterForEvent = async (eventId: string) => {
    if (registeringEventId) return;

    try {
      console.log('[HomeScreen] Registering for event:', eventId);
      setRegisteringEventId(eventId);

      const { error } = await supabase
        .from('live_event_registrations')
        .insert({
          live_event_id: eventId,
          creator_handle: CREATOR_HANDLE,
        });

      if (error) {
        console.error('[HomeScreen] Error registering for event:', error);
        Alert.alert('Error', 'Failed to register for the event. Please try again.');
        return;
      }

      setIsRegisteredForEvent(true);
      console.log('[HomeScreen] Successfully registered for event');
      Alert.alert('Success', 'You have been registered for this event. You can now join!');
    } catch (error: any) {
      console.error('[HomeScreen] Exception during registration:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setRegisteringEventId(null);
    }
  };

  const handleJoinEvent = async (event: LiveEvent) => {
    if (!event.event_link) {
      Alert.alert('Error', 'Event link not available yet.');
      return;
    }

    try {
      console.log('[HomeScreen] Opening event link:', event.event_link);
      await Linking.openURL(event.event_link);
    } catch (error) {
      console.error('[HomeScreen] Error opening link:', error);
      Alert.alert('Error', 'Failed to open event link.');
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const fetchBattleData = useCallback(async () => {
    if (!creator) return;

    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('battles_calendar')
        .select('*')
        .or(`creator_1_id.eq.${creator.id},creator_2_id.eq.${creator.id}`)
        .gte('battle_date', now)
        .order('battle_date', { ascending: true })
        .limit(1);

      if (error) {
        console.error('[HomeScreen] Error fetching battle data:', error);
        return;
      }
      
      if (data && data.length > 0) {
        console.log('[HomeScreen] Next battle found:', data[0]);
        setNextBattle(data[0]);
      } else {
        console.log('[HomeScreen] No upcoming battles found');
        setNextBattle(null);
      }
    } catch (error: any) {
      console.error('[HomeScreen] Unexpected error fetching battle data:', error);
    }
  }, [creator]);

  const fetchChallengeData = useCallback(async () => {
    if (!creator) return;

    try {
      // Fetch user's challenge progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_day_progress')
        .select('*')
        .eq('user_id', creator.id);

      if (progressError && progressError.code !== 'PGRST116') {
        console.error('[HomeScreen] Error fetching challenge progress:', progressError);
        return;
      }

      const completedDays = progressData?.filter(p => p.status === 'completed').length || 0;
      const currentDay = progressData?.find(p => p.status === 'unlocked')?.day_number || 1;
      const todayStatus = progressData?.find(p => p.day_number === currentDay)?.status || 'locked';

      console.log('[HomeScreen] Challenge progress:', {
        completedDays,
        currentDay,
        todayStatus,
      });

      setChallengeProgress({
        completedDays,
        currentDay,
        todayStatus,
        totalDays: 21,
      });

      // Check if challenge is completed and when
      const { data: challengeData, error: challengeError } = await supabase
        .from('user_challenge_progress')
        .select('completed_at')
        .eq('user_id', creator.id)
        .eq('status', 'completed')
        .single();

      if (challengeError && challengeError.code !== 'PGRST116') {
        console.error('[HomeScreen] Error fetching challenge completion:', challengeError);
      }

      if (challengeData?.completed_at) {
        setChallengeCompletedAt(challengeData.completed_at);
        
        // Check if 5 days have passed since completion
        const completedDate = new Date(challengeData.completed_at);
        const fiveDaysLater = new Date(completedDate);
        fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);
        const now = new Date();
        
        if (now > fiveDaysLater) {
          setShowChallenge(false);
          console.log('[HomeScreen] Challenge hidden - 5 days passed since completion');
        }
      }
    } catch (error: any) {
      console.error('[HomeScreen] Unexpected error fetching challenge data:', error);
    }
  }, [creator]);

  const fetchEducationData = useCallback(async () => {
    if (!creator) return;

    try {
      // Get total number of videos in the course
      const { data: videosData, error: videosError } = await supabase
        .from('course_videos')
        .select('id');

      if (videosError && videosError.code !== 'PGRST116') {
        console.error('[HomeScreen] Error fetching course videos:', videosError);
      }

      const totalVideos = videosData?.length || 6;
      setTotalCourseVideos(totalVideos);

      // Fetch completed videos using creator_handle
      const { data: educationData, error: educationError } = await supabase
        .from('user_video_progress')
        .select('*')
        .eq('creator_handle', CREATOR_HANDLE)
        .eq('completed', true);

      if (educationError && educationError.code !== 'PGRST116') {
        console.error('[HomeScreen] Error fetching education data:', educationError);
        return;
      }

      const completedVideos = educationData?.length || 0;
      console.log('[HomeScreen] Education progress:', completedVideos, '/', totalVideos);
      setEducationProgress(completedVideos);

      // Check if course is completed and when
      const { data: courseData, error: courseError } = await supabase
        .from('user_course_progress')
        .select('completed_at')
        .eq('user_id', creator.id)
        .eq('completed', true)
        .single();

      if (courseError && courseError.code !== 'PGRST116') {
        console.error('[HomeScreen] Error fetching course completion:', courseError);
      }

      if (courseData?.completed_at) {
        setAcademyCompletedAt(courseData.completed_at);
        
        // Check if 5 days have passed since completion
        const completedDate = new Date(courseData.completed_at);
        const fiveDaysLater = new Date(completedDate);
        fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);
        const now = new Date();
        
        if (now > fiveDaysLater) {
          // Check if new content has been added since completion
          const { data: newVideos, error: newVideosError } = await supabase
            .from('course_videos')
            .select('id')
            .gt('created_at', courseData.completed_at);

          if (newVideosError && newVideosError.code !== 'PGRST116') {
            console.error('[HomeScreen] Error checking new videos:', newVideosError);
          }

          if (newVideos && newVideos.length > 0) {
            setShowAcademy(true);
            console.log('[HomeScreen] Academy shown - new content added');
          } else {
            setShowAcademy(false);
            console.log('[HomeScreen] Academy hidden - 5 days passed since completion, no new content');
          }
        }
      }
    } catch (error: any) {
      console.error('[HomeScreen] Unexpected error fetching education data:', error);
    }
  }, [creator]);

  const fetchTopCreators = useCallback(async () => {
    if (!creator) return;

    try {
      // Fetch top 3 creators by diamonds_monthly (current month performance) with region
      const { data: topCreatorsData, error: topCreatorsError } = await supabase
        .from('creators')
        .select('creator_handle, diamonds_monthly, total_diamonds, avatar_url, profile_picture_url, region')
        .eq('is_active', true)
        .order('diamonds_monthly', { ascending: false })
        .order('total_diamonds', { ascending: false })
        .limit(3);

      if (topCreatorsError) {
        console.error('[HomeScreen] Error fetching top creators:', topCreatorsError);
      } else {
        console.log('[HomeScreen] Top 3 creators loaded:', topCreatorsData);
        setTopCreators(topCreatorsData || []);
      }

      // Fetch user's rank using the updated function
      const { data: rankData, error: rankError } = await supabase.rpc('get_creator_rank', {
        p_creator_id: creator.id
      });

      if (rankError) {
        console.error('[HomeScreen] Error fetching user rank:', rankError);
        // Fallback: calculate rank manually using diamonds_monthly
        const { data: allCreators, error: allError } = await supabase
          .from('creators')
          .select('id, diamonds_monthly, total_diamonds')
          .eq('is_active', true)
          .order('diamonds_monthly', { ascending: false })
          .order('total_diamonds', { ascending: false });

        if (!allError && allCreators) {
          const userIndex = allCreators.findIndex(c => c.id === creator.id);
          const rank = userIndex >= 0 ? userIndex + 1 : allCreators.length;
          setUserRank({
            rank: rank,
            total_creators: allCreators.length
          });
          console.log('[HomeScreen] User rank (fallback):', rank, '/', allCreators.length);
        }
      } else if (rankData && Array.isArray(rankData) && rankData.length > 0) {
        // RPC returns an array, get the first result
        const rankResult = rankData[0];
        setUserRank({
          rank: Number(rankResult.rank) || 1,
          total_creators: Number(rankResult.total_creators) || 1
        });
        console.log('[HomeScreen] User rank:', rankResult);
      } else if (rankData && !Array.isArray(rankData)) {
        // Handle case where it returns a single object
        setUserRank({
          rank: Number(rankData.rank) || 1,
          total_creators: Number(rankData.total_creators) || 1
        });
        console.log('[HomeScreen] User rank:', rankData);
      }
    } catch (error: any) {
      console.error('[HomeScreen] Unexpected error fetching top creators:', error);
    }
  }, [creator]);

  const handleManagerCardPress = () => {
    if (creator?.assigned_manager_id) {
      router.push(`/(tabs)/manager-details?managerId=${creator.assigned_manager_id}` as any);
    } else {
      console.log('No manager assigned - show request manager flow');
    }
  };

  const handleTopCreatorPress = async (creatorHandle: string) => {
    const tiktokUrl = `https://www.tiktok.com/@${creatorHandle}`;
    console.log('[HomeScreen] Opening TikTok profile:', tiktokUrl);
    
    try {
      const canOpen = await Linking.canOpenURL(tiktokUrl);
      if (canOpen) {
        await Linking.openURL(tiktokUrl);
      } else {
        console.error('[HomeScreen] Cannot open TikTok URL:', tiktokUrl);
      }
    } catch (error) {
      console.error('[HomeScreen] Error opening TikTok profile:', error);
    }
  };

  if (loading || !fontsLoaded) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "JAXE One",
            headerShown: false,
          }}
        />
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </>
    );
  }

  if (error || !creator) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "JAXE One",
            headerShown: false,
          }}
        />
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.errorText}>
            {error || 'No creator data found'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <View style={styles.retryButtonFlat}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </View>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const firstName = creator.first_name || creator.creator_handle;
  const profileImageUrl = creator.avatar_url || creator.profile_picture_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop';
  const region = creator.region || 'USA & Canada';
  
  // Get creator types from database, default to ['Creator'] if not set
  const creatorTypes = creator.creator_type && creator.creator_type.length > 0 
    ? creator.creator_type 
    : ['Creator'];

  // Check if user is a manager
  const isManager = creator.user_role === 'manager';

  // Calculate tier and next tier from real data with region-based logic
  const currentDiamonds = creator.diamonds_monthly || 0;
  const currentTier = getTierFromDiamonds(currentDiamonds, region);
  const nextTierInfo = getNextTierInfo(currentDiamonds, region);
  const remaining = nextTierInfo ? Math.max(0, nextTierInfo.target - currentDiamonds) : 0;
  const checkmarkColor = getTierCheckmarkColor(currentTier);

  // Calculate live stats
  const liveDays = creator.live_days_30d || 0;
  const liveHours = Math.floor((creator.live_duration_seconds_30d || 0) / 3600);

  // Calculate challenge progress percentage
  const challengePercentage = challengeProgress 
    ? (challengeProgress.completedDays / challengeProgress.totalDays) * 100 
    : 0;

  // Manager data - Use manager_avatar_url from managers table first, fallback to avatar_url from users table
  const manager = creator.manager;
  const managerProfileUrl = manager?.manager_avatar_url || manager?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop';

  return (
    <>
      <Stack.Screen
        options={{
          title: "JAXE One",
          headerShown: false,
        }}
      />
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* HEADER */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.profileContainer}>
                  <Image
                    source={{ uri: profileImageUrl }}
                    style={styles.headerAvatar}
                  />
                  {/* Notification Bell Overlay */}
                  <TouchableOpacity 
                    style={styles.notificationBellOverlay}
                    onPress={() => router.push('/(tabs)/notifications' as any)}
                  >
                    <View style={styles.notificationBellBadge}>
                      <IconSymbol 
                        ios_icon_name="bell.fill" 
                        android_material_icon_name="notifications" 
                        size={16} 
                        color="#FFFFFF" 
                      />
                      {hasUnreadNotifications && (
                        <View style={styles.notificationRedDot} />
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
                <View style={styles.headerInfo}>
                  <View style={styles.headerNameRow}>
                    <Text style={styles.headerGreeting}>Welcome back, </Text>
                    <Text style={styles.headerName}>{firstName}</Text>
                    {/* Tier-colored checkmark with navigation */}
                    <TouchableOpacity 
                      style={styles.goldCheckmark}
                      onPress={() => router.push('/tier-explanation' as any)}
                    >
                      <IconSymbol 
                        ios_icon_name="checkmark.seal.fill" 
                        android_material_icon_name="verified" 
                        size={24} 
                        color={checkmarkColor} 
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.headerBadges}>
                    {creatorTypes.map((type, index) => (
                      <View key={index} style={styles.headerBadge}>
                        <Text style={styles.headerBadgeText}>{type}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.headerRegions}>
                    <View style={styles.regionBadge}>
                      <Text style={styles.regionBadgeText}>{region}</Text>
                    </View>
                    <View style={styles.regionBadge}>
                      <Text style={styles.regionBadgeText}>Creator</Text>
                    </View>
                    {isManager && (
                      <View style={styles.managerBadge}>
                        <Text style={styles.managerBadgeText}>Manager</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.headerIcons}>
                <TouchableOpacity 
                  style={styles.headerIconButton}
                  onPress={() => setChatDrawerVisible(true)}
                >
                  <IconSymbol 
                    ios_icon_name="message.fill" 
                    android_material_icon_name="chat" 
                    size={24} 
                    color="#6642EF" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* ========== HERO MODULE: ROTATING CARDS (SELF-CONTAINED) ========== */}
            <View style={styles.heroModule}>
              <View style={styles.rotatingCardsContainer}>
                {activeCardIndex === 0 ? (
                  <>
                    {/* Back Card (Faded) - Bonus Forecast - HIDDEN HALFWAY */}
                    <TouchableOpacity 
                      style={styles.backCard}
                      onPress={() => setActiveCardIndex(1)}
                      activeOpacity={0.9}
                    >
                      <RotatingCard
                        type="bonus"
                        isFaded={true}
                        onPress={() => {}}
                        data={{
                          bonusAmount: 100,
                          nextBonus: 175,
                          liveDays: liveDays,
                          liveHours: liveHours,
                          battlesBooked: nextBattle ? 1 : 0,
                        }}
                      />
                    </TouchableOpacity>

                    {/* Front Card - Diamonds */}
                    <View style={styles.frontCard}>
                      <RotatingCard
                        type="diamonds"
                        onPress={() => {}}
                        data={{
                          diamondsEarned: currentDiamonds,
                          totalGoal: nextTierInfo?.target || 0,
                          remaining: remaining,
                          nextTier: nextTierInfo?.tier || 'Max',
                          currentTier: currentTier,
                          isMaxTier: !nextTierInfo,
                        }}
                      />
                    </View>
                  </>
                ) : (
                  <>
                    {/* Back Card (Faded) - Diamonds */}
                    <TouchableOpacity 
                      style={styles.backCard}
                      onPress={() => setActiveCardIndex(0)}
                      activeOpacity={0.9}
                    >
                      <RotatingCard
                        type="diamonds"
                        isFaded={true}
                        onPress={() => {}}
                        data={{
                          diamondsEarned: currentDiamonds,
                          totalGoal: nextTierInfo?.target || 0,
                          remaining: remaining,
                          nextTier: nextTierInfo?.tier || 'Max',
                          currentTier: currentTier,
                          isMaxTier: !nextTierInfo,
                        }}
                      />
                    </TouchableOpacity>

                    {/* Front Card - Bonus Forecast */}
                    <View style={styles.frontCard}>
                      <RotatingCard
                        type="bonus"
                        onPress={() => {}}
                        data={{
                          bonusAmount: 100,
                          nextBonus: 175,
                          liveDays: liveDays,
                          liveHours: liveHours,
                          battlesBooked: nextBattle ? 1 : 0,
                        }}
                      />
                    </View>
                  </>
                )}
              </View>
            </View>
            {/* ========== END HERO MODULE ========== */}

            {/* ========== REST OF HOME CONTENT (SEPARATE SECTION) ========== */}
            <View style={styles.restOfHomeContent}>
              {/* MY DIAMONDS & BONUS BUTTON */}
              <TouchableOpacity 
                style={styles.diamondsBonusButton}
                onPress={() => router.push('/(tabs)/bonus-details')}
              >
                <Text style={styles.diamondsBonusButtonText}>My Diamonds & Bonus</Text>
                <IconSymbol 
                  ios_icon_name="arrow.right" 
                  android_material_icon_name="arrow-forward" 
                  size={18} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>

              {/* FEATURED UPCOMING LIVE EVENT CARD - SMALL COMPACT VERSION */}
              {featuredLiveEvent && (
                <TouchableOpacity 
                  style={styles.compactLiveEventCard}
                  onPress={() => {
                    if (isRegisteredForEvent) {
                      handleJoinEvent(featuredLiveEvent);
                    } else {
                      handleRegisterForEvent(featuredLiveEvent.id);
                    }
                  }}
                  disabled={registeringEventId === featuredLiveEvent.id}
                  activeOpacity={0.8}
                >
                  <View style={styles.compactEventLeft}>
                    <View style={styles.compactEventIconContainer}>
                      <IconSymbol 
                        ios_icon_name="video.fill" 
                        android_material_icon_name="videocam" 
                        size={20} 
                        color="#FF3B5C" 
                      />
                    </View>
                    <View style={styles.compactEventInfo}>
                      <Text style={styles.compactEventTitle} numberOfLines={1}>
                        {featuredLiveEvent.event_name}
                      </Text>
                      <View style={styles.compactEventDateTime}>
                        <Text style={styles.compactEventDateText}>
                          {formatEventDate(featuredLiveEvent.event_date)}
                        </Text>
                        <Text style={styles.compactEventDivider}>•</Text>
                        <Text style={styles.compactEventTimeText}>
                          {formatTo12Hour(featuredLiveEvent.event_hour)}
                        </Text>
                        {featuredLiveEvent.time_zone && (
                          <>
                            <Text style={styles.compactEventDivider}>•</Text>
                            <Text style={styles.compactEventTimezoneText}>
                              {featuredLiveEvent.time_zone}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                  <View style={styles.compactEventRight}>
                    {registeringEventId === featuredLiveEvent.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <View style={[
                        styles.compactEventButton,
                        isRegisteredForEvent && styles.compactEventButtonActive
                      ]}>
                        <Text style={styles.compactEventButtonText}>
                          {isRegisteredForEvent ? 'Join Now' : 'Register'}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}

              {/* 21-DAY CHALLENGE CARD - WITH VISUAL EMPHASIS */}
              {showChallenge && (
                <ImportantCardPressable onPress={() => router.push('/(tabs)/challenge-list')}>
                  <View style={[styles.darkCard, styles.importantCard]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardHeaderLeft}>
                        <View style={styles.pendingDot} />
                        <Text style={styles.pendingText}>
                          {challengeProgress 
                            ? `${challengeProgress.totalDays - challengeProgress.completedDays} PENDING TASKS`
                            : 'LOADING...'}
                        </Text>
                      </View>
                      <View style={styles.circularProgress}>
                        <AnimatedNumber 
                          value={challengePercentage} 
                          style={styles.circularProgressText}
                          decimals={0}
                          suffix="%"
                          formatNumber={false}
                          delay={300}
                          duration={800}
                        />
                      </View>
                    </View>

                    <Text style={styles.cardTitle}>21-Day Challenge</Text>

                    {/* Challenge Days */}
                    {challengeProgress && (
                      <View style={styles.challengeDays}>
                        {[...Array(4)].map((_, i) => {
                          const dayNum = challengeProgress.currentDay - 1 + i;
                          const isCompleted = dayNum < challengeProgress.currentDay;
                          const isCurrent = dayNum === challengeProgress.currentDay;
                          const isLocked = dayNum > challengeProgress.currentDay;

                          return (
                            <View key={i} style={styles.challengeDay}>
                              <View style={[
                                styles.challengeDayCircle,
                                isCompleted && styles.challengeDayCompleted,
                                isCurrent && styles.challengeDayActive,
                                isLocked && styles.challengeDayLocked,
                              ]}>
                                {isCompleted ? (
                                  <IconSymbol 
                                    ios_icon_name="checkmark" 
                                    android_material_icon_name="check" 
                                    size={20} 
                                    color="#FFFFFF" 
                                  />
                                ) : (
                                  <Text style={styles.challengeDayNumber}>{dayNum}</Text>
                                )}
                              </View>
                              <Text style={isLocked ? styles.challengeDayLabelLocked : styles.challengeDayLabel}>
                                Day {dayNum}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {/* Continue Button */}
                    <TouchableOpacity 
                      style={styles.continueButton}
                      onPress={() => router.push('/(tabs)/challenge-list')}
                    >
                      <Text style={styles.continueButtonText}>Continue Today&apos;s Task</Text>
                      <IconSymbol 
                        ios_icon_name="arrow.right" 
                        android_material_icon_name="arrow-forward" 
                        size={18} 
                        color="#FFFFFF" 
                      />
                    </TouchableOpacity>
                  </View>
                </ImportantCardPressable>
              )}

              {/* ACADEMY CARD - WITH VISUAL EMPHASIS - REPOSITIONED ABOVE TOP 3 */}
              {showAcademy && (
                <ImportantCardPressable onPress={() => router.push('/(tabs)/academy')}>
                  <View style={[styles.darkCard, styles.importantCard]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardHeaderLeft}>
                        <Text style={styles.cardTitle}>Academy</Text>
                      </View>
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredBadgeText}>REQUIRED</Text>
                      </View>
                    </View>

                    <View style={styles.academyContent}>
                      <View style={styles.academyLeft}>
                        <Text style={styles.academyProgressLabel}>Video Progress</Text>
                        <View style={styles.academyProgressValueRow}>
                          <AnimatedNumber 
                            value={educationProgress} 
                            style={styles.academyProgressValue}
                            formatNumber={false}
                            delay={400}
                            duration={800}
                          />
                          <Text style={styles.academyProgressValue}>/{totalCourseVideos}</Text>
                        </View>
                        
                        <AnimatedProgressBar
                          percentage={(educationProgress / totalCourseVideos) * 100}
                          height={6}
                          containerStyle={{ marginBottom: 12 }}
                          delay={500}
                          duration={1000}
                        />

                        <View style={styles.quizStatus}>
                          {educationProgress < totalCourseVideos ? (
                            <>
                              <IconSymbol 
                                ios_icon_name="lock.fill" 
                                android_material_icon_name="lock" 
                                size={14} 
                                color="#A0A0A0" 
                              />
                              <Text style={styles.quizStatusText}>Quiz: Locked</Text>
                            </>
                          ) : (
                            <>
                              <IconSymbol 
                                ios_icon_name="checkmark.circle.fill" 
                                android_material_icon_name="check-circle" 
                                size={14} 
                                color="#10B981" 
                              />
                              <Text style={styles.quizStatusText}>Quiz: Unlocked</Text>
                            </>
                          )}
                        </View>

                        <TouchableOpacity>
                          <Text style={styles.continueLink}>Continue learning</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.academyRight}>
                        <View style={styles.videoThumbnail}>
                          <View style={styles.playIconContainer}>
                            <IconSymbol 
                              ios_icon_name="play.fill" 
                              android_material_icon_name="play-arrow" 
                              size={32} 
                              color="#FFFFFF" 
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                </ImportantCardPressable>
              )}

              {/* TOP 3 IN THE NETWORK */}
              <View style={styles.darkCard}>
                <Text style={styles.cardTitle}>Top 3 in the Network</Text>
                <Text style={styles.topCreatorsSubtitle}>Leading creators by monthly diamonds</Text>
                
                {topCreators.length > 0 ? (
                  <>
                    {topCreators.map((topCreator, index) => (
                      <TouchableOpacity 
                        key={index} 
                        style={styles.topCreatorRow}
                        onPress={() => handleTopCreatorPress(topCreator.creator_handle)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.topCreatorRank}>
                          <Text style={styles.topCreatorRankText}>{index + 1}</Text>
                        </View>
                        <View style={styles.topCreatorAvatar}>
                          {topCreator.avatar_url || topCreator.profile_picture_url ? (
                            <Image
                              source={{ uri: topCreator.avatar_url || topCreator.profile_picture_url }}
                              style={styles.topCreatorAvatarImage}
                            />
                          ) : (
                            <View style={styles.topCreatorAvatarPlaceholder}>
                              <IconSymbol
                                ios_icon_name="person.fill"
                                android_material_icon_name="person"
                                size={20}
                                color="#A0A0A0"
                              />
                            </View>
                          )}
                        </View>
                        <View style={styles.topCreatorInfo}>
                          <Text style={styles.topCreatorHandle}>@{topCreator.creator_handle}</Text>
                          <Text style={styles.topCreatorDiamonds}>
                            {topCreator.diamonds_monthly.toLocaleString()} 💎
                          </Text>
                          <View style={styles.topCreatorRegionBadge}>
                            <Text style={styles.topCreatorRegionText}>
                              {topCreator.region || 'N/A'}
                            </Text>
                          </View>
                        </View>
                        <IconSymbol 
                          ios_icon_name="chevron.right" 
                          android_material_icon_name="chevron-right" 
                          size={20} 
                          color="#6642EF" 
                        />
                      </TouchableOpacity>
                    ))}

                    {/* YOUR RANK - PROMINENT SECTION - WITHOUT TOTAL CREATORS */}
                    {userRank && (
                      <View style={styles.yourRankContainer}>
                        <View style={styles.yourRankHeader}>
                          <IconSymbol 
                            ios_icon_name="trophy.fill" 
                            android_material_icon_name="emoji-events" 
                            size={24} 
                            color="#FFD700" 
                          />
                          <Text style={styles.yourRankTitle}>Your Rank</Text>
                        </View>
                        <View style={styles.yourRankContent}>
                          <View style={styles.yourRankNumberContainer}>
                            <Text style={styles.yourRankNumber}>#{userRank.rank}</Text>
                          </View>
                          <View style={styles.yourRankDivider} />
                          <View style={styles.yourRankStats}>
                            <Text style={styles.yourRankStatsLabel}>Monthly Diamonds</Text>
                            <Text style={styles.yourRankStatsValue}>
                              {creator.diamonds_monthly.toLocaleString()} 💎
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.yourRankFooter}>
                          Keep going! You&apos;re doing great! 🚀
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={styles.noDataText}>No data available</Text>
                )}
              </View>

              {/* MANAGER CARD - FROM SUPABASE */}
              <CardPressable onPress={handleManagerCardPress}>
                <View style={styles.darkCard}>
                  {manager ? (
                    <View style={styles.managerContent}>
                      <View style={styles.managerLeft}>
                        <Image
                          source={{ uri: managerProfileUrl }}
                          style={styles.managerAvatar}
                        />
                        <View style={styles.managerOnlineIndicator} />
                      </View>
                      <View style={styles.managerInfo}>
                        <Text style={styles.managerLabel}>ASSIGNED MANAGER</Text>
                        <Text style={styles.managerName}>
                          {manager.first_name} {manager.last_name}
                        </Text>
                        <Text style={styles.managerRole}>
                          {manager.role === 'manager' ? 'Creator Manager' : manager.role}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.viewManagerButton} 
                        onPress={handleManagerCardPress}
                      >
                        <IconSymbol 
                          ios_icon_name="person.circle.fill" 
                          android_material_icon_name="account-circle" 
                          size={20} 
                          color="#FFFFFF" 
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.noManagerContent}>
                      <Text style={styles.noManagerTitle}>My Manager</Text>
                      <Text style={styles.noManagerText}>No manager assigned yet</Text>
                      <TouchableOpacity style={styles.requestManagerButton}>
                        <Text style={styles.requestManagerButtonText}>Request Manager</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </CardPressable>

              {/* VS BATTLE CARD */}
              <CardPressable onPress={() => router.push('/(tabs)/battles')}>
                <View style={styles.darkCard}>
                  <View style={styles.battleHeader}>
                    <Text style={styles.battleTitle}>VS Battle</Text>
                    <TouchableOpacity style={styles.manageButton} onPress={() => router.push('/(tabs)/battles')}>
                      <Text style={styles.manageButtonText}>Manage</Text>
                    </TouchableOpacity>
                  </View>
                  {nextBattle ? (
                    <>
                      <Text style={styles.battleSubtitle}>Upcoming Battle</Text>
                      <View style={styles.battleContent}>
                        <View style={styles.battlePlayer}>
                          <Image
                            source={{ uri: profileImageUrl }}
                            style={styles.battleAvatar}
                          />
                          <Text style={styles.battlePlayerName}>You</Text>
                        </View>

                        <View style={styles.battleCenter}>
                          <Text style={styles.battleTimerLabel}>SCHEDULED</Text>
                          <Text style={styles.battleTimer}>
                            {new Date(nextBattle.battle_date).toLocaleDateString()}
                          </Text>
                          <Text style={styles.battleDate}>
                            {new Date(nextBattle.battle_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>

                        <View style={styles.battlePlayer}>
                          <View style={styles.battleAvatarContainer}>
                            <Image
                              source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop' }}
                              style={styles.battleAvatar}
                            />
                          </View>
                          <Text style={styles.battlePlayerName}>
                            {nextBattle.creator_2_handle || 'Opponent'}
                          </Text>
                        </View>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.battleSubtitle}>No upcoming battles. Book one now!</Text>
                  )}
                </View>
              </CardPressable>

              {/* CREATOR TOOLS SECTION */}
              <View style={styles.darkCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardEmoji}>🛠️</Text>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.cardTitleLarge}>Creator Tools</Text>
                    <Text style={styles.cardSubtitle}>Grow your presence</Text>
                  </View>
                </View>
                <View style={styles.toolsGrid}>
                  <TouchableOpacity 
                    style={styles.toolButton}
                    onPress={() => {
                      console.log('Promote Myself tapped');
                      // TODO: Navigate to Promote screen
                    }}
                  >
                    <View style={styles.toolIconContainer}>
                      <IconSymbol 
                        ios_icon_name="megaphone.fill" 
                        android_material_icon_name="campaign" 
                        size={24} 
                        color="#6642EF" 
                      />
                    </View>
                    <Text style={styles.toolButtonText}>Promote Myself</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.toolButton}
                    onPress={() => router.push('/(tabs)/battles')}
                  >
                    <View style={styles.toolIconContainer}>
                      <IconSymbol 
                        ios_icon_name="flame.fill" 
                        android_material_icon_name="whatshot" 
                        size={24} 
                        color="#F59E0B" 
                      />
                    </View>
                    <Text style={styles.toolButtonText}>Battles</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.toolButton}
                    onPress={() => router.push('/(tabs)/ai-flyers')}
                  >
                    <View style={styles.toolIconContainer}>
                      <IconSymbol 
                        ios_icon_name="wand.and.stars" 
                        android_material_icon_name="auto-awesome" 
                        size={24} 
                        color="#6642EF" 
                      />
                    </View>
                    <Text style={styles.toolButtonText}>Flyer AI</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* AI FLYER CARD */}
              <CardPressable onPress={() => router.push('/(tabs)/ai-flyers')}>
                <View style={styles.darkCard}>
                  <View style={styles.flyerHeader}>
                    <View style={styles.flyerHeaderLeft}>
                      <IconSymbol 
                        ios_icon_name="wand.and.stars" 
                        android_material_icon_name="auto-awesome" 
                        size={28} 
                        color="#6642EF" 
                      />
                      <View>
                        <Text style={styles.flyerTitle}>AI Flyer Creator</Text>
                        <Text style={styles.flyerSubtitle}>Create stunning promotional flyers</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.flyerFeatures}>
                    <View style={styles.flyerFeature}>
                      <IconSymbol 
                        ios_icon_name="sparkles" 
                        android_material_icon_name="auto-awesome" 
                        size={16} 
                        color="#A0A0A0" 
                      />
                      <Text style={styles.flyerFeatureText}>AI-Powered Design</Text>
                    </View>
                    <View style={styles.flyerFeature}>
                      <IconSymbol 
                        ios_icon_name="photo" 
                        android_material_icon_name="image" 
                        size={16} 
                        color="#A0A0A0" 
                      />
                      <Text style={styles.flyerFeatureText}>Multiple Templates</Text>
                    </View>
                    <View style={styles.flyerFeature}>
                      <IconSymbol 
                        ios_icon_name="square.and.arrow.up" 
                        android_material_icon_name="share" 
                        size={16} 
                        color="#A0A0A0" 
                      />
                      <Text style={styles.flyerFeatureText}>Easy Sharing</Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.createFlyerButton}>
                    <Text style={styles.createFlyerButtonText}>Create Flyer</Text>
                    <IconSymbol 
                      ios_icon_name="arrow.right" 
                      android_material_icon_name="arrow-forward" 
                      size={18} 
                      color="#FFFFFF" 
                    />
                  </TouchableOpacity>
                </View>
              </CardPressable>

              {/* Bottom Spacing */}
              <View style={{ height: 40 }} />
            </View>
            {/* ========== END REST OF HOME CONTENT ========== */}
          </Animated.View>
        </ScrollView>

        {/* Chat Drawer */}
        <ChatDrawer visible={chatDrawerVisible} onClose={() => setChatDrawerVisible(false)} />
      </View>
    </>
  );
}

function CardPressable({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 50,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

// Important Card with subtle visual emphasis (elevation + micro-animation)
function ImportantCardPressable({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Subtle pulse animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.01,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 50,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View style={{ transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }] }}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: '#A0A0A0',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: '#EF4444',
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  retryButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  retryButtonFlat: {
    backgroundColor: '#6642EF',
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 70,
    paddingHorizontal: 16,
    paddingBottom: 120,
  },

  // HEADER STYLES
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
    paddingTop: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  profileContainer: {
    position: 'relative',
    marginRight: 14,
  },
  headerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#6642EF',
  },
  notificationBellOverlay: {
    position: 'absolute',
    top: -4,
    right: -4,
    zIndex: 10,
  },
  notificationBellBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6642EF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0F0F0F',
    position: 'relative',
  },
  notificationRedDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#6642EF',
  },
  headerInfo: {
    flex: 1,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  headerGreeting: {
    fontSize: 24,
    fontFamily: 'Poppins_400Regular',
    color: '#FFFFFF',
  },
  headerName: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  goldCheckmark: {
    marginLeft: 6,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  headerBadge: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: '#FFFFFF',
  },
  headerRegions: {
    flexDirection: 'row',
    gap: 6,
  },
  regionBadge: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  regionBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: '#A0A0A0',
  },
  managerBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  managerBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: '#FFFFFF',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6642EF',
  },

  // ========== HERO MODULE (SELF-CONTAINED) ==========
  heroModule: {
    marginBottom: 24,
  },
  rotatingCardsContainer: {
    position: 'relative',
    height: 440,
  },
  backCard: {
    position: 'absolute',
    top: 280,
    left: '5%',
    right: '5%',
    zIndex: 1,
  },
  frontCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    height: 380,
  },

  // ========== REST OF HOME CONTENT (SEPARATE SECTION) ==========
  // Moved up by 20px: 180 -> 160
  restOfHomeContent: {
    marginTop: 160,
  },
  diamondsBonusButton: {
    backgroundColor: '#6642EF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  diamondsBonusButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },

  // COMPACT LIVE EVENT CARD - SMALL VERSION
  compactLiveEventCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#FF3B5C',
    boxShadow: '0px 4px 12px rgba(255, 59, 92, 0.2)',
    elevation: 4,
  },
  compactEventLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  compactEventIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 59, 92, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactEventInfo: {
    flex: 1,
  },
  compactEventTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  compactEventDateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  compactEventDateText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#CCCCCC',
  },
  compactEventDivider: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#666666',
  },
  compactEventTimeText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#FFFFFF',
  },
  compactEventTimezoneText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#999999',
  },
  compactEventRight: {
    marginLeft: 12,
  },
  compactEventButton: {
    backgroundColor: '#555555',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 90,
    alignItems: 'center',
  },
  compactEventButtonActive: {
    backgroundColor: '#6642EF',
  },
  compactEventButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },

  // DARK CARD STYLES
  darkCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  // IMPORTANT CARD - VISUAL EMPHASIS (ENHANCED)
  importantCard: {
    borderWidth: 2,
    borderColor: 'rgba(102, 66, 239, 0.5)',
    boxShadow: '0px 10px 30px rgba(102, 66, 239, 0.3)',
    elevation: 10,
    backgroundColor: '#1F1F1F',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6642EF',
  },
  pendingText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: '#A0A0A0',
    letterSpacing: 0.5,
  },
  circularProgress: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#6642EF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 66, 239, 0.1)',
  },
  circularProgressText: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: '#6642EF',
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitleLarge: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#A0A0A0',
  },

  // 21-DAY CHALLENGE
  challengeDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  challengeDay: {
    alignItems: 'center',
  },
  challengeDayCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  challengeDayCompleted: {
    backgroundColor: '#6642EF',
  },
  challengeDayActive: {
    backgroundColor: '#6642EF',
    borderWidth: 3,
    borderColor: 'rgba(102, 66, 239, 0.3)',
  },
  challengeDayLocked: {
    backgroundColor: '#2A2A2A',
  },
  challengeDayNumber: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  challengeDayLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#FFFFFF',
  },
  challengeDayLabelLocked: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#707070',
  },
  continueButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  continueButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },

  // TOP 3 IN THE NETWORK
  topCreatorsSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#A0A0A0',
    marginBottom: 20,
  },
  topCreatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  topCreatorRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6642EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topCreatorRankText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  topCreatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  topCreatorAvatarImage: {
    width: '100%',
    height: '100%',
  },
  topCreatorAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topCreatorInfo: {
    flex: 1,
  },
  topCreatorHandle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  topCreatorDiamonds: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#A0A0A0',
    marginBottom: 4,
  },
  topCreatorRegionBadge: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  topCreatorRegionText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: '#6642EF',
  },
  noDataText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#A0A0A0',
    textAlign: 'center',
    paddingVertical: 20,
  },

  // YOUR RANK - PROMINENT SECTION - WITHOUT TOTAL CREATORS
  yourRankContainer: {
    marginTop: 24,
    padding: 20,
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#6642EF',
  },
  yourRankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  yourRankTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  yourRankContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  yourRankNumberContainer: {
    flex: 1,
    alignItems: 'center',
  },
  yourRankNumber: {
    fontSize: 48,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#6642EF',
    lineHeight: 52,
  },
  yourRankDivider: {
    width: 2,
    height: 60,
    backgroundColor: '#3A3A3A',
    marginHorizontal: 20,
  },
  yourRankStats: {
    flex: 1,
    justifyContent: 'center',
  },
  yourRankStatsLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#A0A0A0',
    marginBottom: 4,
  },
  yourRankStatsValue: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  yourRankFooter: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#A0A0A0',
    textAlign: 'center',
  },

  // ACADEMY CARD
  requiredBadge: {
    backgroundColor: '#6642EF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  requiredBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  academyContent: {
    flexDirection: 'row',
    gap: 16,
  },
  academyLeft: {
    flex: 1,
  },
  academyProgressLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#A0A0A0',
    marginBottom: 4,
  },
  academyProgressValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  academyProgressValue: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  quizStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  quizStatusText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#A0A0A0',
  },
  continueLink: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: '#6642EF',
  },
  academyRight: {
    width: 100,
    height: 100,
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // MANAGER CARD
  managerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  managerLeft: {
    position: 'relative',
    marginRight: 12,
  },
  managerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  managerOnlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  managerInfo: {
    flex: 1,
  },
  managerLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: '#A0A0A0',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  managerName: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  managerRole: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#A0A0A0',
  },
  viewManagerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noManagerContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  noManagerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  noManagerText: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: '#A0A0A0',
    textAlign: 'center',
    marginBottom: 16,
  },
  requestManagerButton: {
    backgroundColor: '#6642EF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  requestManagerButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },

  // VS BATTLE CARD
  battleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  battleTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  manageButton: {
    backgroundColor: '#6642EF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  manageButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  battleSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#A0A0A0',
    marginBottom: 20,
  },
  battleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  battlePlayer: {
    alignItems: 'center',
    flex: 1,
  },
  battleAvatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  battleAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
  },
  battlePlayerName: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  battleCenter: {
    alignItems: 'center',
    flex: 1,
  },
  battleTimerLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: '#A0A0A0',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  battleTimer: {
    fontSize: 18,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 4,
    textAlign: 'center',
  },
  battleDate: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: '#A0A0A0',
    letterSpacing: 0.5,
  },

  // TOOLS GRID
  toolsGrid: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 16,
    flexWrap: 'wrap',
  },
  toolButton: {
    alignItems: 'center',
    width: 100,
  },
  toolIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  toolButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // AI FLYER CARD
  flyerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  flyerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  flyerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  flyerSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#A0A0A0',
  },
  flyerFeatures: {
    gap: 12,
    marginBottom: 20,
  },
  flyerFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flyerFeatureText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#A0A0A0',
  },
  createFlyerButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  createFlyerButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
});
