import type { Env } from '../env';
import { isRecord } from '../http';
import { darkenForScan } from './colors';
import type { AgentImage, StyleAgentStyle } from './decision';

/** What an engine returns for a prompt: the part of a style a text prompt can decide. */
export interface StyleParseResult {
  fgColor: string;
  bgColor: string;
  errorLevel: string;
  frame: string;
  summary: string;
}

const TIMEOUT_MS = 40_000;
const trimmed = (value: string | undefined): string => (value ?? '').trim();

export const styleLlmConfigured = (env: Env): boolean => trimmed(env.STYLE_LLM_API_KEY) !== '';
export const jevApiKeyConfigured = (env: Env): boolean => trimmed(env.TYPESAFE_API_KEY) !== '';
export const xaiStyleConfigured = (env: Env): boolean => trimmed(env.XAI_API_KEY) !== '';
export const jevStyleEnabled = (env: Env): boolean => jevApiKeyConfigured(env) && ['1', 'true', 'yes'].includes(trimmed(env.TYPESAFE_JEV_STYLE).toLowerCase());

/** Fills in anything an engine left out or got wrong, so a client always receives a style it can draw. */
export function normalizeStyleResult(result: StyleParseResult): StyleParseResult {
  const level = result.errorLevel.toUpperCase();
  return {
    fgColor: result.fgColor.trim() || '#0f172a',
    bgColor: result.bgColor.trim() || '#ffffff',
    errorLevel: ['L', 'M', 'Q', 'H'].includes(level) ? level : 'M',
    frame: ['plain', 'soft', 'ring'].includes(result.frame) ? result.frame : 'plain',
    summary: result.summary.trim() || 'LLM style',
  };
}

/** JSON with object keys in sorted order, which is how Go writes a map: the prompts an engine sees read the same on either server. */
const sortedJson = (value: unknown): string =>
  JSON.stringify(value ?? null, (_key, v: unknown) => (isRecord(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : v));

const field = (source: unknown, key: string): string => (isRecord(source) && typeof source[key] === 'string' ? source[key] : '');

async function post(fetchFn: typeof fetch, url: string, headers: Record<string, string>, body: unknown): Promise<{ status: number; text: string }> {
  const res = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return { status: res.status, text: await res.text() };
}

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/** From the first `{` to the last `}`: a model told to answer only in JSON often wraps it in talk. */
function extractJsonObject(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}

const resultOf = (raw: unknown): StyleParseResult => ({
  fgColor: field(raw, 'fgColor'),
  bgColor: field(raw, 'bgColor'),
  errorLevel: field(raw, 'errorLevel'),
  frame: field(raw, 'frame'),
  summary: field(raw, 'summary'),
});

const LLM_SYSTEM = `You are a QR code style decision model. Given a user prompt, output ONLY valid JSON (no markdown) with keys:
fgColor (hex), bgColor (hex), errorLevel (L|M|Q|H), frame (plain|soft|ring), summary (short string).
Prefer scannable contrast. Respect print/outdoor/logo constraints when mentioned.`;

/** Asks an OpenAI-compatible chat endpoint (STYLE_LLM_*) for a style. Throws on any failure; the route says only that parsing failed. */
export async function callStyleLlm(fetchFn: typeof fetch, env: Env, prompt: string, current: Record<string, unknown> | undefined): Promise<StyleParseResult> {
  const baseUrl = trimmed(env.STYLE_LLM_BASE_URL).replace(/\/+$/, '') || 'https://api.openai.com/v1';
  const { status, text } = await post(
    fetchFn,
    `${baseUrl}/chat/completions`,
    { Authorization: `Bearer ${trimmed(env.STYLE_LLM_API_KEY)}` },
    {
      model: trimmed(env.STYLE_LLM_MODEL) || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: LLM_SYSTEM },
        { role: 'user', content: `Prompt: ${prompt}\nCurrent style (optional): ${sortedJson(current)}` },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    },
  );
  if (status !== 200) throw new Error(`llm http ${status}`);
  const reply = parseJson(text);
  const choices = isRecord(reply) && Array.isArray(reply.choices) ? reply.choices : [];
  if (choices.length === 0) throw new Error('llm empty response');
  const message = isRecord(choices[0]) ? choices[0].message : undefined;
  const content = parseJson(field(message, 'content'));
  if (!isRecord(content)) throw new Error('llm reply is not JSON');
  return normalizeStyleResult(resultOf(content));
}

/** What an unrecognised template falls back to. */
const JEV_DEFAULT_PRESET: StyleParseResult = { fgColor: '#1e3a8a', bgColor: '#f9f9f8', errorLevel: 'M', frame: 'ring', summary: 'quickqr brand look' };

