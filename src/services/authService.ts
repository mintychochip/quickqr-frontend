/**
 * Authentication Service
 * Handles auth using Supabase
 */
import { supabase } from '../config/supabase';
import type { User } from '@supabase/supabase-js';

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: User;
}

/**
 * Register a new user
 */
export async function register(data: RegisterData): Promise<AuthResponse> {
  try {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName || '',
          last_name: data.lastName || '',
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, user: authData.user ?? undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    };
  }
}

/**
 * Login a user
 */
export async function login(data: LoginData): Promise<AuthResponse> {
  try {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, user: authData.user ?? undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    };
  }
}

/**
 * Login with Google OAuth
 */
export async function loginWithGoogle(): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Google login failed',
    };
  }
}

/**
 * Logout current user
 */
export async function logout(): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Logout failed',
    };
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<AuthResponse> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!user) {
      return { success: false, error: 'No user found' };
    }

    return { success: true, user };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user',
    };
  }
}

/**
 * Get current session
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) return { session: null, error: error.message };
  return { session };
}
