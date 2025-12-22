
import React, { useRef, useEffect, useState } from "react";
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

const { width } = Dimensions.get('window');

// Tier calculation function
function getTierFromDiamonds(diamonds: number): string {
  if (diamonds >= 10000000) return "Diamond";
  if (diamonds >= 5000000) return "Platinum";
  if (diamonds >= 1000000) return "Gold";
  if (diamonds >= 500000) return "Silver";
  if (diamonds >= 100000) return "Bronze";
  return "Rookie";
}

function getNextTierInfo(diamonds: number): { tier: string; target: number } {
  if (diamonds < 100000) return { tier: "Bronze", target: 100000 };
  if (diamonds < 500000) return { tier: "Silver", target: 500000 };
  if (diamonds < 1000000) return { tier: "Gold", target: 1000000 };
  if (diamonds < 5000000) return { tier: "Platinum", target: 5000000 };
  if (diamonds < 10000000) return { tier: "Diamond", target: 10000000 };
  return { tier: "Max", target: 10000000 };
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
  
  const { creator, loading, error, refetch } = useCreatorData('avelezsanti');
  const [nextBattle, setNextBattle] = useState<any>(null);
  const [challengeProgress, setChallengeProgress] = useState<any>(null);
  const [educationProgress, setEducationProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [chatDrawerVisible, setChatDrawerVisible] = useState(false);

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
    setRefreshing(false);
  };

  useEffect(() => {
    if (creator) {
      console.log('[HomeScreen] Creator loaded:', {
        handle: creator.creator_handle,
        name: `${creator.first_name} ${creator.last_name}`,
        monthlyDiamonds: creator.diamonds_monthly,
        totalDiamonds: creator.total_diamonds,
        liveDays: creator.live_days_30d,
        liveHours: Math.floor(creator.live_duration_seconds_30d / 3600)
      });
      fetchBattleData();
      fetchChallengeData();
      fetchEducationData();
    }
  }, [creator]);

  const fetchBattleData = async () => {
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
  };

  const fetchChallengeData = async () => {
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
    } catch (error: any) {
      console.error('[HomeScreen] Unexpected error fetching challenge data:', error);
    }
  };

  const fetchEducationData = async () => {
    if (!creator) return;

    try {
      const { data: educationData, error: educationError } = await supabase
        .from('user_video_progress')
        .select('*')
        .eq('user_id', creator.id)
        .eq('completed', true);

      if (educationError && educationError.code !== 'PGRST116') {
        console.error('[HomeScreen] Error fetching education data:', educationError);
        return;
      }

      const completedVideos = educationData?.length || 0;
      console.log('[HomeScreen] Education progress:', completedVideos, '/5');
      setEducationProgress(completedVideos);
    } catch (error: any) {
      console.error('[HomeScreen] Unexpected error fetching education data:', error);
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
  const region = creator.region || 'Latin America';

  // Calculate tier and next tier from real data
  const currentDiamonds = creator.diamonds_monthly || 0;
  const currentTier = getTierFromDiamonds(currentDiamonds);
  const nextTierInfo = getNextTierInfo(currentDiamonds);
  const remaining = Math.max(0, nextTierInfo.target - currentDiamonds);
  const progress = nextTierInfo.target > 0 ? (currentDiamonds / nextTierInfo.target) * 100 : 0;

  // Calculate live stats
  const liveDays = creator.live_days_30d || 0;
  const liveHours = Math.floor((creator.live_duration_seconds_30d || 0) / 3600);

  // Calculate challenge progress percentage
  const challengePercentage = challengeProgress 
    ? (challengeProgress.completedDays / challengeProgress.totalDays) * 100 
    : 0;

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
                    </View>
                  </TouchableOpacity>
                </View>
                <View style={styles.headerInfo}>
                  <View style={styles.headerNameRow}>
                    <Text style={styles.headerGreeting}>Welcome back, </Text>
                    <Text style={styles.headerName}>{firstName}</Text>
                    <View style={styles.goldCheckmark}>
                      <IconSymbol 
                        ios_icon_name="checkmark.seal.fill" 
                        android_material_icon_name="verified" 
                        size={24} 
                        color="#FFD700" 
                      />
                    </View>
                  </View>
                  <View style={styles.headerBadges}>
                    <View style={styles.headerBadge}>
                      <Text style={styles.headerBadgeText}>Live / Shop</Text>
                    </View>
                  </View>
                  <View style={styles.headerRegions}>
                    <View style={styles.regionBadge}>
                      <Text style={styles.regionBadgeText}>{region}</Text>
                    </View>
                    <View style={styles.regionBadge}>
                      <Text style={styles.regionBadgeText}>{currentTier}</Text>
                    </View>
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

            {/* ROTATING CARDS SECTION */}
            <View style={styles.rotatingCardsContainer}>
              {activeCardIndex === 0 ? (
                <>
                  {/* Back Card (Faded) - Bonus Forecast */}
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
                        totalGoal: nextTierInfo.target,
                        remaining: remaining,
                        nextTier: nextTierInfo.tier,
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
                        totalGoal: nextTierInfo.target,
                        remaining: remaining,
                        nextTier: nextTierInfo.tier,
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

            {/* EXTRA SPACING TO SHOW BONUS CARD FULLY */}
            <View style={{ height: 40 }} />

            {/* 21-DAY CHALLENGE CARD */}
            <CardPressable onPress={() => router.push('/(tabs)/challenge-list')}>
              <View style={styles.darkCard}>
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

                {/* Start Challenge Button */}
                {challengeProgress && challengeProgress.completedDays === 0 && (
                  <TouchableOpacity 
                    style={styles.startChallengeButton}
                    onPress={() => router.push('/(tabs)/challenge-list')}
                  >
                    <Text style={styles.startChallengeButtonText}>Start Challenge</Text>
                  </TouchableOpacity>
                )}
              </View>
            </CardPressable>

            {/* ACADEMY CARD */}
            <CardPressable onPress={() => router.push('/(tabs)/academy')}>
              <View style={styles.darkCard}>
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
                      />
                      <Text style={styles.academyProgressValue}>/5</Text>
                    </View>
                    
                    <AnimatedProgressBar
                      percentage={(educationProgress / 5) * 100}
                      height={6}
                      containerStyle={{ marginBottom: 12 }}
                    />

                    <View style={styles.quizStatus}>
                      <IconSymbol 
                        ios_icon_name="lock.fill" 
                        android_material_icon_name="lock" 
                        size={14} 
                        color="#A0A0A0" 
                      />
                      <Text style={styles.quizStatusText}>Quiz: Not started</Text>
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
            </CardPressable>

            {/* MANAGER CARD - TEMPORARY DATA */}
            <CardPressable onPress={() => router.push('/(tabs)/manager-details')}>
              <View style={styles.darkCard}>
                <View style={styles.managerContent}>
                  <View style={styles.managerLeft}>
                    <Image
                      source={{ uri: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop' }}
                      style={styles.managerAvatar}
                    />
                    <View style={styles.managerOnlineIndicator} />
                  </View>
                  <View style={styles.managerInfo}>
                    <Text style={styles.managerLabel}>ASSIGNED MANAGER</Text>
                    <Text style={styles.managerName}>Ivan Martinez</Text>
                    <Text style={styles.managerRole}>Creator Manager</Text>
                  </View>
                  <TouchableOpacity style={styles.viewManagerButton} onPress={() => router.push('/(tabs)/manager-details')}>
                    <IconSymbol 
                      ios_icon_name="person.circle.fill" 
                      android_material_icon_name="account-circle" 
                      size={20} 
                      color="#FFFFFF" 
                    />
                  </TouchableOpacity>
                </View>
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

  // ROTATING CARDS CONTAINER - SMALLER CARDS
  rotatingCardsContainer: {
    position: 'relative',
    marginBottom: 16,
    height: 440,
  },
  backCard: {
    position: 'absolute',
    top: 180,
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

  // DARK CARD STYLES
  darkCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
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
    marginBottom: 12,
  },
  continueButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  startChallengeButton: {
    backgroundColor: '#6642EF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  startChallengeButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
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
