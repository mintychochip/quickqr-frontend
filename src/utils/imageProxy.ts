/**
 * Utility functions for handling external images with CORS issues
 */

/**
 * Wraps an external image URL with a CORS proxy if needed
 * @param url - The original image URL
 * @returns The proxied URL or original URL if it's a data URL
 */
export function proxifyImageUrl(url: string): string {
  if (!url) return url;

  // Don't proxy data URLs
  if (url.startsWith('data:')) {
    return url;
  }

  // Don't proxy if it's already from weserv proxy
  if (url.includes('images.weserv.nl')) {
    return url;
  }

  // Use weserv.nl image proxy which is specifically designed for images
  // and handles CORS properly
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
}

/**
 * Validates if an image URL can be loaded
 * @param url - The image URL to validate
 * @returns Promise that resolves to true if image loads successfully
 */
export function validateImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url) {
      resolve(false);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timeout = setTimeout(() => {
      img.src = '';
      resolve(false);
    }, 10000); // 10 second timeout

    img.onload = () => {
      clearTimeout(timeout);
      resolve(true);
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };

    // Try with proxy first
    img.src = proxifyImageUrl(url);
  });
}

/**
 * Preload an image with CORS support
 * @param url - The image URL to preload
 * @returns Promise that resolves when image is loaded
 */
export async function preloadImage(url: string): Promise<string> {
  if (!url) return '';

  const isValid = await validateImageUrl(url);

  if (isValid) {
    return proxifyImageUrl(url);
  }

  throw new Error('Failed to load image. The image may not be accessible due to CORS restrictions.');
}
