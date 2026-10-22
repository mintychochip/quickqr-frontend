import type { Policy } from '../router';

/** The largest body a write route reads. Bigger is a 413. */
export const BODY_CAP = 64 << 10;

export const SCOPES = {
  linksRead: 'links:read',
  linksWrite: 'links:write',
  analyticsRead: 'analytics:read',
} as const;

export const publicNone: Policy = { auth: 'public', class: 'none' };
export const publicRead: Policy = { auth: 'public', class: 'read' };
export const publicEmbed: Policy = { auth: 'public', class: 'embed' };
export const publicAuth: Policy = { auth: 'public', class: 'auth' };
export const optionalAuth: Policy = { auth: 'optional', class: 'auth' };
export const optionalCostly: Policy = { auth: 'optional', class: 'expensive' };
export const signedIn: Policy = { auth: 'any', class: 'read' };

export const readPolicy = (scope: string): Policy => ({ auth: 'any', scope, class: 'read' });
export const writePolicy = (scope: string): Policy => ({ auth: 'any', scope, class: 'write', maxBody: BODY_CAP });
