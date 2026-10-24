import type { Db } from './db';
import type { SiteBucket } from './sites';

/**
 * Everything the backend reads from the platform. `DB` is the D1 binding; the rest are plain variables and secrets
 * (see docs/content/docs/self-hosting.mdx for what each one does). Every optional value is off when unset.
 */
export interface Env {
  DB: Db;
  /** The R2 binding holding hosted site files. Unset on a deployment that does not host sites. */
  SITES?: SiteBucket;
  /** The public sites origin, such as https://sites.quickqr.app. The app's own origin 301s `/s/` here. */
  SITES_PUBLIC_URL?: string;
  /** Pages static assets, used to fall through to the app for paths the API does not own. */
  ASSETS?: { fetch(request: Request): Promise<Response> };

  OAUTH_REDIRECT_ORIGIN?: string;
  APP_PUBLIC_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  OAUTH_DEV?: string;

  /** Who may use the admin routes: addresses separated by commas. A secret, never in a file. Unset means nobody. */
  ADMIN_EMAILS?: string;

  /** Keys the hash that stands in for a scanner's IP address. A secret every deployment must set: without it scans are not recorded. */
  SCAN_HASH_KEY: string;
  SCAN_RETENTION_DAYS?: string;

  TYPESAFE_API_KEY?: string;
  TYPESAFE_MODEL?: string;
  TYPESAFE_JEV_STYLE?: string;
  STYLE_LLM_API_KEY?: string;
  STYLE_LLM_MODEL?: string;
  STYLE_LLM_BASE_URL?: string;
  XAI_API_KEY?: string;
  XAI_MODEL?: string;
}
