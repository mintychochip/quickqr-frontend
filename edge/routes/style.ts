import type { AppDeps } from '../app';
import { HttpError, bodyObject, errorJson, isRecord, json, objectList, readBytes, stringField } from '../http';
import type { Ctx, Router } from '../router';
import { ContextError, fetchPublicSiteContext } from '../style/context';
import { decideStyleFromContext, type AgentImage } from '../style/decision';
import { decodeRaster, UnreadableImage } from '../style/images';
import {
  callJevStyleParser,
  callStyleLlm,
  callXaiStyleAgent,
  jevApiKeyConfigured,
  jevStyleEnabled,
  styleLlmConfigured,
  type JevStyle,
  xaiStyleConfigured,
} from '../style/providers';
import { clipBytes } from '../text';
import { optionalCostly, publicRead } from './policies';

const MAX_IMAGES = 4;
const MAX_BODY = 8 << 20;
const MAX_IMAGE = 1200 * 1024;
const MAX_NOTE = 4000;
/** Jev's answer is used on its own only when it is at least this sure of the template. */
const MIN_JEV_CONFIDENCE = 0.35;

/** What the style agent was sent, before it is checked. */
interface AgentRequest {
  prompt: string;
  notes: string[];
  images: RawImage[];
  current: Record<string, unknown> | undefined;
  decisionOnly: boolean;
}

/** A photo as it arrived: base64 text in a JSON body, or the file's own bytes in an upload. */
interface RawImage {
  name: string;
  mediaType: string;
  data: string | Uint8Array;
}

const refuse = (message: string): never => {
  throw new HttpError(400, message);
};

/** A JSON body read the way the Go server did: an empty body is an empty request, and any wrong type is "invalid request body". */
function parseAgentJson(text: string): AgentRequest {
  try {
    const parsed: unknown = text.trim() === '' ? null : JSON.parse(text);
    const body = bodyObject(parsed);
    const strings = (key: string): string[] => {
      const value = body[key];
      if (value === undefined || value === null) return [];
      if (!Array.isArray(value)) throw new Error('not a list');
      return value.map((entry: unknown) => {
        if (entry === null) return '';
        if (typeof entry !== 'string') throw new Error('not a string');
        return entry;
      });
    };
    const current = body.current;
    if (current !== undefined && current !== null && !isRecord(current)) throw new Error('current is not an object');
    const decisionOnly = body.decision_only;
    if (decisionOnly !== undefined && decisionOnly !== null && typeof decisionOnly !== 'boolean') throw new Error('decision_only is not a boolean');
    return {
      prompt: stringField(body, 'prompt'),
      notes: strings('notes'),
      images: objectList(body, 'images').map((image) => ({ name: stringField(image, 'name'), mediaType: stringField(image, 'media_type'), data: stringField(image, 'data') })),
      current: isRecord(current) ? current : undefined,
      decisionOnly: decisionOnly === true,
    };
  } catch {
    return refuse('invalid request body');
  }
}

const isText = (media: string, name: string): boolean => media.startsWith('text/') || name.toLowerCase().endsWith('.txt') || name.toLowerCase().endsWith('.md');

/** An upload read the way the Go server did: text files become notes, anything else is a photo. */
async function parseAgentUpload(bytes: Uint8Array, contentType: string): Promise<AgentRequest> {
  let form: FormData;
  try {
    form = await new Response(bytes, { headers: { 'Content-Type': contentType } }).formData();
  } catch {
    return refuse('invalid upload');
  }
  const text = (key: string): string[] => form.getAll(key).filter((value): value is string => typeof value === 'string');
  const request: AgentRequest = { prompt: text('prompt')[0] ?? '', notes: [...text('note'), ...text('notes')], images: [], current: undefined, decisionOnly: false };

  const current = (text('current')[0] ?? '').trim();
  if (current) {
    try {
      const parsed: unknown = JSON.parse(current);
      if (isRecord(parsed)) request.current = parsed;
    } catch {
      // A current style that is not JSON is ignored, not an error.
    }
  }

  for (const value of [...form.getAll('materials'), ...form.getAll('images')]) {
    if (typeof value === 'string') continue;
    if (value.size > MAX_IMAGE) refuse(`${value.name} is larger than 1.2MB`);
    const data = new Uint8Array(await value.arrayBuffer());
    if (isText(value.type, value.name)) request.notes.push(`file:${value.name}\n${new TextDecoder().decode(data)}`);
    else request.images.push({ name: value.name, mediaType: value.type, data });
  }
  return request;
}

function compactNotes(notes: string[]): string[] {
  return notes.map((note) => clipBytes(note.trim(), MAX_NOTE)).filter((note) => note !== '');
}

