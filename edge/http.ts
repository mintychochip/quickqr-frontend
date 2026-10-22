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

async function readText(req: Request, cap: number | undefined): Promise<string> {
  if (!req.body) return '';
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
  return new TextDecoder().decode(bytes);
}

/** Reads a JSON body no larger than `cap` bytes. Too large is 413; empty or malformed is 400. */
export async function readJson<T = unknown>(req: Request, cap?: number): Promise<T> {
  const text = await readText(req, cap);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(400, 'Invalid request body');
  }
}

/** Reads a form body (urlencoded) no larger than `cap` bytes. */
export async function readForm(req: Request, cap?: number): Promise<URLSearchParams> {
  return new URLSearchParams(await readText(req, cap));
}
