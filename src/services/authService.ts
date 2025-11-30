/**
 * Authentication Service
 * Handles all auth-related API calls to the PHP backend
 * Enhanced with retry logic and better error handling for session persistence
 */

const API_BASE_URL = 'https://artemis.cs.csub.edu/~jlo';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay
const REQUEST_TIMEOUT = 10000; // 10 second timeout

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
  user?: {
    userid?: string;
    id?: number;
    email: string;
    phone?: string | null;
    admin?: boolean;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
}

/**
 * Delay function for retry logic
 */
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;

    // Don't retry on authentication errors (401)
    if (error instanceof Error &&
        (error.message.includes('401') || error.message.includes('Session expired'))) {
      throw error;
    }

    // Don't retry on client errors (4xx)
    if (error instanceof Error && error.message.match(/HTTP error! status: 4\d\d/)) {
      throw error;
    }

    const delayMs = RETRY_DELAY_BASE * Math.pow(2, MAX_RETRIES - retries);
    console.warn(`Retrying after ${delayMs}ms... (${retries} retries left)`);

    await delay(delayMs);
    return retryWithBackoff(fn, retries - 1);
  }
}

/**
 * Enhanced fetch with timeout and better error handling
 */
async function enhancedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error - please check your connection');
      }
    }

    throw error;
  }
}

/**
 * Register a new user with form data format
 */
export async function register(data: RegisterData): Promise<AuthResponse> {
  try {
    // Use form data format to match backend getInputData() function
    const formData = new URLSearchParams();
    formData.append('action', 'register');
    formData.append('email', data.email);
    formData.append('password', data.password);

    console.log('Attempting registration to:', `${API_BASE_URL}/auth_handler.php`);
    console.log('Registration data:', { email: data.email, password: '***' });

    const response = await enhancedFetch(`${API_BASE_URL}/auth_handler.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      credentials: 'include', // Include cookies for session
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Registration response:', result);
    return result;
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed. Please check your connection.',
    };
  }
}

/**
 * Login a user with form data format
 */
export async function login(data: LoginData): Promise<AuthResponse> {
  try {
    // Use form data format to match backend getInputData() function
    const formData = new URLSearchParams();
    formData.append('action', 'login');
    formData.append('email', data.email);
    formData.append('password', data.password);

    console.log('Attempting login to:', `${API_BASE_URL}/auth_handler.php`);
    console.log('Login data:', { email: data.email, password: '***' });

    const response = await enhancedFetch(`${API_BASE_URL}/auth_handler.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      credentials: 'include', // Include cookies for session
      mode: 'cors',
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Login response:', result);
    return result;
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed. Please check your connection.',
    };
  }
}

/**
 * Logout current user
 */
export async function logout(): Promise<AuthResponse> {
  try {
    const url = `${API_BASE_URL}/auth_handler.php?action=logout`;

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Logout failed',
    };
  }
}

/**
 * Get current user info with enhanced retry logic
 */
export async function getCurrentUser(): Promise<AuthResponse> {
  const url = `${API_BASE_URL}/auth_handler.php?action=me`;

  const fetchWithRetry = async (): Promise<AuthResponse> => {
    const response = await enhancedFetch(url, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
    });

    // Handle different response statuses appropriately
    if (response.status === 401) {
      console.warn('Session expired, user will need to login again');
      return { success: false, error: 'Session expired' };
    }

    if (response.status === 403) {
      console.warn('Access forbidden - possible CSRF issue');
      return { success: false, error: 'Access forbidden' };
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    try {
      const result = await response.json();
      console.log('Session validation successful');
      return result;
    } catch (jsonError) {
      throw new Error('Invalid response format from server');
    }
  };

  try {
    return await retryWithBackoff(fetchWithRetry);
  } catch (error) {
    console.error('Session check failed:', error);

    if (error instanceof Error) {
      if (error.message.includes('Session expired')) {
        return { success: false, error: 'Session expired' };
      }
      if (error.message.includes('Request timeout')) {
        return { success: false, error: 'Session check timeout - please try again' };
      }
      if (error.message.includes('Network error')) {
        return { success: false, error: 'Network error - please check your connection' };
      }
      return { success: false, error: error.message };
    }

    return { success: false, error: 'Failed to get user info' };
  }
}

/**
 * Refresh user session
 */
export async function refreshSession(): Promise<AuthResponse> {
  const url = `${API_BASE_URL}/auth_handler.php?action=refresh`;

  try {
    const response = await enhancedFetch(url, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Session refresh successful');
    return result;
  } catch (error) {
    console.error('Session refresh failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refresh session',
    };
  }
}
