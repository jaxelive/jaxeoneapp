
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
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import { HeaderRightButton, HeaderLeftButton } from "@/components/HeaderButtons";
import { useCreatorData } from "@/hooks/useCreatorData";
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';
import { supabase } from "@/app/integrations/supabase/client";
import { RotatingCard } from "@/components/RotatingCard";

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });
  
  const { creator, loading, error, stats, refetch } = useCreatorData('avelezsanti');
  const [nextBattle, setNextBattle] = useState<any>(null);
  const [challengeProgress, setChallengeProgress] = useState(7);
  const [educationProgress, setEducationProgress] = useState(3);
  const [bonusForecast, setBonusForecast] = useState(175);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

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
      fetchLearningData();
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
      }
    } catch (error: any) {
      console.error('[HomeScreen] Unexpected error fetching battle data:', error);
    }
  };

  const fetchLearningData = async () => {
    if (!creator) return;

    try {
      const { data: challengeData, error: challengeError } = await supabase
        .from('learning_challenge_progress')
        .select('*')
        .eq('creator_id', creator.id)
        .eq('is_completed', true);

      if (challengeError) {
        console.error('[HomeScreen] Error fetching challenge data:', challengeError);
      } else {
        const completedDays = challengeData?.length || 0;
        console.log('[HomeScreen] Challenge progress:', completedDays, '/21');
        setChallengeProgress(completedDays);
      }

      const { data: educationData, error: educationError } = await supabase
        .from('ur_education_progress')
        .select('*')
        .eq('creator_id', creator.id)
        .eq('quiz_passed', true);

      if (educationError) {
        console.error('[HomeScreen] Error fetching education data:', educationError);
      } else {
        const completedVideos = educationData?.length || 0;
        console.log('[HomeScreen] Education progress:', completedVideos, '/12');
        setEducationProgress(completedVideos);
      }
    } catch (error: any) {
      console.error('[HomeScreen] Unexpected error fetching learning data:', error);
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

  if (error || !creator || !stats) {
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
            <LinearGradient
              colors={colors.gradientPurple}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.retryButtonGradient}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const fullName = `${creator.first_name} ${creator.last_name}`.trim() || creator.creator_handle;
  const profileImageUrl = creator.avatar_url || creator.profile_picture_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop';
  const region = creator.region || 'USA';
  const creatorType = creator.creator_type?.[0] || 'Creator';

  // Calculate requirements progress
  const liveDaysProgress = Math.min((stats.liveDays / 5) * 100, 100);
  const liveHoursProgress = Math.min((stats.liveHours / 10) * 100, 100);
  const battlesProgress = 100; // Assuming 1/1 battles completed
  const overallRequirements = Math.round((liveDaysProgress + liveHoursProgress + battlesProgress) / 3);

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
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* HEADER */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Image
                  source={{ uri: profileImageUrl }}
                  style={styles.headerAvatar}
                />
                <View style={styles.headerInfo}>
                  <Text style={styles.headerGreeting}>Welcome back,</Text>
                  <View style={styles.headerNameRow}>
                    <Text style={styles.headerName}>{fullName} </Text>
                    <Text style={styles.headerEmoji}>⭐ </Text>
                    <View style={styles.goldBadge}>
                      <Text style={styles.goldBadgeText}>GOLD</Text>
                    </View>
                  </View>
                  <View style={styles.headerBadges}>
                    <View style={styles.headerBadge}>
                      <Text style={styles.headerBadgeText}>Live / Shop</Text>
                    </View>
                    <View style={styles.headerBadge}>
                      <Text style={styles.headerBadgeText}>{creatorType}</Text>
                    </View>
                  </View>
                  <View style={styles.headerRegions}>
                    <View style={styles.regionBadge}>
                      <Text style={styles.regionBadgeText}>{region}</Text>
                    </View>
                    <View style={styles.regionBadge}>
                      <Text style={styles.regionBadgeText}>Canada</Text>
                    </View>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.headerIconButton}>
                <IconSymbol 
                  ios_icon_name="message.fill" 
                  android_material_icon_name="chat-bubble" 
                  size={24} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
            </View>

            {/* ROTATING CARDS SECTION */}
            <View style={styles.rotatingCardsContainer}>
              {/* Back Card (Faded) */}
              <View style={styles.backCard}>
                <RotatingCard
                  type="diamonds"
                  isFaded={true}
                  onPress={() => console.log('Diamonds card tapped')}
                  data={{
                    diamondsEarned: 15000,
                    totalGoal: 200000,
                    remaining: 185000,
                    nextTier: 'Silver',
                  }}
                />
              </View>

              {/* Front Card */}
              <View style={styles.frontCard}>
                <RotatingCard
                  type="bonus"
                  onPress={() => console.log('Bonus card tapped')}
                  data={{
                    bonusAmount: 100,
                    nextBonus: 175,
                    liveDays: stats.liveDays,
                    liveHours: stats.liveHours,
                    battlesBooked: 1,
                  }}
                />
              </View>
            </View>

            {/* 21-DAY CHALLENGE CARD */}
            <CardPressable onPress={() => router.push('/(tabs)/missions')}>
              <View style={styles.darkCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={styles.pendingDot} />
                    <Text style={styles.pendingText}>2 PENDING TASKS</Text>
                  </View>
                  <View style={styles.circularProgress}>
                    <Text style={styles.circularProgressText}>25%</Text>
                  </View>
                </View>

                <Text style={styles.cardTitle}>21-Day Challenge</Text>

                {/* Challenge Days */}
                <View style={styles.challengeDays}>
                  <View style={styles.challengeDay}>
                    <View style={[styles.challengeDayCircle, styles.challengeDayCompleted]}>
                      <IconSymbol 
                        ios_icon_name="checkmark" 
                        android_material_icon_name="check" 
                        size={20} 
                        color="#FFFFFF" 
                      />
                    </View>
                    <Text style={styles.challengeDayLabel}>Day 4</Text>
                  </View>
                  <View style={styles.challengeDay}>
                    <View style={[styles.challengeDayCircle, styles.challengeDayActive]}>
                      <Text style={styles.challengeDayNumber}>5</Text>
                    </View>
                    <Text style={styles.challengeDayLabel}>Day 5</Text>
                  </View>
                  <View style={styles.challengeDay}>
                    <View style={[styles.challengeDayCircle, styles.challengeDayLocked]}>
                      <Text style={styles.challengeDayNumber}>6</Text>
                    </View>
                    <Text style={styles.challengeDayLabelLocked}>Day 6</Text>
                  </View>
                  <View style={styles.challengeDay}>
                    <View style={[styles.challengeDayCircle, styles.challengeDayLocked]}>
                      <Text style={styles.challengeDayNumber}>7</Text>
                    </View>
                    <Text style={styles.challengeDayLabelLocked}>Day 7</Text>
                  </View>
                </View>

                {/* Continue Button */}
                <TouchableOpacity style={styles.continueButton}>
                  <Text style={styles.continueButtonText}>Continue Today&apos;s Task</Text>
                  <IconSymbol 
                    ios_icon_name="arrow.right" 
                    android_material_icon_name="arrow-forward" 
                    size={18} 
                    color="#1A1A1A" 
                  />
                </TouchableOpacity>
              </View>
            </CardPressable>

            {/* ACADEMY CARD */}
            <CardPressable onPress={() => router.push('/(tabs)/learning-hub')}>
              <View style={styles.darkCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderLeft}>
                    <IconSymbol 
                      ios_icon_name="graduationcap.fill" 
                      android_material_icon_name="school" 
                      size={24} 
                      color="#FFFFFF" 
                    />
                    <Text style={styles.cardTitle}>Academy</Text>
                  </View>
                  <View style={styles.requiredBadge}>
                    <Text style={styles.requiredBadgeText}>REQUIRED</Text>
                  </View>
                </View>

                <View style={styles.academyContent}>
                  <View style={styles.academyLeft}>
                    <Text style={styles.academyProgressLabel}>Video Progress</Text>
                    <Text style={styles.academyProgressValue}>{educationProgress}/12</Text>
                    
                    <View style={styles.academyProgressBar}>
                      <View style={[styles.academyProgressFill, { width: `${(educationProgress / 12) * 100}%` }]} />
                    </View>

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

            {/* ASSIGNED MANAGER CARD */}
            <CardPressable onPress={() => console.log('Manager tapped')}>
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
                    <Text style={styles.managerName}>Michael Chen</Text>
                  </View>
                  <TouchableOpacity style={styles.emailButton}>
                    <IconSymbol 
                      ios_icon_name="envelope.fill" 
                      android_material_icon_name="email" 
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
                  <View style={styles.battlePointsContainer}>
                    <IconSymbol 
                      ios_icon_name="trophy.fill" 
                      android_material_icon_name="emoji-events" 
                      size={16} 
                      color="#8B5CF6" 
                    />
                    <Text style={styles.battlePoints}>7,390</Text>
                  </View>
                </View>
                <Text style={styles.battleSubtitle}>Monetto Airlines</Text>

                <View style={styles.battleContent}>
                  {/* Left - You */}
                  <View style={styles.battlePlayer}>
                    <Image
                      source={{ uri: profileImageUrl }}
                      style={styles.battleAvatar}
                    />
                    <Text style={styles.battlePlayerName}>You</Text>
                  </View>

                  {/* Center - Timer */}
                  <View style={styles.battleCenter}>
                    <Text style={styles.battleTimerLabel}>ENDS IN</Text>
                    <Text style={styles.battleTimer}>14:02:10</Text>
                    <Text style={styles.battleDate}>TOMORROW</Text>
                  </View>

                  {/* Right - Opponent */}
                  <View style={styles.battlePlayer}>
                    <View style={styles.battleAvatarContainer}>
                      <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop' }}
                        style={styles.battleAvatar}
                      />
                      <View style={styles.proBadge}>
                        <Text style={styles.proBadgeText}>PRO</Text>
                      </View>
                    </View>
                    <Text style={styles.battlePlayerName}>@AlexD</Text>
                    <Text style={styles.battlePlayerStats}>••••• 1001</Text>
                  </View>
                </View>
              </View>
            </CardPressable>

            {/* Bottom Spacing */}
            <View style={{ height: 40 }} />
          </Animated.View>
        </ScrollView>
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
  retryButtonGradient: {
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
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 120,
  },

  // HEADER STYLES
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  headerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    borderWidth: 3,
    borderColor: '#8B5CF6',
  },
  headerInfo: {
    flex: 1,
  },
  headerGreeting: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerName: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  headerEmoji: {
    fontSize: 18,
  },
  goldBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  goldBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
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
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ROTATING CARDS CONTAINER
  rotatingCardsContainer: {
    position: 'relative',
    marginBottom: 16,
    height: 520,
  },
  backCard: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  frontCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
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
    backgroundColor: '#8B5CF6',
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
    borderColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  circularProgressText: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: '#8B5CF6',
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
    backgroundColor: '#8B5CF6',
  },
  challengeDayActive: {
    backgroundColor: '#8B5CF6',
    borderWidth: 3,
    borderColor: 'rgba(139, 92, 246, 0.3)',
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

  // ACADEMY CARD
  requiredBadge: {
    backgroundColor: '#8B5CF6',
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
  academyProgressValue: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  academyProgressBar: {
    height: 6,
    backgroundColor: '#2A2A2A',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  academyProgressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 6,
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
    color: '#8B5CF6',
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
  },
  emailButton: {
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
  battlePointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  battlePoints: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: '#8B5CF6',
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
  proBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  proBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  battlePlayerName: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  battlePlayerStats: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: '#707070',
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
    fontSize: 24,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 4,
  },
  battleDate: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: '#A0A0A0',
    letterSpacing: 0.5,
  },
});
