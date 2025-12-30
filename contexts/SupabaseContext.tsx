
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/app/integrations/supabase/client';
import { Alert } from 'react-native';

interface SupabaseContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false); // Changed to false for testing

  const signIn = async (email: string, password: string) => {
    try {
      console.log('[SupabaseContext] Signing in user:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[SupabaseContext] Sign in error:', error);
        throw error;
      }

      console.log('[SupabaseContext] Sign in successful');
      setSession(data.session);
      setUser(data.user);
    } catch (error: any) {
      console.error('[SupabaseContext] Sign in failed:', error);
      Alert.alert('Sign In Failed', error.message || 'Unknown error');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('[SupabaseContext] Signing out');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[SupabaseContext] Sign out error:', error);
        throw error;
      }

      setSession(null);
      setUser(null);
    } catch (error: any) {
      console.error('[SupabaseContext] Sign out failed:', error);
      Alert.alert('Sign Out Failed', error.message || 'Unknown error');
    }
  };

  useEffect(() => {
    console.log('[SupabaseContext] TESTING MODE - Authentication disabled');
    
    // For testing: Create a mock session/user
    // This bypasses authentication entirely
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as User;

    setUser(mockUser);
    setLoading(false);

    // Commented out for testing - this is the normal auth flow
    /*
    let mounted = true;

    // Check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[SupabaseContext] Error getting session:', error);
          if (mounted) {
            setLoading(false);
          }
          return;
        }
        
        if (existingSession) {
          console.log('[SupabaseContext] Existing session found:', existingSession.user.email);
          if (mounted) {
            setSession(existingSession);
            setUser(existingSession.user);
          }
        } else {
          console.log('[SupabaseContext] No existing session found');
        }
      } catch (err) {
        console.error('[SupabaseContext] Error initializing auth:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.log('[SupabaseContext] Auth state changed:', _event, newSession?.user?.email);
      if (mounted) {
        setSession(newSession);
        setUser(newSession?.user ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    */
  }, []);

  return (
    <SupabaseContext.Provider
      value={{
        session,
        user,
        loading,
        isConfigured: true,
        signIn,
        signOut,
      }}
    >
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};
