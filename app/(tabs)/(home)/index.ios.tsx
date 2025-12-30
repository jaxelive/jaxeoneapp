
import React, { useRef, useEffect } from "react";
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
import { AnimatedCard } from "@/components/AnimatedCard";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';

const { width } = Dimensions.get('window');

// Hardcoded creator handle - no authentication needed
const CREATOR_HANDLE = 'avelezsanti';

export default function HomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  
  const { creator, loading, error, stats, refetch } = useCreatorData(CREATOR_HANDLE);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const headerScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.96],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.85],
    extrapolate: 'clamp',
  });

  if (loading || !fontsLoaded) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "JAXE Creator",
            headerRight: () => <HeaderRightButton />,
            headerLeft: () => <HeaderLeftButton />,
            headerLargeTitle: false,
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
            title: "JAXE Creator",
            headerRight: () => <HeaderRightButton />,
            headerLeft: () => <HeaderLeftButton />,
            headerLargeTitle: false,
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
  
  // Get creator types from database, default to ['Creator'] if not set
  const creatorTypes = creator.creator_type && creator.creator_type.length > 0 
    ? creator.creator_type 
    : ['Creator'];
  
  const region = creator.region || 'USA / Canada';

  // Check if user is a manager
  const isManager = creator.user_role === 'manager';

  // Format creator types for display
  const creatorTypeDisplay = creatorTypes.join(' / ');

  return (
    <>
      <Stack.Screen
        options={{
          title: "JAXE Creator",
          headerRight: () => <HeaderRightButton />,
          headerLeft: () => <HeaderLeftButton />,
          headerLargeTitle: false,
        }}
      />
      <View style={styles.container}>
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          <Animated.View 
            style={[
              styles.welcomeSection,
              {
                opacity: headerOpacity,
                transform: [{ scale: headerScale }],
              }
            ]}
          >
            <View style={styles.profileRow}>
              <View style={styles.profilePhotoContainer}>
                <LinearGradient
                  colors={colors.gradientPurple}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.profilePhotoGradient}
                >
                  <Image
                    source={{ uri: profileImageUrl }}
                    style={styles.profilePhoto}
                  />
                </LinearGradient>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.welcomeGreeting}>Hey there! 👋</Text>
                <Text style={styles.welcomeTitle}>{fullName}</Text>
                <Text style={styles.welcomeSubtitle}>Lifestyle & Vibes • {creatorTypeDisplay} Creator</Text>
                <Text style={styles.tiktokHandle}>@{creator.creator_handle}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{region}</Text>
                  </View>
                  {creatorTypes.map((type, index) => (
                    <LinearGradient
                      key={index}
                      colors={colors.gradientPurple}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.liveBadge}
                    >
                      <Text style={styles.liveBadgeText}>{type}</Text>
                    </LinearGradient>
                  ))}
                  {isManager && (
                    <View style={styles.managerBadge}>
                      <Text style={styles.managerBadgeText}>Manager</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </Animated.View>

          <AnimatedCard delay={100} animationType="fadeSlide">
            <CardPressable onPress={() => console.log('Monthly Diamonds tapped')}>
              <LinearGradient
                colors={['#FFFFFF', '#FAF5FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.card, styles.heroCard]}
              >
                <View style={styles.heroContent}>
                  <LinearGradient
                    colors={colors.gradientPurple}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.progressRing}
                  >
                    <View style={styles.progressRingInner}>
                      <AnimatedNumber 
                        value={stats.monthlyDiamonds}
                        style={styles.diamondNumber}
                        delay={200}
                        duration={1000}
                      />
                      <Text style={styles.diamondLabel}>💎</Text>
                    </View>
                  </LinearGradient>
                  <Text style={styles.cardTitle}>Monthly Diamonds</Text>
                  <Text style={styles.cardSubtext}>Resets every 1st of the month</Text>
                </View>
              </LinearGradient>
            </CardPressable>
          </AnimatedCard>

          <AnimatedCard delay={200} animationType="fadeSlide">
            <CardPressable onPress={() => console.log('Next Graduation tapped')}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardEmoji}>🎯</Text>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.cardTitleLarge}>Next Graduation</Text>
                    <Text style={styles.cardSubtitle}>{stats.nextTarget} Level</Text>
                  </View>
                </View>
                <View style={styles.progressBarContainer}>
                  <LinearGradient
                    colors={colors.gradientPurple}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressBarFill, { width: `${Math.min(stats.currentProgress, 100)}%` }]}
                  />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressLabel}>{stats.currentProgress}% Complete</Text>
                  <Text style={styles.progressLabelBold}>{(stats.remaining / 1000).toFixed(0)}k to go</Text>
                </View>
                <View style={styles.milestoneInfo}>
                  <View style={styles.milestoneRow}>
                    <Text style={styles.milestoneText}>Current</Text>
                    <Text style={styles.milestoneValue}>{(stats.totalDiamonds / 1000).toFixed(0)}k 💎</Text>
                  </View>
                  <View style={styles.milestoneRow}>
                    <Text style={styles.milestoneText}>Target</Text>
                    <Text style={styles.milestoneValue}>{(stats.targetAmount / 1000).toFixed(0)}k 💎</Text>
                  </View>
                </View>
              </View>
            </CardPressable>
          </AnimatedCard>

          <AnimatedCard delay={300} animationType="fadeSlide">
            <CardPressable onPress={() => console.log('Missions tapped')}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardEmoji}>🚀</Text>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.cardTitleLarge}>Missions</Text>
                    <Text style={styles.cardSubtitle}>Keep the momentum going!</Text>
                  </View>
                </View>
                <View style={styles.missionsGrid}>
                  <View style={styles.missionColumn}>
                    <LinearGradient
                      colors={['#FEF3C7', '#FDE68A']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.missionIconContainer}
                    >
                      <Text style={styles.missionIcon}>🎓</Text>
                    </LinearGradient>
                    <Text style={styles.missionTitle}>Education</Text>
                    <Text style={styles.missionProgress}>2 of 5</Text>
                    <View style={styles.miniProgressBar}>
                      <LinearGradient
                        colors={colors.gradientSunset}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.miniProgressFill, { width: '40%' }]}
                      />
                    </View>
                  </View>
                  <View style={styles.missionColumn}>
                    <LinearGradient
                      colors={['#FEE2E2', '#FECACA']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.missionIconContainer}
                    >
                      <Text style={styles.missionIcon}>🔥</Text>
                    </LinearGradient>
                    <Text style={styles.missionTitle}>Challenge</Text>
                    <Text style={styles.missionProgress}>7 of 21</Text>
                    <View style={styles.miniProgressBar}>
                      <LinearGradient
                        colors={colors.gradientPink}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.miniProgressFill, { width: '33%' }]}
                      />
                    </View>
                  </View>
                  <View style={styles.missionColumn}>
                    <LinearGradient
                      colors={['#D1FAE5', '#A7F3D0']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.missionIconContainer}
                    >
                      <Text style={styles.missionIcon}>💵</Text>
                    </LinearGradient>
                    <Text style={styles.missionTitle}>Bonus</Text>
                    <Text style={styles.bonusAmount}>$0.00</Text>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>Rising ↗</Text>
                    </View>
                  </View>
                </View>
              </View>
            </CardPressable>
          </AnimatedCard>

          <AnimatedCard delay={400} animationType="fadeSlide">
            <CardPressable onPress={() => console.log('LIVE Activity tapped')}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardEmoji}>📊</Text>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.cardTitleLarge}>Your Stats</Text>
                    <Text style={styles.cardSubtitle}>Last 30 days</Text>
                  </View>
                </View>
                <View style={styles.statsGrid}>
                  <LinearGradient
                    colors={['#DBEAFE', '#BFDBFE']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.statCapsule}
                  >
                    <AnimatedNumber 
                      value={stats.liveDays}
                      style={styles.statValue}
                      delay={500}
                      duration={800}
                    />
                    <Text style={styles.statLabel}>LIVE Days</Text>
                  </LinearGradient>
                  <LinearGradient
                    colors={['#E9D5FF', '#D8B4FE']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.statCapsule}
                  >
                    <AnimatedNumber 
                      value={stats.liveHours}
                      style={styles.statValue}
                      delay={550}
                      duration={800}
                    />
                    <Text style={styles.statLabel}>Hours</Text>
                  </LinearGradient>
                  <LinearGradient
                    colors={['#FED7AA', '#FDBA74']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.statCapsule}
                  >
                    <AnimatedNumber 
                      value={stats.diamondsToday}
                      style={styles.statValue}
                      delay={600}
                      duration={800}
                    />
                    <Text style={styles.statLabel}>Diamonds</Text>
                  </LinearGradient>
                  <LinearGradient
                    colors={['#FEE2E2', '#FECACA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.statCapsule}
                  >
                    <AnimatedNumber 
                      value={stats.streak}
                      style={styles.statValue}
                      delay={650}
                      duration={800}
                    />
                    <Text style={styles.statLabel}>Day Streak 🔥</Text>
                  </LinearGradient>
                </View>
              </View>
            </CardPressable>
          </AnimatedCard>

          <AnimatedCard delay={500} animationType="fadeSlide">
            <CardPressable onPress={() => console.log('Battles tapped')}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardEmoji}>⚔️</Text>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.cardTitleLarge}>Upcoming Battles</Text>
                    <Text style={styles.cardSubtitle}>Get ready to compete!</Text>
                  </View>
                </View>
                <View style={styles.battleItem}>
                  <View style={styles.battleLeft}>
                    <Text style={styles.battleDate}>Dec 15</Text>
                    <Text style={styles.battleTime}>6:00 PM</Text>
                  </View>
                  <View style={styles.battleRight}>
                    <Text style={styles.battleVS}>VS</Text>
                    <Text style={styles.battleOpponent}>@sarah_live</Text>
                  </View>
                </View>
                <View style={styles.battleItem}>
                  <View style={styles.battleLeft}>
                    <Text style={styles.battleDate}>Dec 18</Text>
                    <Text style={styles.battleTime}>8:30 PM</Text>
                  </View>
                  <View style={styles.battleRight}>
                    <Text style={styles.battleVS}>VS</Text>
                    <Text style={styles.battleOpponent}>@mike_streams</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.ctaButton}>
                  <LinearGradient
                    colors={colors.gradientPurple}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ctaButtonGradient}
                  >
                    <Text style={styles.ctaButtonText}>View All Battles</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </CardPressable>
          </AnimatedCard>

          {/* CREATOR TOOLS SECTION */}
          <AnimatedCard delay={600} animationType="fadeSlide">
            <CardPressable onPress={() => console.log('Tools tapped')}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardEmoji}>🛠️</Text>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.cardTitleLarge}>Creator Tools</Text>
                    <Text style={styles.cardSubtitle}>Grow your presence</Text>
                  </View>
                </View>
                <View style={styles.toolsGrid}>
                  <TouchableOpacity style={styles.toolButton}>
                    <LinearGradient
                      colors={['#DBEAFE', '#BFDBFE']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.toolIconContainer}
                    >
                      <IconSymbol 
                        ios_icon_name="megaphone.fill" 
                        android_material_icon_name="campaign" 
                        size={24} 
                        color={colors.primary} 
                      />
                    </LinearGradient>
                    <Text style={styles.toolButtonText}>Promote</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.toolButton}>
                    <LinearGradient
                      colors={['#FED7AA', '#FDBA74']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.toolIconContainer}
                    >
                      <IconSymbol 
                        ios_icon_name="flame.fill" 
                        android_material_icon_name="whatshot" 
                        size={24} 
                        color={colors.warning} 
                      />
                    </LinearGradient>
                    <Text style={styles.toolButtonText}>Battles</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.toolButton}>
                    <LinearGradient
                      colors={['#E9D5FF', '#D8B4FE']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.toolIconContainer}
                    >
                      <IconSymbol 
                        ios_icon_name="wand.and.stars" 
                        android_material_icon_name="auto-awesome" 
                        size={24} 
                        color={colors.primary} 
                      />
                    </LinearGradient>
                    <Text style={styles.toolButtonText}>Flyer AI</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </CardPressable>
          </AnimatedCard>

          <AnimatedCard delay={700} animationType="fadeSlide">
            <CardPressable onPress={() => console.log('Manager tapped')}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardEmoji}>👤</Text>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.cardTitleLarge}>My Manager</Text>
                    <Text style={styles.cardSubtitle}>Get personalized support</Text>
                  </View>
                </View>
                <Text style={styles.noManagerText}>
                  {creator.assigned_manager_id ? 'Manager assigned' : 'No manager assigned yet'}
                </Text>
                {!creator.assigned_manager_id && (
                  <TouchableOpacity style={styles.requestButton}>
                    <LinearGradient
                      colors={colors.gradientPurple}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.requestButtonGradient}
                    >
                      <Text style={styles.requestButtonText}>Request Manager</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </CardPressable>
          </AnimatedCard>
        </Animated.ScrollView>
      </View>
    </>
  );
}

