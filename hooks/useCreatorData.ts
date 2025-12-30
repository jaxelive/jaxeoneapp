
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/integrations/supabase/client';

export interface ManagerData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
  username: string | null;
  whatsapp: string | null;
  role: string;
  manager_avatar_url: string | null;
}

export interface CreatorData {
  id: string;
  first_name: string;
  last_name: string;
  creator_handle: string;
  email: string;
  profile_picture_url: string | null;
  avatar_url: string | null;
  region: string | null;
  language: string | null;
  creator_type: string[] | null;
  diamonds_monthly: number;
  total_diamonds: number;
  diamonds_30d: number;
  live_days_30d: number;
  live_duration_seconds_30d: number;
  hours_streamed: number;
  graduation_status: string | null;
  silver_target: number | null;
  gold_target: number | null;
  assigned_manager_id: string | null;
  is_active: boolean;
  manager?: ManagerData | null;
  user_role?: string | null;
}

export interface CreatorStats {
  monthlyDiamonds: number;
  totalDiamonds: number;
  liveDays: number;
  liveHours: number;
  diamondsToday: number;
  streak: number;
  currentProgress: number;
  remaining: number;
  nextTarget: string;
  targetAmount: number;
  currentStatus: string;
}

export function useCreatorData(creatorHandle: string = 'avelezsanti') {
  const [creator, setCreator] = useState<CreatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCreatorData = useCallback(async () => {
    try {
      console.log('[useCreatorData] Starting fetch for creator:', creatorHandle);
      setLoading(true);
      setError(null);

      // First, fetch the creator data with manager info
      const { data: creatorData, error: creatorError } = await supabase
        .from('creators')
        .select(`
          *,
          managers:assigned_manager_id (
            id,
            whatsapp,
            avatar_url,
            users:user_id (
              id,
              first_name,
              last_name,
              email,
              avatar_url,
              username,
              role
            )
          )
        `)
        .eq('is_active', true)
        .eq('creator_handle', creatorHandle)
        .single();

      console.log('[useCreatorData] Creator query completed', {
        hasData: !!creatorData,
        hasError: !!creatorError,
        errorMessage: creatorError?.message
      });

      if (creatorError) {
        console.error('[useCreatorData] Fetch error:', creatorError);
        setError(creatorError.message);
        setCreator(null);
        setLoading(false);
        return;
      }

      if (!creatorData) {
        console.warn('[useCreatorData] No creator data found for handle:', creatorHandle);
        setError(`No creator data found for @${creatorHandle}`);
        setCreator(null);
        setLoading(false);
        return;
      }

      // Now fetch the user role separately using the creator's user_id
      let userRole: string | null = null;
      if (creatorData.user_id) {
        console.log('[useCreatorData] Fetching user role for user_id:', creatorData.user_id);
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', creatorData.user_id)
          .single();

        if (userError) {
          console.error('[useCreatorData] Error fetching user role:', userError);
        } else if (userData) {
          userRole = userData.role;
          console.log('[useCreatorData] User role fetched:', userRole);
        }
      } else {
        console.log('[useCreatorData] No user_id found on creator record');
      }

      // Transform manager data if it exists
      let managerData: ManagerData | null = null;
      if (creatorData.managers && creatorData.managers.users) {
        const managerUser = creatorData.managers.users;
        managerData = {
          id: managerUser.id,
          first_name: managerUser.first_name,
          last_name: managerUser.last_name,
          email: managerUser.email,
          avatar_url: managerUser.avatar_url,
          username: managerUser.username,
          whatsapp: creatorData.managers.whatsapp,
          role: managerUser.role,
          manager_avatar_url: creatorData.managers.avatar_url,
        };
        
        console.log('[useCreatorData] Manager data loaded:', {
          name: `${managerData.first_name} ${managerData.last_name}`,
          userAvatarUrl: managerData.avatar_url,
          managerAvatarUrl: managerData.manager_avatar_url,
        });
      }

      const transformedCreator: CreatorData = {
        ...creatorData,
        manager: managerData,
        user_role: userRole,
      };

      console.log('[useCreatorData] Creator data loaded:', {
        handle: transformedCreator.creator_handle,
        name: `${transformedCreator.first_name} ${transformedCreator.last_name}`,
        diamonds: transformedCreator.total_diamonds,
        monthlyDiamonds: transformedCreator.diamonds_monthly,
        liveDays: transformedCreator.live_days_30d,
        liveHours: Math.floor(transformedCreator.live_duration_seconds_30d / 3600),
        hasManager: !!managerData,
        managerName: managerData ? `${managerData.first_name} ${managerData.last_name}` : 'None',
        userRole: userRole,
        isManager: userRole === 'manager'
      });
      
      setCreator(transformedCreator);
      setError(null);
    } catch (err: any) {
      console.error('[useCreatorData] Unexpected error:', err);
      setError(err?.message || 'Failed to fetch creator data');
      setCreator(null);
    } finally {
      setLoading(false);
      console.log('[useCreatorData] Fetch complete');
    }
  }, [creatorHandle]);

  useEffect(() => {
    console.log('[useCreatorData] Effect triggered for handle:', creatorHandle);
    fetchCreatorData();
  }, [creatorHandle]);

  const getCreatorStats = (): CreatorStats | null => {
    if (!creator) {
      console.log('[useCreatorData] getCreatorStats: No creator data available');
      return null;
    }

    const liveHours = Math.floor(creator.live_duration_seconds_30d / 3600);
    const silverTarget = creator.silver_target || 200000;
    const goldTarget = creator.gold_target || 500000;
    
    let nextTarget = 'Silver';
    let targetAmount = silverTarget;
    
    if (creator.total_diamonds >= silverTarget) {
      nextTarget = 'Gold';
      targetAmount = goldTarget;
    }

    const remaining = Math.max(0, targetAmount - creator.total_diamonds);
    const currentProgress = targetAmount > 0 
      ? ((creator.total_diamonds / targetAmount) * 100)
      : 0;

    const stats = {
      monthlyDiamonds: creator.diamonds_monthly || 0,
      totalDiamonds: creator.total_diamonds || 0,
      liveDays: creator.live_days_30d || 0,
      liveHours: liveHours,
      diamondsToday: creator.diamonds_30d || 0,
      streak: creator.live_days_30d || 0,
      currentProgress: currentProgress,
      remaining: remaining,
      nextTarget: nextTarget,
      targetAmount: targetAmount,
      currentStatus: creator.graduation_status || 'Rookie (New)',
    };

    console.log('[useCreatorData] Stats calculated:', stats);
    return stats;
  };

  return {
    creator,
    loading,
    error,
    stats: getCreatorStats(),
    refetch: fetchCreatorData,
  };
}
