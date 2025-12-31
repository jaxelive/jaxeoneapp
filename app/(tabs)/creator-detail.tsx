
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
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { supabase } from '@/app/integrations/supabase/client';

// Graduation thresholds
const SILVER_THRESHOLD = 200000;
const GOLD_THRESHOLD = 500000;

// Manager payout amounts (in dollars)
const SILVER_PAYOUT = 100;
const GOLD_PAYOUT = 250;

interface CreatorDetail {
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

export default function CreatorDetailScreen() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const params = useLocalSearchParams();
  const router = useRouter();
  const creatorId = params.creatorId as string;

  const [creator, setCreator] = useState<CreatorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCreatorDetail();
  }, [creatorId]);

  const fetchCreatorDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[CreatorDetail] Fetching creator:', creatorId);

      const { data, error: fetchError } = await supabase
        .from('creators')
        .select('id, first_name, last_name, creator_handle, email, region, graduation_status, total_diamonds, diamonds_monthly, phone, avatar_url, profile_picture_url, battle_booked, graduation_eligible, graduation_paid_this_month, was_graduated_at_assignment, assigned_at')
        .eq('id', creatorId)
        .single();

      if (fetchError) {
        console.error('[CreatorDetail] Error fetching creator:', fetchError);
        setError('Failed to load creator details');
        setLoading(false);
        return;
      }

      if (!data) {
        console.error('[CreatorDetail] No creator found');
        setError('Creator not found');
        setLoading(false);
        return;
      }

      console.log('[CreatorDetail] Creator loaded:', data);
      setCreator(data);
    } catch (err: any) {
      console.error('[CreatorDetail] Unexpected error:', err);
      setError(err?.message || 'Failed to load creator details');
    } finally {
      setLoading(false);
    }
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

  if (!fontsLoaded || loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Creator Details',
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading creator details...</Text>
        </View>
      </>
    );
  }

  if (error || !creator) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Creator Details',
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
          <Text style={styles.errorText}>{error || 'Creator not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCreatorDetail}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const currentLevel = getGraduationLevel(creator.graduation_status);
  const diamondsToNext = getDiamondsToNextGraduation(creator.diamonds_monthly, currentLevel);
  const nextTarget = getNextGraduationTarget(currentLevel);
  const progressPercentage = getProgressPercentage(creator.diamonds_monthly, currentLevel);
  const isEligible = creator.graduation_eligible && !creator.graduation_paid_this_month && !creator.was_graduated_at_assignment;
  const isPaid = creator.graduation_paid_this_month;
  const isIneligible = creator.was_graduated_at_assignment;

  const profileImageUrl = creator.avatar_url || creator.profile_picture_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Creator Details',
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* CREATOR HEADER CARD */}
        <View style={styles.creatorHeaderCard}>
          {/* Profile Picture */}
          <Image
            source={{ uri: profileImageUrl }}
            style={styles.profilePicture}
          />

          {/* Name */}
          <Text style={styles.creatorName}>
            {creator.first_name} {creator.last_name}
          </Text>

          {/* TikTok Handle - Primary Action Button */}
          <TouchableOpacity 
            style={styles.primaryActionButton}
            onPress={() => handleTikTokPress(creator.creator_handle)}
          >
            <IconSymbol
              ios_icon_name="music.note"
              android_material_icon_name="music-note"
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.primaryActionText}>
              @{creator.creator_handle}
            </Text>
          </TouchableOpacity>

          {/* WhatsApp Contact - Primary Action Button */}
          {creator.phone && (
            <TouchableOpacity 
              style={styles.primaryActionButton}
              onPress={() => handleWhatsAppPress(creator.phone!)}
            >
              <IconSymbol
                ios_icon_name="message.fill"
                android_material_icon_name="chat"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.primaryActionText}>
                {creator.phone}
              </Text>
            </TouchableOpacity>
          )}

          {/* Status Badge */}
          <View 
            style={[
              styles.statusBadge,
              { backgroundColor: getGraduationBadgeColor(creator.graduation_status) }
            ]}
          >
            <Text style={styles.statusBadgeText}>
              {currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)}
            </Text>
          </View>
        </View>

        {/* DIAMONDS & GRADUATION PROGRESS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diamonds & Graduation</Text>
          
          <View style={styles.diamondsLargeContainer}>
            <IconSymbol
              ios_icon_name="diamond.fill"
              android_material_icon_name="diamond"
              size={48}
              color="#06B6D4"
            />
            <Text style={styles.diamondsLargeValue}>
              {creator.diamonds_monthly.toLocaleString()}
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
                  Current: {creator.diamonds_monthly.toLocaleString()}
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

        {/* BATTLE INFORMATION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Battle Status</Text>
          <View style={styles.battleStatusRow}>
            {creator.battle_booked ? (
              <>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={24}
                  color={colors.success}
                />
                <Text style={styles.battleStatusText}>Battle: Booked ✅</Text>
              </>
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="exclamationmark.circle.fill"
                  android_material_icon_name="error"
                  size={24}
                  color={colors.warning}
                />
                <Text style={styles.battleStatusText}>Battle: Missing ⚠️</Text>
              </>
            )}
          </View>
          {!creator.battle_booked && (
            <TouchableOpacity style={styles.ctaButton}>
              <Text style={styles.ctaButtonText}>Remind Creator</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* MANAGER PAYOUT INFORMATION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manager Payout Info</Text>
          
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

        {/* CONTACT INFORMATION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <TouchableOpacity 
            style={styles.contactRow}
            onPress={() => Linking.openURL(`mailto:${creator.email}`)}
          >
            <IconSymbol
              ios_icon_name="envelope.fill"
              android_material_icon_name="email"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.contactText}>{creator.email}</Text>
          </TouchableOpacity>

          {creator.region && (
            <View style={styles.contactRow}>
              <IconSymbol
                ios_icon_name="globe"
                android_material_icon_name="public"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.contactText}>{creator.region}</Text>
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
  content: {
    padding: 20,
    paddingBottom: 40,
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

  // CREATOR HEADER CARD
  creatorHeaderCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: colors.primary,
  },
  creatorName: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 10,
    width: '100%',
    marginBottom: 12,
  },
  primaryActionText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  statusBadgeText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: '#000000',
  },

  // SECTIONS
  section: {
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

  // DIAMONDS & GRADUATION
  diamondsLargeContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 20,
    backgroundColor: colors.grey,
    borderRadius: 16,
  },
  diamondsLargeValue: {
    fontSize: 48,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  diamondsLargeLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  progressToNextLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    marginBottom: 12,
  },
  progressBarContainer: {
    marginBottom: 16,
  },
  progressBarBg: {
    height: 16,
    backgroundColor: colors.grey,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 8,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  progressStatText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },

  // BATTLE STATUS
  battleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    backgroundColor: colors.grey,
    padding: 16,
    borderRadius: 12,
  },
  battleStatusText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },

  // PAYOUT INFO
  payoutCardsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  payoutCard: {
    flex: 1,
    backgroundColor: colors.grey,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  payoutCardLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  payoutCardValue: {
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
  },
  payoutRules: {
    backgroundColor: colors.grey,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginBottom: 16,
  },
  payoutRulesTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    marginBottom: 8,
  },
  payoutRulesText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    lineHeight: 20,
  },
  ineligibleBanner: {
    backgroundColor: colors.error + '20',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.error,
  },
  ineligibleText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.error,
    textAlign: 'center',
  },
  paidBanner: {
    backgroundColor: colors.success + '20',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.success,
  },
  paidText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.success,
    textAlign: 'center',
  },
  eligibleBanner: {
    backgroundColor: colors.primary + '20',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  eligibleText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
    textAlign: 'center',
  },

  // CONTACT INFO
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.grey,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  contactText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: colors.text,
    flex: 1,
  },
});
