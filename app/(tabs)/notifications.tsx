
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

interface AgencyNews {
  id: string;
  title: string;
  body: string;
  region: string | null;
  published_at: string;
}

interface Contest {
  id: string;
  title: string;
  description: string;
  region: string | null;
  start_at: string;
  end_at: string;
  prize_cents: number;
  rules_url: string | null;
}

export default function NotificationsScreen() {
  const { creator } = useCreatorData();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [agencyNews, setAgencyNews] = useState<AgencyNews[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsExpanded, setNewsExpanded] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [creator]);

  const fetchNotifications = async () => {
    if (!creator) return;

    try {
      setLoading(true);

      // Fetch agency news
      const { data: newsData, error: newsError } = await supabase
        .from('agency_news')
        .select('*')
        .or(`region.is.null,region.eq.${creator.region}`)
        .order('published_at', { ascending: false })
        .limit(10);

      if (newsError) throw newsError;
      setAgencyNews(newsData || []);

      // Fetch contests
      const { data: contestsData, error: contestsError } = await supabase
        .from('contests')
        .select('*')
        .or(`region.is.null,region.eq.${creator.region}`)
        .gte('end_at', new Date().toISOString())
        .order('start_at', { ascending: true })
        .limit(5);

      if (contestsError) throw contestsError;
      setContests(contestsData || []);
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
        {/* News & Contests Cast - Expandable Section */}
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
            <Text style={styles.expandableHeaderTitle}>News & Contests Cast</Text>
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
            {/* Agency News */}
            {agencyNews.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Agency Announcements</Text>
                {agencyNews.map((news) => (
                  <View key={news.id} style={styles.newsCard}>
                    <View style={styles.newsHeader}>
                      <Text style={styles.newsTitle}>{news.title}</Text>
                      <Text style={styles.newsDate}>{formatDate(news.published_at)}</Text>
                    </View>
                    <Text style={styles.newsBody}>{news.body}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Contests */}
            {contests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Active Contests</Text>
                {contests.map((contest) => (
                  <View key={contest.id} style={styles.contestCard}>
                    <View style={styles.contestHeader}>
                      <IconSymbol
                        ios_icon_name="trophy.fill"
                        android_material_icon_name="emoji-events"
                        size={32}
                        color={colors.primary}
                      />
                      <View style={styles.contestInfo}>
                        <Text style={styles.contestTitle}>{contest.title}</Text>
                        <Text style={styles.contestPrize}>
                          Prize: ${(contest.prize_cents / 100).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.contestDescription}>{contest.description}</Text>
                    <View style={styles.contestDates}>
                      <Text style={styles.contestDate}>
                        Starts: {formatDate(contest.start_at)}
                      </Text>
                      <Text style={styles.contestDate}>
                        Ends: {formatDate(contest.end_at)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {agencyNews.length === 0 && contests.length === 0 && (
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

        {/* Other Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="bell"
              android_material_icon_name="notifications"
              size={48}
              color={colors.textTertiary}
            />
            <Text style={styles.emptyStateText}>No recent activity</Text>
          </View>
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
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 12,
  },
  newsCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  newsTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginRight: 8,
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
    backgroundColor: colors.backgroundAlt,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  contestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  contestInfo: {
    flex: 1,
  },
  contestTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 4,
  },
  contestPrize: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
  contestDescription: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  contestDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contestDate: {
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