const JEV_PRESETS: Record<string, StyleParseResult> = {
  print_safe: { fgColor: '#000000', bgColor: '#ffffff', errorLevel: 'H', frame: 'plain', summary: 'High-contrast print preset' },
  black_on_white: { fgColor: '#0a0a0a', bgColor: '#ffffff', errorLevel: 'H', frame: 'plain', summary: 'Black on white' },
  quickqr_brand: { fgColor: '#1e3a8a', bgColor: '#f9f9f8', errorLevel: 'M', frame: 'ring', summary: 'quickqr brand look' },
  navy_on_cream: { fgColor: '#1e3a5f', bgColor: '#faf7f0', errorLevel: 'M', frame: 'soft', summary: 'Navy on cream' },
  dark_elegant: { fgColor: '#f8fafc', bgColor: '#0f172a', errorLevel: 'Q', frame: 'soft', summary: 'Dark elegant theme' },
  pastel_menu: { fgColor: '#9d174d', bgColor: '#fff1f2', errorLevel: 'M', frame: 'soft', summary: 'Soft pastel menu style' },
  rose_on_blush: { fgColor: '#e11d48', bgColor: '#fff1f2', errorLevel: 'M', frame: 'soft', summary: 'Rose on blush' },
  outdoor: { fgColor: '#0f172a', bgColor: '#ffffff', errorLevel: 'H', frame: 'plain', summary: 'Outdoor / sun-fade resistant' },
  teal_on_mint: { fgColor: '#0d9488', bgColor: '#ecfdf5', errorLevel: 'M', frame: 'soft', summary: 'Teal on mint' },
  indigo_on_lavender: { fgColor: '#4f46e5', bgColor: '#f5f3ff', errorLevel: 'M', frame: 'ring', summary: 'Indigo on lavender' },
  emerald_on_ivory: { fgColor: '#059669', bgColor: '#fffff0', errorLevel: 'M', frame: 'plain', summary: 'Emerald on ivory' },
  slate_on_sand: { fgColor: '#334155', bgColor: '#f4ede4', errorLevel: 'M', frame: 'soft', summary: 'Slate on sand' },
};

const JEV_NAMED_HEX: Record<string, string> = {
  black: '#0a0a0a', white: '#ffffff', navy: '#1e3a5f', blue: '#2563eb', cream: '#faf7f0', slate: '#334155',
  green: '#15803d', teal: '#0d9488', red: '#dc2626', charcoal: '#27272a', ivory: '#fffff0', mint: '#ecfdf5',
};

const JEV_QUESTIONS = {
  style_template: {
    type: 'choice',
    instructions: "Which QR visual template best matches the user's style request?",
    criteria: {
      print_safe: 'Print flyers, posters, stickers; maximum scan reliability',
      black_on_white: 'Explicit black modules on white background',
      quickqr_brand: 'Default quickqr brand: blue modules on warm off-white',
      navy_on_cream: 'Navy modules on cream background',
      dark_elegant: 'Dark background, light modules, elegant or luxury',
      pastel_menu: 'Soft pastel cafe/menu aesthetic',
      rose_on_blush: 'Rose or pink modules on blush background',
      outdoor: 'Outdoor signage, sun exposure, high error correction',
      teal_on_mint: 'Teal on mint green background',
      indigo_on_lavender: 'Indigo on lavender background',
      emerald_on_ivory: 'Emerald green on ivory',
      slate_on_sand: 'Slate gray on sand background',
      custom_colors: 'User asked for specific named colors or hex, not a preset',
    },
  },
  fg_color: {
    type: 'choice',
    instructions: 'Best foreground (QR module) color name if custom_colors, else best guess from prompt.',
    criteria: {
      black: 'Black modules', navy: 'Navy', blue: 'Blue', slate: 'Slate gray', green: 'Green', teal: 'Teal',
      red: 'Red', charcoal: 'Charcoal', white: 'White modules (on dark bg)', cream: 'Ignored when preset applies',
    },
  },
  bg_color: {
    type: 'choice',
    instructions: 'Best background color name if custom_colors, else best guess from prompt.',
    criteria: { white: 'White background', cream: 'Cream', ivory: 'Ivory', mint: 'Mint', charcoal: 'Dark charcoal background', navy: 'Navy background', slate: 'Slate background' },
  },
  error_level: {
    type: 'choice',
    instructions: 'QR error correction level. Use H for print, logos, or outdoor.',
    criteria: { L: 'Low ~7%', M: 'Medium ~15% default', Q: 'Quartile ~25%', H: 'High ~30%' },
  },
  frame: {
    type: 'choice',
    instructions: 'Visual frame around the QR preview.',
    criteria: { plain: 'Minimal, no frame', soft: 'Soft rounded card', ring: 'Ring border / polished' },
  },
};

function jevChoice(answers: Record<string, unknown>, key: string): { choice: string; confidence: number } {
  const answer = answers[key];
  if (answer === undefined) throw new Error(`missing answer "${key}"`);
  if (!isRecord(answer)) throw new Error(`bad answer "${key}"`);
  return { choice: field(answer, 'choice').trim(), confidence: typeof answer.confidence === 'number' ? answer.confidence : 0 };
}

/** Jev's answer: a style, and how sure it was of the template behind it. */
export interface JevStyle {
  result: StyleParseResult;
  confidence: number;
}