function CardPressable({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
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
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  welcomeSection: {
    marginBottom: 28,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profilePhotoContainer: {
    marginRight: 16,
  },
  profilePhotoGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileInfo: {
    flex: 1,
    paddingTop: 4,
  },
  welcomeGreeting: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  welcomeTitle: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  tiktokHandle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: colors.grey,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.text,
  },
  liveBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  liveBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  managerBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  managerBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 28,
    padding: 24,
    marginBottom: 16,
    boxShadow: '0px 8px 32px rgba(139, 92, 246, 0.08)',
    elevation: 4,
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: 36,
    marginBottom: 20,
  },
  heroContent: {
    alignItems: 'center',
  },
  progressRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressRingInner: {
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  diamondNumber: {
    fontSize: 52,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
    letterSpacing: -1,
  },
  diamondLabel: {
    fontSize: 28,
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    marginBottom: 6,
  },
  cardSubtext: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
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
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: colors.grey,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 10,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
  },
  progressLabelBold: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
  milestoneInfo: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.grey,
    gap: 10,
  },
  milestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  milestoneText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  milestoneValue: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
  },
  missionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  missionColumn: {
    flex: 1,
    alignItems: 'center',
  },
  missionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  missionIcon: {
    fontSize: 28,
  },
  missionTitle: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  missionProgress: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  miniProgressBar: {
    width: '100%',
    height: 6,
    backgroundColor: colors.grey,
    borderRadius: 6,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 6,
  },
  bonusAmount: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 8,
  },
  statusPill: {
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  battleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.grey,
    borderRadius: 20,
    marginBottom: 12,
  },
  battleLeft: {
    flex: 1,
  },
  battleDate: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    marginBottom: 2,
  },
  battleTime: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
  },
  battleRight: {
    alignItems: 'flex-end',
  },
  battleVS: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textTertiary,
    marginBottom: 2,
  },
  battleOpponent: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
  },
  ctaButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCapsule: {
    flex: 1,
    minWidth: '46%',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  noManagerText: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  requestButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  requestButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  requestButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  toolsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  toolButton: {
    flex: 1,
    alignItems: 'center',
  },
  toolIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  toolButtonText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    textAlign: 'center',
  },
});
