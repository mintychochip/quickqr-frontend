import {
  SITE_FILE_CAP,
  SITE_FILES_MAX,
  SITE_TOTAL_CAP,
  formatBytes,
  hasRootIndex,
  inspectSiteSelection,
  sitePathFor,
} from './siteFiles';

function picked(name: string, relative = '', size = 1): File {
  const file = new File([new Uint8Array(size)], name);
  if (relative) Object.defineProperty(file, 'webkitRelativePath', { value: relative });
  return file;
}

describe('sitePathFor', () => {
  test('strips the selected folder and keeps nested paths', () => {
    expect(sitePathFor(picked('index.html', 'my-site/index.html'))).toBe('index.html');
    expect(sitePathFor(picked('site.css', 'my-site/css/site.css'))).toBe('css/site.css');
  });

  test('uses the bare filename for a flat selection', () => {
    expect(sitePathFor(picked('index.html'))).toBe('index.html');
    expect(sitePathFor(picked('photo.webp'))).toBe('photo.webp');
  });

  test('normalizes backslashes and a leading slash', () => {
    expect(sitePathFor(picked('a.css', 'my-site\\css\\a.css'))).toBe('css/a.css');
    expect(sitePathFor(picked('a.css', 'my-site//css/a.css'))).toBe('css/a.css');
  });

  test('refuses paths the host would not safely serve', () => {
    expect(sitePathFor(picked('x', 'site/../secret.html'))).toBeNull();
    expect(sitePathFor(picked('x', 'site/a//b.html'))).toBeNull();
    expect(sitePathFor(picked('x', 'site/a?b.html'))).toBeNull();
    expect(sitePathFor(picked('x', 'site/a#b.html'))).toBeNull();
    expect(sitePathFor(picked('x', `site/${'a'.repeat(101)}.html`))).toBeNull();
    expect(sitePathFor(picked('x', `site/${'a/'.repeat(101)}b.html`))).toBeNull();
  });
});

describe('inspectSiteSelection', () => {
  test('accepts a folder with an index and reports the total size', () => {
    const result = inspectSiteSelection([
      picked('index.html', 'site/index.html', 10),
      picked('site.css', 'site/css/site.css', 20),
    ]);
    expect(result.problems).toEqual([]);
    expect(result.files.map((entry) => entry.path)).toEqual(['index.html', 'css/site.css']);
    expect(result.totalBytes).toBe(30);
  });

  test('reports a file over 1 MiB instead of accepting it', () => {
    const result = inspectSiteSelection([picked('index.html', '', SITE_FILE_CAP + 1)]);
    expect(result.files).toEqual([]);
    expect(result.problems[0]?.includes('1 MiB')).toBe(true);
  });

  test('refuses to go over the site total, not just the new bytes', () => {
    const result = inspectSiteSelection([picked('index.html', '', 2)], {
      existingBytes: SITE_TOTAL_CAP - 1,
    });
    expect(result.files).toEqual([]);
    expect(result.problems[0]?.includes('10 MiB')).toBe(true);
  });

  test('counts existing files toward the 64-file cap', () => {
    const result = inspectSiteSelection([picked('index.html')], {
      existingPaths: Array.from({ length: SITE_FILES_MAX }, (_, index) => `file-${index}.txt`),
    });
    expect(result.files).toEqual([]);
    expect(result.problems[0]?.includes('64 files')).toBe(true);
  });

  test('refuses a path that is already in the site or chosen twice', () => {
    const result = inspectSiteSelection([picked('index.html'), picked('index.html')], {
      existingPaths: ['index.html'],
    });
    expect(result.files).toEqual([]);
    expect(result.problems).toHaveLength(2);
  });

  test('keeps the good files and names the bad one', () => {
    const result = inspectSiteSelection([
      picked('index.html'),
      picked('bad', 'site/../bad.html'),
    ]);
    expect(result.files.map((entry) => entry.path)).toEqual(['index.html']);
    expect(result.problems).toHaveLength(1);
  });
});

describe('hasRootIndex', () => {
  test('is true only for index.html at the root', () => {
    expect(hasRootIndex([{ path: 'index.html' }])).toBe(true);
    expect(hasRootIndex([{ path: 'docs/index.html' }])).toBe(false);
    expect(hasRootIndex([{ path: 'index.htm' }])).toBe(false);
  });
});

describe('formatBytes', () => {
  test('reads in bytes, KiB, and MiB', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KiB');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MiB');
  });
});
