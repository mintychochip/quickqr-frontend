export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  endpoints: {
    create: '/qrcode_handler.php?action=create',
    update: '/qrcode_handler.php?action=update',
    delete: '/qrcode_handler.php?action=delete',
    get: '/qrcode_handler.php?action=get'
  }
} as const;

export const APP_URL = import.meta.env.VITE_APP_BASE_URL || 'https://quickqr-frontend.vercel.app';

// Helper function to build full API URL
export const getApiUrl = (endpoint: keyof typeof API_CONFIG.endpoints): string => {
  return `${API_CONFIG.baseUrl}${API_CONFIG.endpoints[endpoint]}`;
};
