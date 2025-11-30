import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getCurrentUser, logout as logoutService, refreshSession } from '../services/authService';

interface User {
  userid?: string;
  id?: number;
  email: string;
  phone?: string | null;
  admin?: boolean;
  username?: string;
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  sessionCheckCount: number;
  lastActivity: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionCheckCount, setSessionCheckCount] = useState(0);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Enhanced session checking with retry logic and graceful degradation
  const checkSession = useCallback(async (isRetry: boolean = false) => {
    try {
      console.log(`Checking session... ${isRetry ? '(retry)' : '(initial)'}`);

      const result = await getCurrentUser();

      if (result.success && result.user) {
        setUser(result.user);
        setLastActivity(Date.now());
        setSessionCheckCount(0); // Reset on success
        console.log('Session validation successful for user:', result.user.email);
      } else {
        // Clear user immediately on session failure - no retries for expired sessions
        console.warn('Session validation failed, logging out user:', result.error);
        setUser(null);
        setSessionCheckCount(0);
      }
    } catch (error) {
      console.error('Session check error:', error);

      // Clear user immediately on session errors
      console.error('Session check failed, logging out user');
      setUser(null);
      setSessionCheckCount(0);
    } finally {
      setLoading(false);
    }
  }, [sessionCheckCount]);

  // Periodic session refresh to maintain activity
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        const result = await refreshSession();
        if (!result.success) {
          console.warn('Session refresh failed, checking full session...');
          await checkSession();
        } else {
          setLastActivity(Date.now());
          console.log('Session refreshed successfully');
        }
      } catch (error) {
        console.error('Periodic session refresh failed:', error);
        await checkSession();
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [user, checkSession]);

  // Activity tracking to prevent session timeouts
  useEffect(() => {
    const handleActivity = () => {
      setLastActivity(Date.now());
    };

    // Track various user activities
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

  // Initial session check on component mount
  useEffect(() => {
    console.log('AuthProvider mounted - checking initial session');
    checkSession();
  }, []); // Only run on mount

  // Page visibility change handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        // Page became visible again, check session
        console.log('Page became visible, checking session...');
        checkSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, checkSession]);

  const login = (userData: User) => {
    console.log('User logged in:', userData.email);
    setUser(userData);
    setLastActivity(Date.now());
    setSessionCheckCount(0); // Reset failure count on successful login
  };

  const logout = async () => {
    console.log('User logging out...');
    try {
      await logoutService();
      console.log('Logout service completed');
    } catch (error) {
      console.error('Logout service failed:', error);
      // Still clear local state even if server logout fails
    } finally {
      setUser(null);
      setLastActivity(Date.now());
      setSessionCheckCount(0);
    }
  };

  const refreshUser = async () => {
    console.log('Manual user refresh requested');
    setLoading(true);
    await checkSession();
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

// Hook to check if user session is active and valid
export function useSessionStatus() {
  const { user, loading, sessionCheckCount, lastActivity } = useAuth();
  const [isSessionActive, setIsSessionActive] = useState(false);

  useEffect(() => {
    setIsSessionActive(!!user && !loading);
  }, [user, loading]);

  return {
    isSessionActive,
    sessionCheckCount,
    lastActivity,
    timeSinceLastActivity: Date.now() - lastActivity,
  };
}
