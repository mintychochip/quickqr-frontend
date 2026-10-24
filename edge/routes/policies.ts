import type { Policy } from '../router';
import { SITE_FILE_CAP } from '../sites';

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
/** A site file is uploaded raw and read whole, so this write allows the file cap rather than a JSON body cap. */
export const siteFileWritePolicy: Policy = { auth: 'any', scope: SCOPES.linksWrite, class: 'write', maxBody: SITE_FILE_CAP };

/** A browser session only: an API key, once there are any, must not claim a gift. */
export const sessionWrite: Policy = { auth: 'session', class: 'write', maxBody: BODY_CAP };
/** An administrator's session (an email on ADMIN_EMAILS). Anyone else gets the 404 of a path that is not there. */
export const adminRead: Policy = { auth: 'admin', class: 'read' };
export const adminWrite: Policy = { auth: 'admin', class: 'write', maxBody: BODY_CAP };
