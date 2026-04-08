import { QRCodeStylingOptions } from '../types/qrcode.types';

export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'personal' | 'events' | 'marketing' | 'social';
  icon: string;
  type: string;
  defaultContent: Record<string, string>;
  styling: QRCodeStylingOptions & { errorCorrectionLevel?: string };
}

export const builtinTemplates: Template[] = [
  {
    id: 'wifi-guest',
    name: 'Guest WiFi',
    description: 'Quick connect for coffee shops, hotels, events',
    category: 'business',
    icon: 'wifi',
    type: 'wifi',
    defaultContent: {
      ssid: 'GuestNetwork',
      password: '',
      encryption: 'WPA',
    },
    styling: {
      dotsOptions: { color: '#14b8a6', type: 'rounded' },
      backgroundOptions: { color: '#f0fdfa' },
      cornersSquareOptions: { color: '#14b8a6', type: 'rounded' },
      cornersDotOptions: { color: '#14b8a6', type: 'rounded' },
      errorCorrectionLevel: 'M',
    },
  },
  {
    id: 'business-card',
    name: 'Business Card',
    description: 'Professional vCard for networking',
    category: 'business',
    icon: 'user',
    type: 'vcard',
    defaultContent: {
      firstName: 'John',
      lastName: 'Doe',
      phone: '',
      email: '',
      company: '',
      title: '',
      website: '',
    },
    styling: {
      dotsOptions: { color: '#1e40af', type: 'square' },
      backgroundOptions: { color: '#ffffff' },
      cornersSquareOptions: { color: '#1e40af', type: 'square' },
      cornersDotOptions: { color: '#1e40af', type: 'square' },
      errorCorrectionLevel: 'M',
    },
  },
  {
    id: 'event-ticket',
    name: 'Event Ticket',
    description: 'Conferences, concerts, meetups',
    category: 'events',
    icon: 'calendar',
    type: 'calendar',
    defaultContent: {
      title: 'My Event',
      location: '',
      start: '',
      end: '',
      description: '',
    },
    styling: {
      dotsOptions: { color: '#7c3aed', type: 'dots' },
      backgroundOptions: { color: '#faf5ff' },
      cornersSquareOptions: { color: '#7c3aed', type: 'extra-rounded' },
      cornersDotOptions: { color: '#7c3aed', type: 'rounded' },
      errorCorrectionLevel: 'M',
    },
  },
  {
    id: 'restaurant-menu',
    name: 'Restaurant Menu',
    description: 'Contactless dining with PDF menu',
    category: 'business',
    icon: 'utensils',
    type: 'pdf',
    defaultContent: {
      url: '',
      title: 'Our Menu',
    },
    styling: {
      dotsOptions: { color: '#ea580c', type: 'rounded' },
      backgroundOptions: { color: '#fff7ed' },
      cornersSquareOptions: { color: '#ea580c', type: 'rounded' },
      cornersDotOptions: { color: '#ea580c', type: 'rounded' },
      errorCorrectionLevel: 'M',
    },
  },
  {
    id: 'payment-paypal',
    name: 'PayPal Payment',
    description: 'Accept payments or donations',
    category: 'business',
    icon: 'dollar-sign',
    type: 'url',
    defaultContent: {
      url: 'https://paypal.me/',
    },
    styling: {
      dotsOptions: { color: '#16a34a', type: 'square' },
      backgroundOptions: { color: '#f0fdf4' },
      cornersSquareOptions: { color: '#16a34a', type: 'rounded' },
      cornersDotOptions: { color: '#16a34a', type: 'rounded' },
      errorCorrectionLevel: 'M',
    },
  },
  {
    id: 'social-instagram',
    name: 'Instagram Profile',
    description: 'Share your Instagram',
    category: 'social',
    icon: 'instagram',
    type: 'social',
    defaultContent: {
      platform: 'instagram',
      url: 'https://instagram.com/',
    },
    styling: {
      dotsOptions: { color: '#e11d48', type: 'rounded' },
      backgroundOptions: { color: '#fff1f2' },
      cornersSquareOptions: { color: '#e11d48', type: 'rounded' },
      cornersDotOptions: { color: '#e11d48', type: 'dots' },
      errorCorrectionLevel: 'M',
    },
  },
  {
    id: 'social-linkedin',
    name: 'LinkedIn Profile',
    description: 'Professional networking',
    category: 'social',
    icon: 'linkedin',
    type: 'social',
    defaultContent: {
      platform: 'linkedin',
      url: 'https://linkedin.com/in/',
    },
    styling: {
      dotsOptions: { color: '#0077b5', type: 'square' },
      backgroundOptions: { color: '#f0f9ff' },
      cornersSquareOptions: { color: '#0077b5', type: 'square' },
      cornersDotOptions: { color: '#0077b5', type: 'square' },
      errorCorrectionLevel: 'M',
    },
  },
  {
    id: 'app-download',
    name: 'App Download',
    description: 'App Store + Play Store links',
    category: 'marketing',
    icon: 'smartphone',
    type: 'app',
    defaultContent: {
      name: 'My App',
      appStoreUrl: '',
      playStoreUrl: '',
    },
    styling: {
      dotsOptions: { color: '#6366f1', type: 'rounded' },
      backgroundOptions: { color: '#eef2ff' },
      cornersSquareOptions: { color: '#6366f1', type: 'rounded' },
      cornersDotOptions: { color: '#6366f1', type: 'rounded' },
      errorCorrectionLevel: 'M',
    },
  },
];

export const getTemplateById = (id: string): Template | undefined => {
  return builtinTemplates.find(t => t.id === id);
};

export const getTemplatesByCategory = (category: Template['category']): Template[] => {
  return builtinTemplates.filter(t => t.category === category);
};

export const getAllCategories = (): Template['category'][] => {
  return ['business', 'personal', 'events', 'marketing', 'social'];
};
