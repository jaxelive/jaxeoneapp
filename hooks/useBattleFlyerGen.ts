
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
    console.log('=== BATTLE FLYER GENERATION START ===');
    console.log('Params:', {
      title: params.title,
      creatorName: params.creatorName,
      opponentName: params.opponentName,
      battleDate: params.battleDate,
      hasImage: !!params.image.uri,
      imageUri: params.image.uri?.substring(0, 50) + '...'
    });

    // Validation
    if (!params.title.trim() || params.title.length > 40) {
      const error = 'Title must be 1-40 characters.';
      console.error('Validation error:', error);
      setState({ status: 'error', data: null, error });
      return null;
    }

    if (!params.creatorName.trim() || params.creatorName.length > 40) {
      const error = 'Creator name must be 1-40 characters.';
      console.error('Validation error:', error);
      setState({ status: 'error', data: null, error });
      return null;
    }

    if (!params.opponentName.trim() || params.opponentName.length > 40) {
      const error = 'Opponent name must be 1-40 characters.';
      console.error('Validation error:', error);
      setState({ status: 'error', data: null, error });
      return null;
    }

    if (!params.battleDate.trim()) {
      const error = 'Battle date is required.';
      console.error('Validation error:', error);
      setState({ status: 'error', data: null, error });
      return null;
    }

    if (!params.image.uri) {
      const error = 'Face photo is required.';
      console.error('Validation error:', error);
      setState({ status: 'error', data: null, error });
      return null;
    }

    console.log('✓ Validation passed');
    setState({ status: 'loading', data: null, error: null });

    try {
      console.log('Step 1: Getting current session...');
      
      // Get the current session - this will also refresh the token if needed
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw new Error(`Authentication error: ${sessionError.message}. Please try logging out and back in.`);
      }

      if (!sessionData?.session) {
        console.error('❌ No session found');
        throw new Error('Not authenticated. Please log in again.');
      }

      const session = sessionData.session;
      console.log('✓ Session found');
      console.log('  - User ID:', session.user.id);
      console.log('  - User email:', session.user.email);
      console.log('  - Token expires at:', new Date(session.expires_at! * 1000).toISOString());
      console.log('  - Access token (first 20 chars):', session.access_token.substring(0, 20) + '...');

      // Check if token is about to expire (within 5 minutes)
      const expiresAt = session.expires_at! * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60000);
      
      console.log('  - Token expires in:', minutesUntilExpiry, 'minutes');
      
      if (timeUntilExpiry < 300000) { // Less than 5 minutes
        console.warn('⚠️ Token is about to expire, refreshing...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
          throw new Error('Session expired. Please log out and log back in.');
        }
        
        if (refreshData?.session) {
          console.log('✓ Token refreshed successfully');
        }
      }

      console.log('Step 2: Creating FormData...');
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
      console.log('✓ FormData created with image:', imageBlob.name, imageBlob.type);

      console.log('Step 3: Calling Edge Function...');
      console.log('  - Function name: generate-battle-flyer');
      console.log('  - Using supabase.functions.invoke()');
      console.log('  - Supabase client should automatically attach JWT from session');

      const startTime = Date.now();

      // Use supabase.functions.invoke which automatically includes the JWT
      // The Supabase client will automatically attach the Authorization header
      // with the JWT token from the current session
      const { data, error } = await supabase.functions.invoke('generate-battle-flyer', {
        body: form,
      });

      const duration = Date.now() - startTime;
      console.log('  - Request completed in:', duration, 'ms');

      if (error) {
        console.error('❌ Edge function error:', error);
        console.error('  - Error message:', error.message);
        console.error('  - Error context:', error.context);
        console.error('  - Full error:', JSON.stringify(error, null, 2));
        
        // Check for specific error types
        if (error.message?.includes('GEMINI_API_KEY')) {
          throw new Error('The AI service is not configured. Please contact support to set up the GEMINI_API_KEY.');
        }
        
        if (error.message?.includes('Unauthorized') || error.message?.includes('401') || error.message?.includes('Not authenticated')) {
          throw new Error('Authentication failed. Your session may have expired. Please log out and log back in.');
        }
        
        if (error.message?.includes('404') || error.message?.includes('Not Found')) {
          throw new Error('The AI service is not available. The Edge Function may not be deployed. Please contact support.');
        }

        if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
          throw new Error('Request timed out. The AI is taking too long to respond. Please try again.');
        }

        if (error.message?.includes('network') || error.message?.includes('fetch')) {
          throw new Error('Network error. Please check your internet connection and try again.');
        }
        
        const errorMessage = error.message || error.context?.error || 'Failed to generate flyer';
        throw new Error(errorMessage);
      }

      if (!data) {
        console.error('❌ No data returned from edge function');
        throw new Error('No data returned from edge function. The AI may have failed to generate an image.');
      }

      console.log('✓ Edge function returned data');
      console.log('  - Response keys:', Object.keys(data));

      const result = data as BattleFlyerResult;
      
      if (!result.url) {
        console.error('❌ No URL in response:', result);
        throw new Error('Invalid response: No image URL returned');
      }

      console.log('✓ Flyer generated successfully!');
      console.log('  - URL:', result.url);
      console.log('  - Path:', result.path);
      console.log('  - Dimensions:', result.width, 'x', result.height);
      console.log('  - Generation time:', result.duration_ms, 'ms');
      console.log('=== BATTLE FLYER GENERATION SUCCESS ===');

      setState({ status: 'success', data: result, error: null });
      return result;
    } catch (err: any) {
      const message = err?.message ?? 'Unknown error occurred';
      console.error('❌ Error generating flyer:', message);
      console.error('❌ Full error:', err);
      console.error('=== BATTLE FLYER GENERATION FAILED ===');
      setState({ status: 'error', data: null, error: message });
      return null;
    }
  }, []);

  const loading = state.status === 'loading';
  const error = state.status === 'error' ? state.error : null;
  const data = state.status === 'success' ? state.data : null;

  return { generate, loading, error, data, reset };
}
