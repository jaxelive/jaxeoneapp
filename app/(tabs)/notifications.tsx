
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import { useCreatorData } from '@/hooks/useCreatorData';
import { IconSymbol } from '@/components/IconSymbol';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';

interface Notification {
  id: string;
  type: 'news' | 'contests';
  title: string | null;
  content: string;
  region: string;
  language: string;
  created_at: string;
}

// Placeholder financial/progress activities
const PLACEHOLDER_ACTIVITIES = [
  {
    id: '1',
    title: 'You reached a new milestone',
    description: 'Congratulations! You\'ve earned 50,000 diamonds this month.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    icon: 'star.fill' as const,
    iconAndroid: 'star' as const,
  },
  {
    id: '2',
    title: 'You unlocked a bonus tier',
    description: 'Great work! You\'ve qualified for the Ascensus bonus tier.',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    icon: 'trophy.fill' as const,
    iconAndroid: 'emoji-events' as const,
  },
  {
    id: '3',
    title: 'Bonus payment processed',
    description: 'Your monthly bonus of $100 has been processed.',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    icon: 'dollarsign.circle.fill' as const,
    iconAndroid: 'attach-money' as const,
  },
];

export default function NotificationsScreen() {
  const { creator } = useCreatorData();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [newsNotifications, setNewsNotifications] = useState<Notification[]>([]);
  const [contestNotifications, setContestNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsExpanded, setNewsExpanded] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [creator]);

  const fetchNotifications = async () => {
    if (!creator) return;

    try {
      setLoading(true);

      // Fetch news notifications
      const { data: newsData, error: newsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'news')
        .or(`region.eq.${creator.region},region.eq.All`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (newsError) {
        console.error('Error fetching news:', newsError);
      } else {
        setNewsNotifications(newsData || []);
      }

      // Fetch contest notifications
      const { data: contestsData, error: contestsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'contests')
        .or(`region.eq.${creator.region},region.eq.All`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (contestsError) {
        console.error('Error fetching contests:', contestsError);
      } else {
        setContestNotifications(contestsData || []);
      }
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Notifications',
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* News & Contest - Expandable Section */}
        <TouchableOpacity
          style={styles.expandableHeader}
          onPress={() => setNewsExpanded(!newsExpanded)}
          activeOpacity={0.7}
        >
          <View style={styles.expandableHeaderLeft}>
            <IconSymbol
              ios_icon_name="megaphone.fill"
              android_material_icon_name="campaign"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.expandableHeaderTitle}>News & Contest</Text>
          </View>
          <IconSymbol
            ios_icon_name={newsExpanded ? 'chevron.up' : 'chevron.down'}
            android_material_icon_name={newsExpanded ? 'expand-less' : 'expand-more'}
            size={24}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {newsExpanded && (
          <View style={styles.expandableContent}>
            {/* News Section */}
            {newsNotifications.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <IconSymbol
                    ios_icon_name="newspaper.fill"
                    android_material_icon_name="article"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.sectionTitle}>Agency News</Text>
                </View>
                {newsNotifications.map((news) => (
                  <View key={news.id} style={styles.newsCard}>
                    <View style={styles.newsHeader}>
                      <View style={styles.newsIconContainer}>
                        <IconSymbol
                          ios_icon_name="info.circle.fill"
                          android_material_icon_name="info"
                          size={20}
                          color={colors.primary}
                        />
                      </View>
                      <View style={styles.newsHeaderContent}>
                        <Text style={styles.newsTitle}>{news.title || 'News Update'}</Text>
                        <Text style={styles.newsDate}>{formatDate(news.created_at)}</Text>
                      </View>
                    </View>
                    <Text style={styles.newsBody}>{news.content}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Contests Section */}
            {contestNotifications.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <IconSymbol
                    ios_icon_name="trophy.fill"
                    android_material_icon_name="emoji-events"
                    size={20}
                    color="#F59E0B"
                  />
                  <Text style={[styles.sectionTitle, { color: '#F59E0B' }]}>Active Contests</Text>
                </View>
                {contestNotifications.map((contest) => (
                  <View key={contest.id} style={styles.contestCard}>
                    <View style={styles.contestBadge}>
                      <IconSymbol
                        ios_icon_name="star.fill"
                        android_material_icon_name="star"
                        size={16}
                        color="#FFFFFF"
                      />
                      <Text style={styles.contestBadgeText}>CONTEST</Text>
                    </View>
                    <View style={styles.contestHeader}>
                      <View style={styles.contestIconWrapper}>
                        <IconSymbol
                          ios_icon_name="trophy.fill"
                          android_material_icon_name="emoji-events"
                          size={40}
                          color="#F59E0B"
                        />
                      </View>
                      <View style={styles.contestInfo}>
                        <Text style={styles.contestTitle}>{contest.title || 'Contest Alert'}</Text>
                        <Text style={styles.contestDate}>
                          Posted: {formatDate(contest.created_at)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.contestDescription}>{contest.content}</Text>
                  </View>
                ))}
              </View>
            )}

            {newsNotifications.length === 0 && contestNotifications.length === 0 && (
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="bell.slash"
                  android_material_icon_name="notifications-off"
                  size={48}
                  color={colors.textTertiary}
                />
                <Text style={styles.emptyStateText}>No announcements or contests at the moment</Text>
              </View>
            )}
          </View>
        )}

        {/* Recent Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {PLACEHOLDER_ACTIVITIES.map((activity) => (
            <View key={activity.id} style={styles.activityCard}>
              <View style={styles.activityIconContainer}>
                <IconSymbol
                  ios_icon_name={activity.icon}
                  android_material_icon_name={activity.iconAndroid}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <Text style={styles.activityDescription}>{activity.description}</Text>
                <Text style={styles.activityTime}>{formatRelativeTime(activity.timestamp)}</Text>
              </View>
            </View>
          ))}
        </View>
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  expandableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  expandableHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expandableHeaderTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
  },
  expandableContent: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
  },
  newsCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  newsIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(102, 66, 239, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newsHeaderContent: {
    flex: 1,
  },
  newsTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 4,
  },
  newsDate: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  newsBody: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    lineHeight: 20,
  },
  contestCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F59E0B',
    position: 'relative',
    overflow: 'hidden',
  },
  contestBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  contestBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  contestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  contestIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contestInfo: {
    flex: 1,
  },
  contestTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  contestDate: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#F59E0B',
  },
  contestDescription: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#D1D5DB',
    lineHeight: 20,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 16,
  },
  activityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(102, 66, 239, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
});