/** Base64 as Go's decoder accepts it, with or without padding, and as a bare string or a `data:` URL. */
function decodeBase64(data: string): Uint8Array {
  let text = data.trim();
  if (text.startsWith('data:')) {
    const comma = text.indexOf(',');
    if (comma < 0) throw new Error('bad data url');
    text = text.slice(comma + 1);
  }
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const mediaTypeOf = (bytes: Uint8Array): string => (bytes[0] === 0x89 ? 'image/png' : bytes[0] === 0xff ? 'image/jpeg' : 'image/gif');

/** Checks each photo and reads its pixels when it is cheap enough to. A photo that is not a PNG, JPEG, or GIF is a 400. */
async function decodeAgentImages(images: RawImage[]): Promise<AgentImage[]> {
  if (images.length > MAX_IMAGES) refuse(`attach up to ${MAX_IMAGES} photos`);
  const out: AgentImage[] = [];
  for (const image of images) {
    const name = image.name.trim() || 'photo';
    let bytes: Uint8Array;
    try {
      bytes = typeof image.data === 'string' ? decodeBase64(image.data) : image.data;
    } catch {
      return refuse(`could not read ${name}`);
    }
    if (bytes.length > MAX_IMAGE) refuse(`${name} is larger than 1.2MB`);
    let raster: AgentImage['raster'];
    try {
      raster = await decodeRaster(bytes);
    } catch (err) {
      if (err instanceof UnreadableImage) return refuse(`could not read ${name} as a PNG, JPEG, or GIF`);
      throw err;
    }
    out.push({ name, mediaType: image.mediaType.trim() || mediaTypeOf(bytes), bytes, raster });
  }
  return out;
}

/** The name a note goes by in the materials list: the file's name when it came from one. */
function noteName(note: string): string {
  const newline = note.indexOf('\n');
  const first = newline >= 0 ? note.slice(0, newline) : '';
  return first.startsWith('file:') ? first.slice('file:'.length) : 'note';
}

export function registerStyleRoutes(router: Router, deps: AppDeps): void {
  router.handle('GET /api/qr/style-parser', publicRead, (c) => {
    const jev = jevStyleEnabled(c.env);
    const llm = styleLlmConfigured(c.env);
    return json(200, {
      default_engine: jev ? 'jev' : llm ? 'llm' : 'decision',
      jev_available: jev,
      jev_key_set: jevApiKeyConfigured(c.env),
      llm_available: llm,
      llm_model: (c.env.STYLE_LLM_MODEL ?? '').trim(),
      agent_available: true,
      xai_available: xaiStyleConfigured(c.env),
    });
  });

  router.handle('POST /api/qr/style-parse', { ...optionalCostly, maxBody: 64 << 10 }, async (c) => {
    const { env } = c;
    if (!jevStyleEnabled(env) && !styleLlmConfigured(env)) return errorJson(503, 'No server style engine configured. Use on-device decision model.');

    let prompt: string;
    let current: Record<string, unknown> | undefined;
    try {
      const body = bodyObject(await c.json());
      prompt = stringField(body, 'prompt').trim();
      current = isRecord(body.current) ? body.current : undefined;
      if (body.current !== undefined && body.current !== null && !isRecord(body.current)) throw new HttpError(400, 'bad current');
    } catch (err) {
      if (err instanceof HttpError) return errorJson(400, 'Invalid request body');
      throw err;
    }
    if (!prompt) return errorJson(400, 'prompt is required');

    if (jevStyleEnabled(env)) {
      let jev: JevStyle | null = null;
      try {
        jev = await callJevStyleParser(deps.fetch, env, prompt, current);
      } catch {
        jev = null;
      }
      if (jev && jev.confidence >= MIN_JEV_CONFIDENCE) return json(200, { engine: 'jev', confidence: jev.confidence, result: jev.result });
      if (!styleLlmConfigured(env)) {
        if (!jev) return errorJson(502, 'Jev style parse failed');
        return json(200, { engine: 'jev', confidence: jev.confidence, result: jev.result });
      }
    }

    try {
      return json(200, { engine: 'llm', result: await callStyleLlm(deps.fetch, env, prompt, current) });
    } catch {
      return errorJson(502, 'Style parse failed');
    }
  });

  const agent = async (c: Ctx): Promise<Response> => {
    const contentType = c.req.headers.get('Content-Type') ?? '';
    const multipart = contentType.startsWith('multipart/form-data');
    let bytes: Uint8Array;
    try {
      bytes = await readBytes(c.req, MAX_BODY);
    } catch (err) {
      if (err instanceof HttpError) return errorJson(400, multipart ? 'invalid upload' : 'invalid request body');
      throw err;
    }
    const request = multipart ? await parseAgentUpload(bytes, contentType) : parseAgentJson(new TextDecoder().decode(bytes));

    const prompt = request.prompt.trim();
    const notes = compactNotes(request.notes);
    const images = await decodeAgentImages(request.images);
    if (!prompt && notes.length === 0 && images.length === 0) return errorJson(400, 'Add a prompt, note, or photo');

    const materials = [
      ...notes.map((note) => ({ name: noteName(note), kind: 'note', used: true })),
      ...images.map((image) => ({ name: image.name, kind: 'image', used: image.raster !== null })),
    ];

    let engine = 'decision';
    let style = await decideStyleFromContext(prompt, notes, images, request.current);
    if (!request.decisionOnly && xaiStyleConfigured(c.env)) {
      try {
        style = await callXaiStyleAgent(deps.fetch, c.env, prompt, notes, images, request.current);
        engine = 'xai';
      } catch {
        // The remote agent is a bonus: the decision model's answer stands.
      }
    }
    return json(200, { resource: 'qr.style', saved: false, engine, materials, style, result: style });
  };
  const agentPolicy = { ...optionalCostly, maxBody: MAX_BODY };
  router.handle('POST /api/qr/style', agentPolicy, agent);
  router.handle('POST /api/qr/style-agent', agentPolicy, agent);

  router.handle('POST /api/qr/context', { ...optionalCostly, maxBody: 4096 }, async (c) => {
    let url: string;
    try {
      url = stringField(bodyObject(await c.json()), 'url');
    } catch (err) {
      if (err instanceof HttpError) return errorJson(400, 'Invalid request body');
      throw err;
    }
    try {
      const { name, text } = await fetchPublicSiteContext(deps.fetch, url);
      return json(200, { name, text });
    } catch (err) {
      if (err instanceof ContextError) return errorJson(400, err.message);
      throw err;
    }
  });
}
