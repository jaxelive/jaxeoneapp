
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/app/integrations/supabase/client';

interface VideoProgress {
  video_id: string;
  completed: boolean;
  creator_handle: string;
  watched_seconds: number;
}

export const useVideoProgress = (creatorHandle: string) => {
  const [videoProgress, setVideoProgress] = useState<VideoProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  const fetchVideoProgress = useCallback(async () => {
    if (!creatorHandle) {
      console.log('[useVideoProgress] No creator handle provided');
      setLoading(false);
      return;
    }
    
    try {
      console.log('[useVideoProgress] Fetching progress for:', creatorHandle);
      const { data, error } = await supabase
        .from('user_video_progress')
        .select('*')
        .eq('creator_handle', creatorHandle);

      if (error) {
        console.error('[useVideoProgress] Error fetching progress:', error);
        throw error;
      }
      
      console.log('[useVideoProgress] Fetched', data?.length || 0, 'progress records');
      console.log('[useVideoProgress] Progress data:', data);
      
      if (isMountedRef.current) {
        setVideoProgress(data || []);
        setLoading(false);
      }
    } catch (error) {
      console.error('[useVideoProgress] Exception:', error);
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [creatorHandle]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchVideoProgress();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchVideoProgress]);

  const isVideoWatched = useCallback((videoId: string): boolean => {
    const watched = videoProgress.some(vp => vp.video_id === videoId && vp.completed);
    console.log('[useVideoProgress] Checking if video', videoId, 'is watched:', watched);
    return watched;
  }, [videoProgress]);

  const getCourseProgress = useCallback((courseId: string, videos: any[]): { watched: number; total: number } => {
    const total = videos.length;
    const watched = videos.filter(video => {
      const isWatched = isVideoWatched(video.id);
      console.log('[useVideoProgress] Video', video.id, 'watched:', isWatched);
      return isWatched;
    }).length;
    console.log('[useVideoProgress] Course progress:', { watched, total, courseId, videoIds: videos.map(v => v.id) });
    return { watched, total };
  }, [isVideoWatched]);

  const markVideoAsWatched = useCallback(async (videoId: string) => {
    if (!creatorHandle) {
      console.error('[useVideoProgress] Cannot mark video as watched: no creator handle');
      return;
    }

    try {
      console.log('[useVideoProgress] Marking video as watched:', videoId, 'for creator:', creatorHandle);
      
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('user_video_progress')
        .upsert({
          creator_handle: creatorHandle,
          video_id: videoId,
          completed: true,
          watched_seconds: 0,
          completed_at: now,
          last_watched_at: now,
        }, {
          onConflict: 'creator_handle,video_id'
        });

      if (error) {
        console.error('[useVideoProgress] Error marking video as watched:', error);
        throw error;
      }

      console.log('[useVideoProgress] Video marked as watched successfully');

      // Update local state immediately
      setVideoProgress(prev => {
        const existing = prev.find(vp => vp.video_id === videoId);
        if (existing) {
          return prev.map(vp => 
            vp.video_id === videoId ? { ...vp, completed: true } : vp
          );
        }
        return [...prev, { 
          video_id: videoId, 
          completed: true, 
          creator_handle: creatorHandle,
          watched_seconds: 0,
        }];
      });
    } catch (error) {
      console.error('[useVideoProgress] Exception marking video as watched:', error);
    }
  }, [creatorHandle]);

  const refetch = useCallback(async () => {
    console.log('[useVideoProgress] Manual refetch triggered');
    setLoading(true);
    await fetchVideoProgress();
    console.log('[useVideoProgress] Manual refetch completed');
  }, [fetchVideoProgress]);

  return {
    videoProgress,
    loading,
    isVideoWatched,
    getCourseProgress,
    markVideoAsWatched,
    refetch,
  };
};
