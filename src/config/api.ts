export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'https://artemis.cs.csub.edu/~quickqr/',
  endpoints: {
    create: '/qrcode.php',
    update: '/qrcode.php',
    delete: '/qrcode.php',
    get: '/qrcode.php'
  }
} as const;

export const APP_URL = import.meta.env.VITE_APP_BASE_URL || 'https://quickqr-frontend.vercel.app';

// Helper function to build full API URL
export const getApiUrl = (endpoint: keyof typeof API_CONFIG.endpoints): string => {
  return `${API_CONFIG.baseUrl}${API_CONFIG.endpoints[endpoint]}`;
};
