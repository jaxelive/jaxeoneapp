
import { useState, useCallback } from 'react';
import { supabase } from '@/app/integrations/supabase/client';

export type BattleFlyerParams = {
  title: string;
  creatorName: string;
  opponentName: string;
  battleDate: string;
  image: { uri: string; name?: string; type?: string };
};

export type BattleFlyerResult = {
  url: string;
  path: string;
  width: number;
  height: number;
  duration_ms: number;
};

type State =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: BattleFlyerResult; error: null }
  | { status: 'error'; data: null; error: string };

export function useBattleFlyerGen() {
  const [state, setState] = useState<State>({ status: 'idle', data: null, error: null });

  const reset = useCallback(() => {
    setState({ status: 'idle', data: null, error: null });
  }, []);

  const generate = useCallback(async (params: BattleFlyerParams): Promise<BattleFlyerResult | null> => {
    console.log('Starting flyer generation with params:', {
      title: params.title,
      creatorName: params.creatorName,
      opponentName: params.opponentName,
      battleDate: params.battleDate,
      hasImage: !!params.image.uri
    });

    if (!params.title.trim() || params.title.length > 40) {
      setState({ status: 'error', data: null, error: 'Title must be 1-40 characters.' });
      return null;
    }

    if (!params.creatorName.trim() || params.creatorName.length > 40) {
      setState({ status: 'error', data: null, error: 'Creator name must be 1-40 characters.' });
      return null;
    }

    if (!params.opponentName.trim() || params.opponentName.length > 40) {
      setState({ status: 'error', data: null, error: 'Opponent name must be 1-40 characters.' });
      return null;
    }

    if (!params.battleDate.trim()) {
      setState({ status: 'error', data: null, error: 'Battle date is required.' });
      return null;
    }

    if (!params.image.uri) {
      setState({ status: 'error', data: null, error: 'Face photo is required.' });
      return null;
    }

    setState({ status: 'loading', data: null, error: null });

    try {
      console.log('Getting Supabase session...');
      
      // Get the current session to verify user is authenticated
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Authentication error. Please try logging out and back in.');
      }

      if (!sessionData?.session) {
        console.error('No session found');
        throw new Error('Not authenticated. Please log in again.');
      }

      console.log('Session found, user ID:', sessionData.session.user.id);
      console.log('Access token present:', !!sessionData.session.access_token);

      console.log('Creating FormData...');
      const form = new FormData();
      form.append('title', params.title);
      form.append('creatorName', params.creatorName);
      form.append('opponentName', params.opponentName);
      form.append('battleDate', params.battleDate);
      
      // For React Native, we need to create a proper file object
      const imageBlob = {
        uri: params.image.uri,
        name: params.image.name ?? 'photo.jpg',
        type: params.image.type ?? 'image/jpeg',
      };
      
      form.append('image', imageBlob as any);

      console.log('Calling edge function via supabase.functions.invoke...');

      // Use supabase.functions.invoke - it automatically includes the auth token from the current session
      const { data, error } = await supabase.functions.invoke('generate-battle-flyer', {
        body: form,
      });

      if (error) {
        console.error('Edge function error:', error);
        
        // Check for specific error types
        if (error.message?.includes('GEMINI_API_KEY')) {
          throw new Error('The AI service is not configured. Please contact support to set up the GEMINI_API_KEY.');
        }
        
        if (error.message?.includes('Unauthorized') || error.message?.includes('401') || error.message?.includes('Not authenticated')) {
          throw new Error('Authentication failed. Please log out and log back in.');
        }
        
        if (error.message?.includes('404') || error.message?.includes('Not Found')) {
          throw new Error('The AI service is not available. Please contact support.');
        }
        
        const errorMessage = error.message || error.details || 'Failed to generate flyer';
        throw new Error(errorMessage);
      }

      if (!data) {
        throw new Error('No data returned from edge function');
      }

      const result = data as BattleFlyerResult;
      console.log('Flyer generated successfully:', result);
      setState({ status: 'success', data: result, error: null });
      return result;
    } catch (err: any) {
      const message = err?.message ?? 'Unknown error occurred';
      console.error('Error generating flyer:', message, err);
      setState({ status: 'error', data: null, error: message });
      return null;
    }
  }, []);

  const loading = state.status === 'loading';
  const error = state.status === 'error' ? state.error : null;
  const data = state.status === 'success' ? state.data : null;

  return { generate, loading, error, data, reset };
}