/** Asks Jev (TYPESAFE_*) to pick a template and colors. */
export async function callJevStyleParser(
  fetchFn: typeof fetch,
  env: Env,
  prompt: string,
  current: Record<string, unknown> | undefined,
): Promise<JevStyle> {
  const { status, text } = await post(
    fetchFn,
    'https://api.typesafe.ai/v1/systemone',
    { Authorization: `Bearer ${trimmed(env.TYPESAFE_API_KEY)}` },
    {
      model: trimmed(env.TYPESAFE_MODEL) || 'jev-latest',
      state: `User wants to style a QR code for the quickqr generator.\nPrompt: ${prompt}\nCurrent style (JSON, may be empty): ${sortedJson(current)}`,
      questions: JEV_QUESTIONS,
    },
  );
  if (status !== 200) throw new Error(`jev http ${status}`);
  const reply = parseJson(text);
  const answers = isRecord(reply) && isRecord(reply.answers) ? reply.answers : {};

  const template = jevChoice(answers, 'style_template');
  let result: StyleParseResult;
  if (template.choice !== 'custom_colors') {
    result = { ...(JEV_PRESETS[template.choice] ?? JEV_DEFAULT_PRESET) };
  } else {
    const fg = (() => { try { return jevChoice(answers, 'fg_color').choice; } catch { return ''; } })();
    const bg = (() => { try { return jevChoice(answers, 'bg_color').choice; } catch { return ''; } })();
    result = { fgColor: JEV_NAMED_HEX[fg] ?? '#0f172a', bgColor: JEV_NAMED_HEX[bg] ?? '#ffffff', errorLevel: '', frame: '', summary: `${fg} on ${bg}` };
  }
  try {
    result.errorLevel = jevChoice(answers, 'error_level').choice.toUpperCase();
  } catch {
    // Not answered: the preset's level stands, or the default below.
  }
  try {
    result.frame = jevChoice(answers, 'frame').choice;
  } catch {
    // Not answered: likewise.
  }
  result = normalizeStyleResult(result);
  if (result.summary === '' || result.summary === 'LLM style') result.summary = `Jev · ${template.choice}`;
  return { result, confidence: template.confidence };
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** The text of an xAI reply: `output_text`, else every text part, else the body itself. */
function xaiOutputText(body: string): string {
  const reply = parseJson(body);
  if (!isRecord(reply)) return body;
  if (typeof reply.output_text === 'string' && reply.output_text.trim() !== '') return reply.output_text;
  const parts: string[] = [];
  for (const item of Array.isArray(reply.output) ? reply.output : []) {
    for (const part of isRecord(item) && Array.isArray(item.content) ? item.content : []) {
      const piece = field(part, 'text');
      if (piece) parts.push(piece);
    }
  }
  return parts.length > 0 ? parts.join('') : body;
}

/** Asks xAI to style a code from the prompt, notes, and photos. Throws on any failure; the caller falls back to the decision model. */
export async function callXaiStyleAgent(
  fetchFn: typeof fetch,
  env: Env,
  prompt: string,
  notes: string[],
  images: AgentImage[],
  current: Record<string, unknown> | undefined,
): Promise<StyleAgentStyle> {
  const instruction = `You style a scannable QR code. Use the prompt, notes, and photos as the brief.
Reply with ONLY JSON and these keys: fgColor, bgColor, accentColor, errorLevel (L|M|Q|H), frame (plain|soft|ring), moduleColorMode (uniform|finder_accent|gradient), dotShape (square|rounded|circle), summary.
Keep the background light and the modules dark enough to scan. summary is one short line naming the materials you used.
Prompt: ${prompt}
Notes:
${notes.join('\n')}
Current style JSON: ${sortedJson(current)}`;
  const content = [
    ...images.map((image) => ({ type: 'input_image', image_url: `data:${image.mediaType};base64,${toBase64(image.bytes)}`, detail: 'low' })),
    { type: 'input_text', text: instruction },
  ];
  const { status, text } = await post(
    fetchFn,
    'https://api.x.ai/v1/responses',
    { Authorization: `Bearer ${trimmed(env.XAI_API_KEY)}` },
    { model: trimmed(env.XAI_MODEL) || 'grok-4.7', input: [{ role: 'user', content }] },
  );
  if (status !== 200) throw new Error(`xai http ${status}`);
  const raw = parseJson(extractJsonObject(xaiOutputText(text)));
  if (!isRecord(raw)) throw new Error('xai reply is not JSON');

  const normalized = normalizeStyleResult(resultOf(raw));
  const moduleColorMode = field(raw, 'moduleColorMode');
  const dotShape = field(raw, 'dotShape');
  return {
    fgColor: darkenForScan(normalized.fgColor, normalized.bgColor),
    bgColor: normalized.bgColor,
    accentColor: field(raw, 'accentColor') || normalized.fgColor,
    errorLevel: normalized.errorLevel,
    frame: normalized.frame,
    moduleColorMode: ['uniform', 'finder_accent', 'gradient'].includes(moduleColorMode) ? moduleColorMode : 'uniform',
    dotShape: ['square', 'rounded', 'circle'].includes(dotShape) ? dotShape : 'square',
    summary: normalized.summary,
  };
}
