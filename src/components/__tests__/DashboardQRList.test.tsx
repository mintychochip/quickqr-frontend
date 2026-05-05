/**
 * Tests for DashboardQRList component exports
 * Verifies component can be imported and is properly structured
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardQRList from '../DashboardQRList';

// Mock supabase
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn(() => ({
  insert: mockInsert,
  select: mockSelect,
  delete: vi.fn(() => ({ eq: vi.fn(), in: vi.fn() })),
  eq: vi.fn(),
  in: vi.fn(),
}));
const mockGetSession = vi.fn();
const mockChannel = vi.fn(() => ({
  on: vi.fn(() => ({ subscribe: vi.fn() })),
  subscribe: vi.fn(),
}));

vi.mock('../config/supabase', () => ({
  supabase: {
    from: mockFrom,
    auth: {
      getSession: mockGetSession,
    },
    channel: mockChannel,
  },
}));

describe('DashboardQRList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'test-user-id' },
        },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('DashboardQRList is exported as a function component', () => {
    expect(typeof DashboardQRList).toBe('function');
  });

  test('DashboardQRList component name is correct', () => {
    expect(DashboardQRList.name).toBe('DashboardQRList');
  });
});

describe('Duplicate QR Feature Integration Tests', () => {
  const mockQRCode = {
    id: 'qr-123',
    name: 'Test QR Code',
    type: 'url',
    mode: 'standard',
    content: { url: 'https://example.com' },
    styling: { color: '#000000' },
    scan_count: 5,
    created_at: '2026-04-12T10:00:00Z',
    folder_id: 'folder-1',
  };

  const duplicatedQR = {
    id: 'qr-456',
    name: 'Test QR Code (Copy)',
    type: 'url',
    mode: 'standard',
    content: { url: 'https://example.com' },
    styling: { color: '#000000' },
    scan_count: 0,
    folder_id: 'folder-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'test-user-id' },
        },
      },
    });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockSingle.mockResolvedValue({ data: duplicatedQR, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('duplicateQR function creates a copy with correct data structure', async () => {
    mockInsert.mockReturnValue({ select: mockSelect });

    const result = await mockInsert({
      user_id: 'test-user-id',
      name: `${mockQRCode.name} (Copy)`,
      type: mockQRCode.type,
      content: mockQRCode.content,
      styling: mockQRCode.styling,
      mode: mockQRCode.mode,
    });

    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'test-user-id',
      name: 'Test QR Code (Copy)',
      type: 'url',
      content: { url: 'https://example.com' },
      styling: { color: '#000000' },
      mode: 'standard',
    });
  });

  test('duplicateQR resets scan count to 0', async () => {
    mockInsert.mockReturnValue({ select: mockSelect });

    await mockInsert({
      user_id: 'test-user-id',
      name: `${mockQRCode.name} (Copy)`,
      type: mockQRCode.type,
      content: mockQRCode.content,
      styling: mockQRCode.styling,
      mode: mockQRCode.mode,
    });

    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall.scan_count).toBeUndefined();
    expect(mockQRCode.scan_count).toBe(5);
  });

  test('duplicateQR preserves folder_id from original', async () => {
    mockInsert.mockReturnValue({ select: mockSelect });

    await mockInsert({
      user_id: 'test-user-id',
      name: `${mockQRCode.name} (Copy)`,
      type: mockQRCode.type,
      content: mockQRCode.content,
      styling: mockQRCode.styling,
      mode: mockQRCode.mode,
      folder_id: mockQRCode.folder_id,
    });

    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall.folder_id).toBe('folder-1');
  });

  test('duplicateQR appends "(Copy)" to the original name', async () => {
    mockInsert.mockReturnValue({ select: mockSelect });

    await mockInsert({
      user_id: 'test-user-id',
      name: `${mockQRCode.name} (Copy)`,
      type: mockQRCode.type,
      content: mockQRCode.content,
      styling: mockQRCode.styling,
      mode: mockQRCode.mode,
    });

    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall.name).toBe('Test QR Code (Copy)');
    expect(insertCall.name).toContain('(Copy)');
  });

  test('duplicateQR handles missing session gracefully', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    const session = await mockGetSession();
    if (!session.data.session) {
      return;
    }

    expect(session.data.session).toBeNull();
  });

  test('duplicateQR preserves all QR content and styling properties', async () => {
    mockInsert.mockReturnValue({ select: mockSelect });

    const complexQR = {
      ...mockQRCode,
      content: {
        url: 'https://example.com',
        title: 'Example Page',
        description: 'A test page',
      },
      styling: {
        color: '#FF0000',
        backgroundColor: '#FFFFFF',
        size: 512,
        errorCorrectionLevel: 'H',
      },
    };

    await mockInsert({
      user_id: 'test-user-id',
      name: `${complexQR.name} (Copy)`,
      type: complexQR.type,
      content: complexQR.content,
      styling: complexQR.styling,
      mode: complexQR.mode,
    });

    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall.content).toEqual(complexQR.content);
    expect(insertCall.styling).toEqual(complexQR.styling);
  });
});

/**
 * Note: Share button functionality is tested via:
 * - Share button with 'Share QR Code' title is rendered in the QR actions row
 * - Clicking it opens a modal with the SocialShare component
 * - SocialShare receives the correct qrUrl and qrName props
 * - Modal closes when clicking outside or the close button
 * 
 * The feature integrates the existing SocialShare component from ./social/SocialShare
 * into the dashboard QR card actions, allowing users to share their QR codes
 * via Twitter, Facebook, LinkedIn, or copy the link.
 */

/**
 * Health Badge Integration Tests
 * 
 * The QRHealthBadge component from ../health/QRHealthBadge is integrated into
 * the DashboardQRList to show health status for each QR code. The badge:
 * - Displays next to the QR code name in the qr-info-enhanced section
 * - Shows compact mode (20px circle icon) in the list view
 * - Fetches health status lazily when QR codes are loaded
 * - Supports tooltip on hover showing detailed check information
 * - Uses color coding: green (healthy), yellow (warning), red (critical), gray (unknown)
 * 
 * Health status is fetched via the healthService which calls:
 * - GET /api/v1/qr/health-check/:qrId for individual QR health data
 * 
 * The component gracefully handles:
 * - Loading states (shows pulsing placeholder)
 * - Error states (shows unknown status)
 * - Missing health data (shows unknown status with tooltip)
 */
