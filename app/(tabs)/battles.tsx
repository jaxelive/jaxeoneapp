
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import { useCreatorData } from '@/hooks/useCreatorData';
import { IconSymbol } from '@/components/IconSymbol';

interface BattleAvailability {
  id: string;
  creator_id: string;
  available_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_booked: boolean;
  creator_handle?: string;
  creator_name?: string;
  region?: string;
}

interface BattleCalendar {
  id: string;
  creator_1_handle: string;
  creator_2_handle: string;
  battle_date: string;
  battle_time: string;
  status: string;
}

export default function BattlesScreen() {
  const { creator } = useCreatorData();
  const [activeTab, setActiveTab] = useState<'set' | 'view' | 'manual'>('set');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [duration, setDuration] = useState('60');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [availableCreators, setAvailableCreators] = useState<BattleAvailability[]>([]);
  const [upcomingBattles, setUpcomingBattles] = useState<BattleCalendar[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Manual battle input
  const [manualOpponent, setManualOpponent] = useState('');
  const [manualDate, setManualDate] = useState(new Date());
  const [manualTime, setManualTime] = useState(new Date());
  const [showManualDatePicker, setShowManualDatePicker] = useState(false);
  const [showManualTimePicker, setShowManualTimePicker] = useState(false);

  useEffect(() => {
    if (activeTab === 'view') {
      fetchAvailableCreators();
    }
    fetchUpcomingBattles();
  }, [activeTab, creator]);

  const fetchAvailableCreators = async () => {
    if (!creator) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('battles_availability')
        .select(`
          *,
          creators:creator_id (
            creator_handle,
            first_name,
            last_name,
            region
          )
        `)
        .eq('is_booked', false)
        .gte('available_date', new Date().toISOString().split('T')[0])
        .neq('creator_id', creator.id);

      if (error) throw error;

      const formatted = data?.map((item: any) => ({
        id: item.id,
        creator_id: item.creator_id,
        available_date: item.available_date,
        start_time: item.start_time,
        end_time: item.end_time,
        duration_minutes: item.duration_minutes,
        is_booked: item.is_booked,
        creator_handle: item.creators?.creator_handle,
        creator_name: `${item.creators?.first_name} ${item.creators?.last_name}`,
        region: item.creators?.region,
      })) || [];

      setAvailableCreators(formatted);
    } catch (error: any) {
      console.error('Error fetching available creators:', error);
      Alert.alert('Error', 'Failed to load available creators');
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingBattles = async () => {
    if (!creator) return;

    try {
      const { data, error } = await supabase
        .from('battles_calendar')
        .select('*')
        .or(`creator_1_id.eq.${creator.id},creator_2_id.eq.${creator.id}`)
        .gte('battle_date', new Date().toISOString())
        .order('battle_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      setUpcomingBattles(data || []);
    } catch (error: any) {
      console.error('Error fetching battles:', error);
    }
  };

  const handleSetAvailability = async () => {
    if (!creator) {
      Alert.alert('Error', 'Creator data not loaded');
      return;
    }

    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const timeStr = startTime.toTimeString().split(' ')[0];
      const endTime = new Date(startTime.getTime() + parseInt(duration) * 60000);
      const endTimeStr = endTime.toTimeString().split(' ')[0];

      const { error } = await supabase
        .from('battles_availability')
        .insert({
          creator_id: creator.id,
          available_date: dateStr,
          start_time: timeStr,
          end_time: endTimeStr,
          duration_minutes: parseInt(duration),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });

      if (error) throw error;

      Alert.alert('Success', 'Your availability has been set!');
      setDuration('60');
    } catch (error: any) {
      console.error('Error setting availability:', error);
      Alert.alert('Error', 'Failed to set availability');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestBattle = async (availability: BattleAvailability) => {
    if (!creator) return;

    Alert.alert(
      'Request Battle',
      `Request a battle with @${availability.creator_handle}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: async () => {
            try {
              const battleDateTime = new Date(`${availability.available_date}T${availability.start_time}`);
              
              const { error } = await supabase
                .from('battles_calendar')
                .insert({
                  creator_1_id: creator.id,
                  creator_2_id: availability.creator_id,
                  creator_1_handle: creator.creator_handle,
                  creator_2_handle: availability.creator_handle,
                  battle_date: battleDateTime.toISOString(),
                  battle_time: availability.start_time,
                  duration_minutes: availability.duration_minutes,
                  status: 'scheduled',
                  created_by_creator_id: creator.id,
                });

              if (error) throw error;

              await supabase
                .from('battles_availability')
                .update({ is_booked: true, booked_by_creator_id: creator.id })
                .eq('id', availability.id);

              Alert.alert('Success', 'Battle request sent!');
              fetchAvailableCreators();
              fetchUpcomingBattles();
            } catch (error: any) {
              console.error('Error requesting battle:', error);
              Alert.alert('Error', 'Failed to request battle');
            }
          },
        },
      ]
    );
  };

  const handleManualBattleInput = async () => {
    if (!creator || !manualOpponent.trim()) {
      Alert.alert('Error', 'Please enter opponent handle');
      return;
    }

    setLoading(true);
    try {
      const battleDateTime = new Date(
        manualDate.getFullYear(),
        manualDate.getMonth(),
        manualDate.getDate(),
        manualTime.getHours(),
        manualTime.getMinutes()
      );

      const { error } = await supabase
        .from('battles_calendar')
        .insert({
          creator_1_id: creator.id,
          creator_1_handle: creator.creator_handle,
          creator_2_handle: manualOpponent.trim(),
          battle_date: battleDateTime.toISOString(),
          battle_time: manualTime.toTimeString().split(' ')[0],
          duration_minutes: 60,
          status: 'completed',
          is_manual_entry: true,
          created_by_creator_id: creator.id,
        });

      if (error) throw error;

      Alert.alert('Success', 'Battle logged successfully!');
      setManualOpponent('');
      fetchUpcomingBattles();
    } catch (error: any) {
      console.error('Error logging battle:', error);
      Alert.alert('Error', 'Failed to log battle');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Battles',
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header - Typography Only */}
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>Creator Battles</Text>
          <Text style={styles.headerSubtitle}>Schedule and compete in live battles</Text>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'set' && styles.activeTab]}
            onPress={() => setActiveTab('set')}
          >
            <Text style={[styles.tabText, activeTab === 'set' && styles.activeTabText]}>
              Set Availability
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'view' && styles.activeTab]}
            onPress={() => setActiveTab('view')}
          >
            <Text style={[styles.tabText, activeTab === 'view' && styles.activeTabText]}>
              Find Battles
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'manual' && styles.activeTab]}
            onPress={() => setActiveTab('manual')}
          >
            <Text style={[styles.tabText, activeTab === 'manual' && styles.activeTabText]}>
              Log Battle
            </Text>
          </TouchableOpacity>
        </View>

        {/* Set Availability Tab */}
        {activeTab === 'set' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Set Your Availability</Text>
            
            <TouchableOpacity
              style={styles.inputButton}
              onPress={() => setShowDatePicker(true)}
            >
              <IconSymbol ios_icon_name="calendar" android_material_icon_name="calendar-today" size={20} color={colors.primary} />
              <Text style={styles.inputButtonText}>
                {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={(event, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) setSelectedDate(date);
                }}
              />
            )}

            <TouchableOpacity
              style={styles.inputButton}
              onPress={() => setShowTimePicker(true)}
            >
              <IconSymbol ios_icon_name="clock" android_material_icon_name="access-time" size={20} color={colors.primary} />
              <Text style={styles.inputButtonText}>
                {startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                display="default"
                onChange={(event, time) => {
                  setShowTimePicker(Platform.OS === 'ios');
                  if (time) setStartTime(time);
                }}
              />
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Duration (minutes)</Text>
              <TextInput
                style={styles.input}
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
                placeholder="60"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSetAvailability}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Setting...' : 'Set Availability'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* View Creator Availability Tab */}
        {activeTab === 'view' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Creators</Text>
            
            {loading ? (
              <Text style={styles.loadingText}>Loading...</Text>
            ) : availableCreators.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No available creators at the moment</Text>
                <Text style={styles.emptyStateSubtext}>Check back later or set your own availability</Text>
              </View>
            ) : (
              availableCreators.map((item) => (
                <View key={item.id} style={styles.creatorCard}>
                  <View style={styles.creatorInfo}>
                    <Text style={styles.creatorHandle}>@{item.creator_handle}</Text>
                    <Text style={styles.creatorName}>{item.creator_name}</Text>
                    <Text style={styles.creatorDetails}>
                      {formatDate(item.available_date)} • {formatTime(item.start_time)}
                    </Text>
                    <Text style={styles.creatorDuration}>{item.duration_minutes} minutes</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.requestButton}
                    onPress={() => handleRequestBattle(item)}
                  >
                    <Text style={styles.requestButtonText}>Request</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* Manual Battle Input Tab */}
        {activeTab === 'manual' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Log External Battle</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Opponent Handle</Text>
              <TextInput
                style={styles.input}
                value={manualOpponent}
                onChangeText={setManualOpponent}
                placeholder="@username"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <TouchableOpacity
              style={styles.inputButton}
              onPress={() => setShowManualDatePicker(true)}
            >
              <IconSymbol ios_icon_name="calendar" android_material_icon_name="calendar-today" size={20} color={colors.primary} />
              <Text style={styles.inputButtonText}>
                {manualDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            </TouchableOpacity>

            {showManualDatePicker && (
              <DateTimePicker
                value={manualDate}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowManualDatePicker(Platform.OS === 'ios');
                  if (date) setManualDate(date);
                }}
              />
            )}

            <TouchableOpacity
              style={styles.inputButton}
              onPress={() => setShowManualTimePicker(true)}
            >
              <IconSymbol ios_icon_name="clock" android_material_icon_name="access-time" size={20} color={colors.primary} />
              <Text style={styles.inputButtonText}>
                {manualTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>

            {showManualTimePicker && (
              <DateTimePicker
                value={manualTime}
                mode="time"
                display="default"
                onChange={(event, time) => {
                  setShowManualTimePicker(Platform.OS === 'ios');
                  if (time) setManualTime(time);
                }}
              />
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleManualBattleInput}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Logging...' : 'Log Battle'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Upcoming Battles */}
        {upcomingBattles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Battles</Text>
            {upcomingBattles.map((battle) => (
              <View key={battle.id} style={styles.battleCard}>
                <Text style={styles.battleText}>
                  @{battle.creator_1_handle} vs @{battle.creator_2_handle}
                </Text>
                <Text style={styles.battleDate}>
                  {formatDate(battle.battle_date)} • {formatTime(battle.battle_time)}
                </Text>
                <View style={[styles.statusBadge, styles[`status${battle.status}`]]}>
                  <Text style={styles.statusText}>{battle.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  headerCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  inputButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  creatorCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creatorInfo: {
    flex: 1,
  },
  creatorHandle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  creatorName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  creatorDetails: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  creatorDuration: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  requestButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  requestButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  battleCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  battleText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  battleDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  statusscheduled: {
    backgroundColor: colors.secondaryLight,
  },
  statusconfirmed: {
    backgroundColor: colors.successLight,
  },
  statuscompleted: {
    backgroundColor: colors.greyMedium,
  },
  statuscancelled: {
    backgroundColor: colors.errorLight,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
});
