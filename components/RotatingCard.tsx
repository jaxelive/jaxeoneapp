
import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { IconSymbol } from './IconSymbol';

interface RotatingCardProps {
  type: 'bonus' | 'diamonds';
  isFaded?: boolean;
  onPress: () => void;
  data: {
    bonusAmount?: number;
    nextBonus?: number;
    liveDays?: number;
    liveHours?: number;
    battlesBooked?: number;
    diamondsEarned?: number;
    totalGoal?: number;
    remaining?: number;
    nextTier?: string;
  };
}

export function RotatingCard({ type, isFaded = false, onPress, data }: RotatingCardProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }),
      Animated.spring(rotateAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.spring(rotateAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '5deg'],
  });

  const cardStyle = {
    transform: [
      { scale: scaleAnim },
      { rotate: rotateInterpolate },
    ],
    opacity: isFaded ? 0.4 : 1,
  };

  if (type === 'bonus') {
    const liveDaysComplete = (data.liveDays || 0) >= 15;
    const liveHoursComplete = (data.liveHours || 0) >= 40;
    const battlesComplete = (data.battlesBooked || 0) >= 1;
    const requirementsMet = [liveDaysComplete, liveHoursComplete, battlesComplete].filter(Boolean).length;

    return (
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
      >
        <Animated.View style={[styles.card, cardStyle]}>
          {/* Header */}
          <View style={styles.bonusHeader}>
            <Text style={styles.bonusTitle}>BONUS FORECAST</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>STATUS</Text>
              <Text style={styles.statusValue}>Active</Text>
            </View>
          </View>

          {/* Main Amount */}
          <View style={styles.mainAmountSection}>
            <View style={styles.amountRow}>
              <Text style={styles.mainAmount}>${data.bonusAmount || 100}</Text>
              <View style={styles.checkCircle}>
                <IconSymbol 
                  ios_icon_name="checkmark" 
                  android_material_icon_name="check" 
                  size={32} 
                  color="#FFFFFF" 
                />
              </View>
            </View>
            <Text style={styles.earnedLabel}>Earned</Text>
          </View>

          {/* Next Bonus */}
          <View style={styles.nextBonusSection}>
            <Text style={styles.nextBonusLabel}>NEXT BONUS ${data.nextBonus || 175}</Text>
            <Text style={styles.requirementsText}>{requirementsMet} of 3 requirements met</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${(requirementsMet / 3) * 100}%` }]} />
          </View>

          {/* Requirements */}
          <View style={styles.requirementsContainer}>
            <View style={styles.requirementRow}>
              <Text style={styles.requirementLabel}>LIVE Days</Text>
              <View style={styles.requirementValue}>
                <Text style={styles.requirementText}>{data.liveDays || 15} / 15</Text>
                {liveDaysComplete && (
                  <View style={styles.checkmarkSmall}>
                    <IconSymbol 
                      ios_icon_name="checkmark" 
                      android_material_icon_name="check" 
                      size={14} 
                      color="#10B981" 
                    />
                  </View>
                )}
              </View>
            </View>

            <View style={styles.requirementRow}>
              <Text style={styles.requirementLabel}>LIVE Hours</Text>
              <View style={styles.requirementValue}>
                <Text style={styles.requirementText}>{data.liveHours || 32} / 40</Text>
                {!liveHoursComplete && (
                  <View style={styles.emptyCircle} />
                )}
              </View>
            </View>

            <View style={styles.requirementRow}>
              <Text style={styles.requirementLabel}>Battles Booked</Text>
              <View style={styles.requirementValue}>
                <Text style={styles.requirementText}>{data.battlesBooked || 1} / 1</Text>
                {battlesComplete && (
                  <View style={styles.checkmarkSmall}>
                    <IconSymbol 
                      ios_icon_name="checkmark" 
                      android_material_icon_name="check" 
                      size={14} 
                      color="#10B981" 
                    />
                  </View>
                )}
              </View>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  // Diamonds card
  const progressPercentage = ((data.diamondsEarned || 0) / (data.totalGoal || 200000)) * 100;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View style={[styles.card, cardStyle]}>
        {/* Header */}
        <View style={styles.diamondsHeader}>
          <View style={styles.diamondIcon}>
            <Text style={styles.diamondEmoji}>💎</Text>
          </View>
          <View style={styles.tierBadge}>
            <View style={styles.tierDot} />
            <Text style={styles.tierText}>{data.nextTier || 'Silver'}</Text>
          </View>
        </View>

        {/* Main Amount */}
        <View style={styles.mainAmountSection}>
          <Text style={styles.mainAmount}>{(data.diamondsEarned || 15000).toLocaleString()}</Text>
          <Text style={styles.diamondsLabel}>Diamonds Earned</Text>
        </View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress to Goal</Text>
            <Text style={styles.remainingText}>Remaining: {(data.remaining || 185000).toLocaleString()}</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${Math.min(progressPercentage, 100)}%` }]} />
          </View>
        </View>

        {/* Goal Info */}
        <View style={styles.goalSection}>
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>TOTAL GOAL</Text>
            <Text style={styles.goalLabel}>NEXT TIER</Text>
          </View>
          <View style={styles.goalRow}>
            <Text style={styles.goalValue}>{(data.totalGoal || 200000).toLocaleString()}</Text>
            <Text style={styles.goalValueHighlight}>{data.nextTier || 'Silver'}</Text>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#7C3AED',
    borderRadius: 24,
    padding: 24,
    width: '100%',
  },

  // Bonus Card Styles
  bonusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  bonusTitle: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.5,
  },
  statusValue: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  mainAmountSection: {
    marginBottom: 32,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  mainAmount: {
    fontSize: 72,
    fontFamily: 'Poppins_800ExtraBold',
    color: '#FFFFFF',
    letterSpacing: -3,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  earnedLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  nextBonusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nextBonusLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  requirementsText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
  },
  requirementsContainer: {
    gap: 16,
  },
  requirementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  requirementLabel: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  requirementValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  checkmarkSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  // Diamonds Card Styles
  diamondsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  diamondIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  diamondEmoji: {
    fontSize: 24,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  tierText: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  diamondsLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  progressSection: {
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  remainingText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  goalSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 20,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.5,
  },
  goalValue: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  goalValueHighlight: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#FCD34D',
  },
});
