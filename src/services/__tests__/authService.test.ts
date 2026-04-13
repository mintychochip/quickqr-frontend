/**
 * Integration tests for authService
 * Verifies service functions are properly exported and callable
 */
import {
  register,
  login,
  loginWithGoogle,
  logout,
  getCurrentUser,
  getSession,
} from '../authService';

describe('authService exports', () => {
  test('register is exported as a function', () => {
    expect(typeof register).toBe('function');
  });

  test('login is exported as a function', () => {
    expect(typeof login).toBe('function');
  });

  test('loginWithGoogle is exported as a function', () => {
    expect(typeof loginWithGoogle).toBe('function');
  });

  test('logout is exported as a function', () => {
    expect(typeof logout).toBe('function');
  });

  test('getCurrentUser is exported as a function', () => {
    expect(typeof getCurrentUser).toBe('function');
  });

  test('getSession is exported as a function', () => {
    expect(typeof getSession).toBe('function');
  });
});

describe('authService response shapes', () => {
  test('register returns proper response shape when unauthenticated', async () => {
    const result = await register({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
    });
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
    // Either success with user or failure with error
    if (!result.success) {
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    }
  }, 10000);

  test('login returns proper response shape when unauthenticated', async () => {
    const result = await login({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
    if (!result.success) {
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    }
  }, 10000);

  test('loginWithGoogle returns proper response shape', async () => {
    const result = await loginWithGoogle();
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
    if (!result.success) {
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    }
  }, 10000);

  test('logout returns proper response shape', async () => {
    const result = await logout();
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
    if (!result.success) {
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    }
  }, 10000);

  test('getCurrentUser returns proper response shape when unauthenticated', async () => {
    const result = await getCurrentUser();
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
    if (!result.success) {
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    }
  }, 10000);

  test('getSession returns proper response shape', async () => {
    const result = await getSession();
    expect(result).toHaveProperty('session');
    // session can be null or a Session object
  }, 10000);
});

describe('authService error handling', () => {
  test('handles malformed email gracefully', async () => {
    const result = await login({
      email: 'not-an-email',
      password: 'password123',
    });
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
  }, 10000);

  test('handles empty password gracefully', async () => {
    const result = await login({
      email: 'test@example.com',
      password: '',
    });
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
  }, 10000);

  test('handles empty email gracefully', async () => {
    const result = await register({
      email: '',
      password: 'password123',
    });
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
  }, 10000);

  test('handles very long password gracefully', async () => {
    const result = await login({
      email: 'test@example.com',
      password: 'a'.repeat(1000),
    });
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
  }, 10000);
});
