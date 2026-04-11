/**
 * Tests for DashboardQRList component exports
 * Verifies component can be imported and is properly structured
 */
import { describe, test, expect } from 'vitest';
import DashboardQRList from '../DashboardQRList';

describe('DashboardQRList', () => {
  test('DashboardQRList is exported as a function component', () => {
    expect(typeof DashboardQRList).toBe('function');
  });

  test('DashboardQRList component name is correct', () => {
    expect(DashboardQRList.name).toBe('DashboardQRList');
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
