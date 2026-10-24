import type { SiteBucket, SiteObject, SiteObjectBody } from '../sites';

/**
 * An in-memory stand-in for the R2 binding, so every edge test exercises the real site code without the Workers
 * runtime. It follows R2's small surface: keys sort, a list is one prefix page, and `head` never reads the body.
 */
export interface TestBucket extends SiteBucket {
  /** Every key currently stored, sorted, for assertions about what a request left behind. */
  keys(): string[];
}

interface Entry {
  bytes: Uint8Array;
  uploaded: Date;
}

export function testBucket(): TestBucket {
  const store = new Map<string, Entry>();

  const object = (key: string, entry: Entry): SiteObject => ({
    key,
    size: entry.bytes.byteLength,
    uploaded: entry.uploaded,
    httpEtag: `"${entry.bytes.byteLength}-${entry.uploaded.getTime()}"`,
  });

  const bytesOf = async (value: ArrayBuffer | ArrayBufferView | string | ReadableStream | Blob | null): Promise<Uint8Array> => {
    if (value === null) return new Uint8Array(0);
    if (typeof value === 'string') return new TextEncoder().encode(value);
    if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
    return new Uint8Array(await new Response(value).arrayBuffer());
  };

  return {
    async put(key, value) {
      const entry = { bytes: await bytesOf(value), uploaded: new Date() };
      store.set(key, entry);
      return object(key, entry);
    },

    async get(key) {
      const entry = store.get(key);
      if (!entry) return null;
      const body: SiteObjectBody = { ...object(key, entry), body: new Response(entry.bytes).body };
      return body;
    },

    async head(key) {
      const entry = store.get(key);
      return entry ? object(key, entry) : null;
    },

    async delete(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) store.delete(key);
    },

    // The cursor is the next key, which is opaque to callers and enough for the fake.
    async list(options = {}) {
      const prefix = options.prefix ?? '';
      const all = [...store.keys()].filter((key) => key.startsWith(prefix)).sort();
      const start = options.cursor ? Math.max(0, all.indexOf(options.cursor)) : 0;
      const limit = options.limit ?? 1000;
      const page = all.slice(start, start + limit);
      const cursor = start + limit < all.length ? all[start + limit] : undefined;
      return { objects: page.map((key) => object(key, store.get(key) as Entry)), truncated: cursor !== undefined, cursor };
    },

    keys: () => [...store.keys()].sort(),
  };
}
