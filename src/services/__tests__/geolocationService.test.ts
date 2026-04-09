/**
 * Integration tests for geolocationService
 * Verifies service functions are properly exported and callable
 */
import {
    lookupGeolocation,
    extractClientIP,
    clearGeolocationCache,
    getGeolocationCacheStats,
    isPrivateIP,
} from '../geolocationService';

describe('geolocationService exports', () => {
    test('lookupGeolocation is exported as a function', () => {
        expect(typeof lookupGeolocation).toBe('function');
    });

    test('extractClientIP is exported as a function', () => {
        expect(typeof extractClientIP).toBe('function');
    });

    test('clearGeolocationCache is exported as a function', () => {
        expect(typeof clearGeolocationCache).toBe('function');
    });

    test('getGeolocationCacheStats is exported as a function', () => {
        expect(typeof getGeolocationCacheStats).toBe('function');
    });
});

describe('extractClientIP', () => {
    test('extracts IP from x-forwarded-for header', () => {
        const headers = new Headers({
            'x-forwarded-for': '203.0.113.1, 70.41.3.18',
        });
        expect(extractClientIP(headers)).toBe('203.0.113.1');
    });

    test('extracts IP from x-real-ip header', () => {
        const headers = new Headers({
            'x-real-ip': '192.168.1.1',
        });
        expect(extractClientIP(headers)).toBe('192.168.1.1');
    });

    test('extracts IP from cf-connecting-ip header', () => {
        const headers = new Headers({
            'cf-connecting-ip': '1.2.3.4',
        });
        expect(extractClientIP(headers)).toBe('1.2.3.4');
    });

    test('prefers x-forwarded-for over other headers', () => {
        const headers = new Headers({
            'x-forwarded-for': '203.0.113.1',
            'x-real-ip': '192.168.1.1',
        });
        expect(extractClientIP(headers)).toBe('203.0.113.1');
    });

    test('returns unknown when no headers present', () => {
        const headers = new Headers();
        expect(extractClientIP(headers)).toBe('unknown');
    });
});

describe('lookupGeolocation - private IPs', () => {
    beforeEach(() => {
        clearGeolocationCache();
    });

    test('returns local location for localhost', async () => {
        const result = await lookupGeolocation('127.0.0.1');
        expect(result.success).toBe(true);
        expect(result.location?.country).toBe('Local');
        expect(result.location?.city).toBe('Local Network');
    });

    test('returns local location for ::1', async () => {
        const result = await lookupGeolocation('::1');
        expect(result.success).toBe(true);
        expect(result.location?.country).toBe('Local');
    });

    test('returns local location for 10.x.x.x', async () => {
        const result = await lookupGeolocation('10.0.0.1');
        expect(result.success).toBe(true);
        expect(result.location?.country).toBe('Local');
    });

    test('returns local location for 192.168.x.x', async () => {
        const result = await lookupGeolocation('192.168.1.1');
        expect(result.success).toBe(true);
        expect(result.location?.country).toBe('Local');
    });

    test('returns local location for 172.16-31.x.x', async () => {
        const result = await lookupGeolocation('172.16.0.1');
        expect(result.success).toBe(true);
        expect(result.location?.country).toBe('Local');
    });
});

describe('geolocation cache', () => {
    beforeEach(() => {
        clearGeolocationCache();
    });

    test('cache stats return initial state', () => {
        const stats = getGeolocationCacheStats();
        expect(stats.size).toBe(0);
        expect(stats.maxAge).toBeGreaterThan(0);
    });

    test('clearGeolocationCache resets cache', () => {
        // Cache would be populated by previous lookups
        clearGeolocationCache();
        const stats = getGeolocationCacheStats();
        expect(stats.size).toBe(0);
    });
});

// Note: Tests for actual API lookup are skipped to avoid external API calls during testing
// The lookupGeolocation function for public IPs is tested via integration tests
// that mock the fetch call, or can be verified manually
describe('lookupGeolocation - public IP handling', () => {
    test('function handles public IP input without throwing', async () => {
        // This will likely fail the API call in test environment, but should not throw
        const result = await lookupGeolocation('8.8.8.8');
        // Result structure should be valid regardless of API success
        expect(result).toHaveProperty('success');
        if (result.success) {
            expect(result.location).toBeDefined();
        } else {
            expect(result.error).toBeDefined();
        }
    });
});
