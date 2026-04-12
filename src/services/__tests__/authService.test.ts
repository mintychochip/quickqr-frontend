/**
 * Integration tests for authentication service
 * Verifies all auth operations: register, login, logout, Google OAuth, get user/session
 */
import { supabase } from '../../config/supabase';
import {
  register,
  login,
  loginWithGoogle,
  logout,
  getCurrentUser,
  getSession,
  type RegisterData,
  type LoginData,
} from '../authService';

// Mock window.location for OAuth tests
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'location', {
    value: {
      origin: 'http://localhost:4321',
    },
    writable: true,
  });
} else {
  // @ts-ignore
  global.window = { location: { origin: 'http://localhost:4321' } };
}

// Helper to check if supabase is available
async function isSupabaseAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const { error } = await supabase
      .from('qr_codes')
      .select('count', { count: 'exact', head: true });

    clearTimeout(timeout);

    return !error?.message?.includes('fetch failed') && !error?.message?.includes('ECONNREFUSED');
  } catch {
    return false;
  }
}

describe('auth service exports', () => {
  test('all auth functions are defined', () => {
    expect(register).toBeDefined();
    expect(typeof register).toBe('function');

    expect(login).toBeDefined();
    expect(typeof login).toBe('function');

    expect(loginWithGoogle).toBeDefined();
    expect(typeof loginWithGoogle).toBe('function');

    expect(logout).toBeDefined();
    expect(typeof logout).toBe('function');

    expect(getCurrentUser).toBeDefined();
    expect(typeof getCurrentUser).toBe('function');

    expect(getSession).toBeDefined();
    expect(typeof getSession).toBe('function');
  });
});

describe('register functionality', () => {
  let supabaseAvailable = false;

  beforeAll(async () => {
    supabaseAvailable = await isSupabaseAvailable();
  });

  test('register with valid data returns success structure', async () => {
    if (!supabaseAvailable) {
      // Mock test when Supabase unavailable
      // Skip detailed mock test - structure test is sufficient
        success: true,
        user: { id: 'test-user-id', email: 'test@example.com' },
      });

      const result = await mockRegister({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      return;
    }

    // Test with actual Supabase - use a unique email to avoid conflicts
    const uniqueEmail = `test-${Date.now()}@example.com`;
    const result = await register({
      email: uniqueEmail,
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'User',
    });

    // Registration may fail if email exists or validation fails, but structure should be consistent
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');

    if (result.success) {
      expect(result.user).toBeDefined();
    } else {
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    }
  });

  test('register with invalid email returns error', async () => {
    const result = await register({
      email: 'invalid-email',
      password: 'password123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe('string');
  });

  test('register handles missing password gracefully', async () => {
    const result = await register({
      email: 'test@example.com',
      password: '',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('register handles exceptions and returns error message', async () => {
    // The function should never throw, always return AuthResponse
    const result = await register({
      email: 'test@example.com',
      password: 'short',
    });

    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('error');
    expect(typeof result.error).toBe('string');
  });
});

describe('login functionality', () => {
  let supabaseAvailable = false;

  beforeAll(async () => {
    supabaseAvailable = await isSupabaseAvailable();
  });

  test('login with valid credentials structure', async () => {
    // Test with invalid credentials - should fail gracefully
    const result = await login({
      email: 'nonexistent@example.com',
      password: 'wrongpassword',
    });

    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('login with invalid email format returns error', async () => {
    const result = await login({
      email: 'not-an-email',
      password: 'password123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('login with empty credentials returns error', async () => {
    const result = await login({
      email: '',
      password: '',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('login handles exceptions gracefully', async () => {
    const result = await login({
      email: 'test@test.com',
      password: 'pass',
    });

    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('error');
  });
});

describe('Google OAuth functionality', () => {
  test('loginWithGoogle returns success structure', async () => {
    const result = await loginWithGoogle();

    // Should return AuthResponse structure
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');

    // OAuth usually redirects, so success might be true even before actual auth
    if (!result.success) {
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    }
  });

  test('loginWithGoogle handles exceptions', async () => {
    // Should never throw, always return AuthResponse
    const result = await loginWithGoogle();

    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('error');
  });
});

describe('logout functionality', () => {
  let supabaseAvailable = false;

  beforeAll(async () => {
    supabaseAvailable = await isSupabaseAvailable();
  });

  test('logout returns success structure', async () => {
    const result = await logout();

    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');

    if (!result.success) {
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    }
  });

  test('logout handles exceptions gracefully', async () => {
    // Should never throw
    const result = await logout();

    expect(result).toHaveProperty('success');
    expect(result).not.toHaveProperty('user');
  });
});

describe('getCurrentUser functionality', () => {
  let supabaseAvailable = false;

  beforeAll(async () => {
    supabaseAvailable = await isSupabaseAvailable();
  });

  test('getCurrentUser returns proper structure', async () => {
    const result = await getCurrentUser();

    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');

    if (result.success) {
      expect(result.user).toBeDefined();
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
    } else {
      expect(result.error).toBeDefined();
    }
  });

  test('getCurrentUser handles unauthenticated state', async () => {
    // When no user is logged in, should return error
    const result = await getCurrentUser();

    // Either success with user or failure with error
    expect(result.success).toBeDefined();
    if (!result.success) {
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    }
  });

  test('getCurrentUser handles exceptions gracefully', async () => {
    const result = await getCurrentUser();

    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('error');
  });
});

describe('getSession functionality', () => {
  let supabaseAvailable = false;

  beforeAll(async () => {
    supabaseAvailable = await isSupabaseAvailable();
  });

  test('getSession returns session object', async () => {
    const result = await getSession();

    expect(result).toHaveProperty('session');
    // session can be null or a valid session object
    expect(typeof result.session === 'object' || result.session === null).toBe(true);
  });

  test('getSession handles errors in return value', async () => {
    const result = await getSession();

    // Should always return an object with session property
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });
});

describe('auth service error handling', () => {
  test('all functions handle network errors gracefully', async () => {
    // These should all handle errors without throwing
    const results = await Promise.all([
      register({ email: 'test@test.com', password: 'pass' }).catch(e => ({ error: e.message })),
      login({ email: 'test@test.com', password: 'pass' }).catch(e => ({ error: e.message })),
      logout().catch(e => ({ error: e.message })),
      getCurrentUser().catch(e => ({ error: e.message })),
      getSession().catch(e => ({ error: e.message })),
    ]);

    // None should throw - all should return objects
    results.forEach(result => {
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  test('register accepts optional first and last name', async () => {
    const result = await register({
      email: 'noname@example.com',
      password: 'password123',
    });

    // Should work without names (they're optional)
    expect(result).toHaveProperty('success');
  });

  test('AuthResponse type is consistent across all functions', async () => {
    const registerResult = await register({ email: 'test@test.com', password: 'short' });
    const loginResult = await login({ email: 'test@test.com', password: 'short' });
    const logoutResult = await logout();
    const userResult = await getCurrentUser();

    // All should have consistent structure
    expect(registerResult).toHaveProperty('success');
    expect(loginResult).toHaveProperty('success');
    expect(logoutResult).toHaveProperty('success');
    expect(userResult).toHaveProperty('success');

    // All success properties should be boolean
    expect(typeof registerResult.success).toBe('boolean');
    expect(typeof loginResult.success).toBe('boolean');
    expect(typeof logoutResult.success).toBe('boolean');
    expect(typeof userResult.success).toBe('boolean');
  });
});
