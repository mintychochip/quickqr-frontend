/**
 * Geolocation Service
 * Provides IP-based geolocation lookup for scan tracking
 * Uses free ipapi.co service with fallback
 */

export interface GeoLocation {
    country: string;
    country_code: string;
    city: string;
    region: string;
    latitude: number;
    longitude: number;
}

export interface GeoLocationResult {
    success: boolean;
    location?: GeoLocation;
    error?: string;
}

// Cache for geolocation results to avoid repeated API calls
const geoCache = new Map<string, GeoLocation>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

interface CacheEntry {
    location: GeoLocation;
    timestamp: number;
}

const cacheWithTTL = new Map<string, CacheEntry>();

/**
 * Looks up geolocation data for an IP address
 * Uses ipapi.co free tier (45 requests per minute)
 * Falls back to empty location on failure
 */
export async function lookupGeolocation(ipAddress: string): Promise<GeoLocationResult> {
    // Don't lookup private/reserved IPs
    if (isPrivateIP(ipAddress)) {
        return {
            success: true,
            location: {
                country: 'Local',
                country_code: 'LO',
                city: 'Local Network',
                region: 'Local',
                latitude: 0,
                longitude: 0,
            },
        };
    }

    // Check cache first
    const cached = cacheWithTTL.get(ipAddress);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return { success: true, location: cached.location };
    }

    try {
        // Use ipapi.co free API (no key required for non-commercial, 45 req/min)
        const response = await fetch(`https://ipapi.co/${ipAddress}/json/`, {
            headers: { 'User-Agent': 'quickqr-analytics/1.0' },
        });

        if (!response.ok) {
            throw new Error(`Geolocation API error: ${response.status}`);
        }

        const data = await response.json();

        // Handle API errors (like rate limiting)
        if (data.error) {
            throw new Error(data.error);
        }

        const location: GeoLocation = {
            country: data.country_name || 'Unknown',
            country_code: data.country_code || 'UN',
            city: data.city || 'Unknown',
            region: data.region || 'Unknown',
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
        };

        // Cache the result
        cacheWithTTL.set(ipAddress, { location, timestamp: Date.now() });

        return { success: true, location };
    } catch (error) {
        // Return empty location on error so scan still gets recorded
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Geolocation lookup failed',
        };
    }
}

/**
 * Checks if an IP is private/reserved (RFC 1918)
 */
export function isPrivateIP(ip: string): boolean {
    // Check for localhost and common private ranges
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
        return true;
    }

    // IPv4 private ranges
    const parts = ip.split('.').map(Number);
    if (parts.length === 4) {
        // 10.0.0.0/8
        if (parts[0] === 10) return true;
        // 172.16.0.0/12
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
        // 192.168.0.0/16
        if (parts[0] === 192 && parts[1] === 168) return true;
    }

    return false;
}

/**
 * Extracts client IP from request headers
 * Handles common proxy headers and falls back to direct connection
 */
export function extractClientIP(headers: Headers): string {
    // Check common proxy headers (in order of preference)
    const headerNames = [
        'x-forwarded-for',
        'x-real-ip',
        'cf-connecting-ip', // Cloudflare
        'x-client-ip',
    ];

    for (const header of headerNames) {
        const value = headers.get(header);
        if (value) {
            // X-Forwarded-For can contain multiple IPs, take the first (client)
            const firstIp = value.split(',')[0].trim();
            if (firstIp) return firstIp;
        }
    }

    // Fallback - will need to be provided by server
    return 'unknown';
}

/**
 * Clears the geolocation cache
 */
export function clearGeolocationCache(): void {
    cacheWithTTL.clear();
}

/**
 * Gets cache statistics
 */
export function getGeolocationCacheStats(): { size: number; maxAge: number } {
    return {
        size: cacheWithTTL.size,
        maxAge: CACHE_TTL_MS,
    };
}
