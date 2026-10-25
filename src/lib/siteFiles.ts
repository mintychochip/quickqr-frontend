/** The same limits the site API enforces, checked before a file crosses the network. */
export const SITE_FILE_CAP = 1 << 20;
export const SITE_FILES_MAX = 64;
export const SITE_TOTAL_CAP = 10 << 20;
export const SITE_PATH_CAP = 200;
const SITE_SEGMENT_CAP = 100;

export type SiteFileSelection = { file: File; path: string };

type InspectOptions = {
  existingPaths?: string[];
  existingBytes?: number;
};

type InspectResult = {
  files: SiteFileSelection[];
  problems: string[];
  totalBytes: number;
};

function relativePath(file: File): string {
  const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath?.replace(/\\/g, '/');
  if (!relative) return file.name;
  const slash = relative.indexOf('/');
  return slash === -1 ? file.name : relative.slice(slash + 1);
}

/** A file's path relative to the site root, or null when the host would refuse it. */
export function sitePathFor(file: File): string | null {
  const path = relativePath(file).replace(/\\/g, '/').replace(/^\/+/, '');
  if (!path || path.length > SITE_PATH_CAP || path.includes('//')) return null;
  for (const segment of path.split('/')) {
    if (!segment || segment.length > SITE_SEGMENT_CAP) return null;
    if (segment === '.' || segment === '..') return null;
    for (const character of segment) {
      const code = character.codePointAt(0) ?? 0;
      if (code < 0x20 || code === 0x7f || character === '?' || character === '#') return null;
    }
  }
  return path;
}

/**
 * Splits a selection into the files that can be uploaded and the reasons the rest cannot. A site's existing files
 * count toward the same 64-file and 10 MiB limits, so adding one file to a full site is refused before it is sent.
 */
export function inspectSiteSelection(files: File[], options: InspectOptions = {}): InspectResult {
  const existingPaths = options.existingPaths ?? [];
  const seen = new Set(existingPaths);
  const accepted: SiteFileSelection[] = [];
  const problems: string[] = [];
  let totalBytes = options.existingBytes ?? 0;

  for (const file of files) {
    const path = sitePathFor(file);
    if (!path) {
      problems.push(`${file.name}: that path cannot be served.`);
      continue;
    }
    if (seen.has(path)) {
      problems.push(`${path}: that file is already in the site.`);
      continue;
    }
    if (file.size > SITE_FILE_CAP) {
      problems.push(`${path}: a file may be at most 1 MiB.`);
      continue;
    }
    if (existingPaths.length + accepted.length >= SITE_FILES_MAX) {
      problems.push(`A site may hold at most ${SITE_FILES_MAX} files.`);
      continue;
    }
    if (totalBytes + file.size > SITE_TOTAL_CAP) {
      problems.push('A site may hold at most 10 MiB.');
      continue;
    }
    accepted.push({ file, path });
    seen.add(path);
    totalBytes += file.size;
  }

  return { files: accepted, problems, totalBytes };
}

/** The host serves a site's root from index.html; nested indexes do not stand in for it. */
export function hasRootIndex(files: { path: string }[]): boolean {
  return files.some((file) => file.path === 'index.html');
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}
