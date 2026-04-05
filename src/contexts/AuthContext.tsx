import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../config/supabase';
import type { User } from '@supabase/supabase-js';

interface UserProfile {
  userid?: string;
  id?: string;
  email: string;
  phone?: string | null;
  admin?: boolean;
  username?: string;
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (user: UserProfile) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  sessionCheckCount: number;
  lastActivity: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionCheckCount, setSessionCheckCount] = useState(0);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const fetchProfile = useCallback(async (authUser: User): Promise<UserProfile | null> => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profile) {
      return {
        id: profile.id,
        email: profile.email || authUser.email || '',
        phone: profile.phone,
        admin: profile.admin,
        firstName: profile.first_name,
        lastName: profile.last_name,
      };
    }
    return {
      id: authUser.id,
      email: authUser.email || '',
    };
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        const profile = await fetchProfile(authUser);
        setUser(profile);
        setLastActivity(Date.now());
        setSessionCheckCount(0);
      } else {
        setUser(null);
        setSessionCheckCount(0);
      }
    } catch (error) {
      setUser(null);
      setSessionCheckCount(0);
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

  // Periodic session refresh
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        await checkSession();
      } else {
        setLastActivity(Date.now());
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, checkSession]);

  // Activity tracking
  useEffect(() => {
    const handleActivity = () => setLastActivity(Date.now());
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, []);

  // Initial session check
  useEffect(() => {
    checkSession();
  }, []);

  // Page visibility change handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        checkSession();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, checkSession]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await fetchProfile(session.user);
        setUser(profile);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = (userData: UserProfile) => {
    setUser(userData);
    setLastActivity(Date.now());
    setSessionCheckCount(0);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setLastActivity(Date.now());
      setSessionCheckCount(0);
    }
  };

  const refreshUser = async () => {
    setLoading(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const profile = await fetchProfile(authUser);
      setUser(profile);
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    sessionCheckCount,
    lastActivity,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useSessionStatus() {
  const { user, loading, sessionCheckCount, lastActivity } = useAuth();

  return {
    isSessionActive: !!user && !loading,
    sessionCheckCount,
    lastActivity,
    timeSinceLastActivity: Date.now() - lastActivity,
  };
}
