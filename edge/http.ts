export const INVALID_BODY = 'Invalid request body';

/** The platform's fetch, as a plain function so a test can stand in for it without reproducing everything Bun adds to the global. */
export type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/** A failure that maps straight to a response: the router turns it into `{"error": message}` with this status. */
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function json(status: number, data: unknown, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

export function errorJson(status: number, message: string): Response {
  return json(status, { error: message });
}

export function html(status: number, body: string, headers: HeadersInit = {}): Response {
  return new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', ...headers } });
}

/** The token of an `Authorization: Bearer <token>` header, or '' when there is none. The scheme is case-insensitive. */
export function bearerToken(req: Request): string {
  const scheme = 'Bearer ';
  const header = req.headers.get('Authorization') ?? '';
  if (header.length <= scheme.length || header.slice(0, scheme.length).toLowerCase() !== scheme.toLowerCase()) return '';
  return header.slice(scheme.length).trim();
}

/** The request body, no larger than `cap` bytes when one is given. Too large is a 413. */
export async function readBytes(req: Request, cap: number | undefined): Promise<Uint8Array> {
  if (!req.body) return new Uint8Array(0);
  const declared = Number(req.headers.get('Content-Length'));
  if (cap !== undefined && Number.isFinite(declared) && declared > cap) throw new HttpError(413, 'Request body too large');
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (cap !== undefined && total > cap) {
      await reader.cancel();
      throw new HttpError(413, 'Request body too large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function readText(req: Request, cap: number | undefined): Promise<string> {
  return new TextDecoder().decode(await readBytes(req, cap));
}

/** Reads a JSON body no larger than `cap` bytes. Too large is 413; empty or malformed is 400. */
export async function readJson<T = unknown>(req: Request, cap?: number): Promise<T> {
  const text = await readText(req, cap);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(400, INVALID_BODY);
  }
}

/** Reads a form body (urlencoded) no larger than `cap` bytes. */
export async function readForm(req: Request, cap?: number): Promise<URLSearchParams> {
  return new URLSearchParams(await readText(req, cap));
}

export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * A decoded JSON body that must be an object. `null` counts as an object with no fields, because that is what Go's
 * decoder makes of it; an array, string, or number is a 400.
 */
export function bodyObject(body: unknown): Record<string, unknown> {
  if (body === null) return {};
  if (!isRecord(body)) throw new HttpError(400, INVALID_BODY);
  return body;
}

/** A string field. Absent and null read as '', as Go's zero value does; any other type is a 400, as it is for Go's decoder. */
export function stringField(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new HttpError(400, INVALID_BODY);
  return value;
}

/**
 * A list of objects. Absent and null read as an empty list; anything else that is not a list of objects is a 400. A null
 * entry reads as an object with no fields, as it does for Go's decoder.
 */
export function objectList(body: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const value = body[key];
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new HttpError(400, INVALID_BODY);
  return value.map((entry) => bodyObject(entry));
}

/** One JSON value read as a string the way Go's json.Unmarshal does: null is '', and any other type is a 400 naming the field. */
export function stringValue(raw: unknown, name: string): string {
  if (raw === null) return '';
  if (typeof raw !== 'string') throw new HttpError(400, `${name} must be a string`);
  return raw;
}
