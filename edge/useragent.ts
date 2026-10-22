/** The device a user agent string comes from. Order matters: an Android phone's string also says Linux. */
export function detectDevice(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) return 'iOS';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('macintosh') || ua.includes('windows') || ua.includes('linux')) return 'Desktop';
  return 'Other';
}

/** The browser family. Chrome-based browsers also say Safari, so Chrome is checked first; anything unknown is a mobile browser. */
export function detectBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('firefox')) return 'Firefox';
  return 'Mobile Browser';
}
