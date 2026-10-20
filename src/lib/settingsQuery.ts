import type { Link } from '../types';

export type SettingsQuery = {
  title?: string;
  destination_url?: string;
  ad_style?: Link['ad_style'];
  /** Public pages to read as style context. */
  siteUrls: string[];
  /** Remainder passed through the same style prompt logic as the studio bar. */
  stylePrompt: string;
};

const AD_STYLES: Record<string, Link['ad_style']> = {
  direct: 'direct',
  banner: 'sponsor_banner',
  sponsor: 'sponsor_banner',
  'sponsor banner': 'sponsor_banner',
  interstitial: 'interstitial_3s',
  '3s': 'interstitial_3s',
  '3s sponsor': 'interstitial_3s',
};

/** Split a settings search into field edits and a style phrase. */
export function parseSettingsQuery(input: string): SettingsQuery {
  const query: SettingsQuery = { stylePrompt: '', siteUrls: [] };
  const styleBits: string[] = [];

  for (const clause of input
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)) {
    const title = clause.match(/^(?:title|rename|name)\s+(?:to\s+)?(.+)$/i);
    if (title?.[1]) {
      query.title = title[1].trim();
      continue;
    }

    const destination = clause.match(/^(?:destination|url|link)\s+(https?:\/\/\S+)$/i);
    if (destination?.[1]) {
      query.destination_url = cleanSiteURL(destination[1]);
      continue;
    }
    const site = clause.match(/^(?:site|page|campaign)\s+(https?:\/\/\S+)$/i);
    if (site?.[1] || /^https?:\/\//i.test(clause)) {
      query.siteUrls.push(cleanSiteURL(site?.[1] ?? clause));
      continue;
    }

    const ad = clause.match(/^(?:ad|ads|format)\s+(.+)$/i);
    const adKey = (ad?.[1] ?? clause).trim().toLowerCase();
    if (ad?.[1] && AD_STYLES[adKey]) {
      query.ad_style = AD_STYLES[adKey];
      continue;
    }
    if (!ad && AD_STYLES[adKey] && /^(direct|banner|sponsor|interstitial)$/i.test(clause)) {
      query.ad_style = AD_STYLES[adKey];
      continue;
    }

    styleBits.push(clause);
  }

  query.stylePrompt = styleBits.join(', ');
  return query;
}

function cleanSiteURL(value: string): string {
  return value.trim().replace(/[),.;]+$/, '');
}
