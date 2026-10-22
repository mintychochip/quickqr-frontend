import { describe, expect, test } from 'bun:test';
import { go, rig, type NetworkHandler, type Rig } from './test/rig';
import { encodePng } from './test/png';
import imageVectors from './test/image-vectors.json';
import vectors from './test/style-vectors.json';

const photo = (name: string): string => {
  const found = vectors.images.find((f) => f.name === name);
  if (!found) throw new Error(`no fixture ${name}`);
  return found.data;
};

const postJson = (r: Rig, path: string, body: unknown): Promise<Response> =>
  go(r, path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const rawPost = (r: Rig, path: string, body: string, contentType = 'application/json'): Promise<Response> => go(r, path, { method: 'POST', headers: { 'Content-Type': contentType }, body });
const failure = async (res: Response): Promise<[number, string]> => [res.status, ((await res.json()) as { error: string }).error];

/** A network stub that records the one request it expects and answers with `reply`. */
function endpoint(key: string, reply: () => Response): { handlers: Record<string, NetworkHandler>; seen: { headers: Headers; body: unknown }[] } {
  const seen: { headers: Headers; body: unknown }[] = [];
  return {
    seen,
    handlers: {
      [key]: async (req) => {
        seen.push({ headers: req.headers, body: await req.json() });
        return reply();
      },
    },
  };
}

describe('which engines are on', () => {
  const config = async (env: Partial<Parameters<typeof rig>[0]>) => (await go(rig(env), '/api/qr/style-parser')).json();

  test('with nothing configured only the on-device decision model and the photo agent are available', async () => {
    expect(await config({})).toEqual({ default_engine: 'decision', jev_available: false, jev_key_set: false, llm_available: false, llm_model: '', agent_available: true, xai_available: false });
  });

  test('a language model key makes it the default, and shows its model', async () => {
    expect(await config({ STYLE_LLM_API_KEY: ' key ', STYLE_LLM_MODEL: ' gpt-x ' })).toMatchObject({ default_engine: 'llm', llm_available: true, llm_model: 'gpt-x', jev_available: false });
  });

  test('a Jev key alone is set but not switched on; the switch turns it on and makes it first', async () => {
    expect(await config({ TYPESAFE_API_KEY: 'k' })).toMatchObject({ default_engine: 'decision', jev_key_set: true, jev_available: false });
    for (const on of ['1', 'true', 'YES']) expect(await config({ TYPESAFE_API_KEY: 'k', TYPESAFE_JEV_STYLE: on, STYLE_LLM_API_KEY: 'k' })).toMatchObject({ default_engine: 'jev', jev_available: true });
    expect(await config({ TYPESAFE_JEV_STYLE: '1' })).toMatchObject({ jev_available: false, jev_key_set: false });
  });

  test('an xAI key is reported', async () => {
    expect(await config({ XAI_API_KEY: 'x' })).toMatchObject({ xai_available: true });
  });
});

describe('parsing a prompt with a language model', () => {
  const llmReply = (content: unknown) => () => Response.json({ choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }] });
  const CHAT = 'POST https://api.openai.com/v1/chat/completions';

  test('is refused when no engine is configured', async () => {
    expect(await failure(await postJson(rig(), '/api/qr/style-parse', { prompt: 'x' }))).toEqual([503, 'No server style engine configured. Use on-device decision model.']);
  });

  test('needs a prompt and a readable body', async () => {
    const r = rig({ STYLE_LLM_API_KEY: 'k' });
    for (const body of [{}, { prompt: '   ' }, { prompt: null }]) expect(await failure(await postJson(r, '/api/qr/style-parse', body))).toEqual([400, 'prompt is required']);
    for (const body of ['{', '[]', '{"prompt":5}', '{"prompt":"x","current":5}']) expect(await failure(await rawPost(r, '/api/qr/style-parse', body))).toEqual([400, 'Invalid request body']);
  });

  test('asks an OpenAI-compatible endpoint, with the key, the current style, and JSON mode', async () => {
    const { handlers, seen } = endpoint(CHAT, llmReply({ fgColor: '#112233', bgColor: '#fefefe', errorLevel: 'q', frame: 'soft', summary: ' Calm ' }));
    const r = rig({ STYLE_LLM_API_KEY: ' sk-test ' }, handlers);
    const res = await postJson(r, '/api/qr/style-parse', { prompt: '  calm blue  ', current: { frame: 'ring', fgColor: '#000000' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ engine: 'llm', result: { fgColor: '#112233', bgColor: '#fefefe', errorLevel: 'Q', frame: 'soft', summary: 'Calm' } });
    expect(seen).toHaveLength(1);
    expect(seen[0]?.headers.get('Authorization')).toBe('Bearer sk-test');
    expect(seen[0]?.headers.get('Content-Type')).toBe('application/json');
    const body = seen[0]?.body as { model: string; temperature: number; response_format: unknown; messages: { role: string; content: string }[] };
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.temperature).toBe(0.2);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.messages.map((m) => m.role)).toEqual(['system', 'user']);
    expect(body.messages[0]?.content).toContain('QR code style decision model');
    expect(body.messages[1]?.content).toBe('Prompt: calm blue\nCurrent style (optional): {"fgColor":"#000000","frame":"ring"}');
  });

  test('uses the configured base URL and model, and says null when there is no current style', async () => {
    const { handlers, seen } = endpoint('POST https://llm.example.org/v2/chat/completions', llmReply({ fgColor: '#111111' }));
    const r = rig({ STYLE_LLM_API_KEY: 'k', STYLE_LLM_BASE_URL: 'https://llm.example.org/v2///', STYLE_LLM_MODEL: 'tiny' }, handlers);
    await postJson(r, '/api/qr/style-parse', { prompt: 'hi' });
    expect((seen[0]?.body as { model: string }).model).toBe('tiny');
    expect((seen[0]?.body as { messages: { content: string }[] }).messages[1]?.content).toBe('Prompt: hi\nCurrent style (optional): null');
  });

  test('fills in what the model left out and corrects what it got wrong', async () => {
    const { handlers } = endpoint(CHAT, llmReply({ fgColor: '  ', errorLevel: 'X', frame: 'fancy', summary: '' }));
    const res = await postJson(rig({ STYLE_LLM_API_KEY: 'k' }, handlers), '/api/qr/style-parse', { prompt: 'x' });
    expect(await res.json()).toEqual({ engine: 'llm', result: { fgColor: '#0f172a', bgColor: '#ffffff', errorLevel: 'M', frame: 'plain', summary: 'LLM style' } });
  });

  test.each([
    ['an error from the model', () => new Response('nope', { status: 500 })],
    ['a reply with no choices', () => Response.json({ choices: [] })],
    ['a reply that is not JSON', llmReply('Sure! here is a style')],
    ['a body that is not JSON at all', () => new Response('<html>')],
  ])('%s is a 502', async (_name, reply) => {
    const { handlers } = endpoint(CHAT, reply);
    expect(await failure(await postJson(rig({ STYLE_LLM_API_KEY: 'k' }, handlers), '/api/qr/style-parse', { prompt: 'x' }))).toEqual([502, 'Style parse failed']);
  });

  test('a network failure is a 502 too', async () => {
    expect(await failure(await postJson(rig({ STYLE_LLM_API_KEY: 'k' }, {}), '/api/qr/style-parse', { prompt: 'x' }))).toEqual([502, 'Style parse failed']);
  });
});

describe('parsing a prompt with Jev', () => {
  const JEV = 'POST https://api.typesafe.ai/v1/systemone';
  const answers = (over: Record<string, unknown> = {}) => ({
    answers: {
      style_template: { type: 'choice', choice: 'navy_on_cream', confidence: 0.9 },
      fg_color: { choice: 'navy' },
      bg_color: { choice: 'cream' },
      error_level: { choice: 'h' },
      frame: { choice: 'ring' },
      ...over,
    },
  });
  const env = { TYPESAFE_API_KEY: 'jk', TYPESAFE_JEV_STYLE: '1' };

  test('asks with the key, a model, the prompt and the questions, and returns a preset when it is sure', async () => {
    const { handlers, seen } = endpoint(JEV, () => Response.json(answers()));
    const res = await postJson(rig(env, handlers), '/api/qr/style-parse', { prompt: 'navy on cream', current: { frame: 'soft' } });
    expect(await res.json()).toEqual({ engine: 'jev', confidence: 0.9, result: { fgColor: '#1e3a5f', bgColor: '#faf7f0', errorLevel: 'H', frame: 'ring', summary: 'Navy on cream' } });
    expect(seen[0]?.headers.get('Authorization')).toBe('Bearer jk');
    const body = seen[0]?.body as { model: string; state: string; questions: Record<string, { type: string; criteria: Record<string, string> }> };
    expect(body.model).toBe('jev-latest');
    expect(body.state).toBe('User wants to style a QR code for the quickqr generator.\nPrompt: navy on cream\nCurrent style (JSON, may be empty): {"frame":"soft"}');
    expect(Object.keys(body.questions)).toEqual(['style_template', 'fg_color', 'bg_color', 'error_level', 'frame']);
    expect(Object.keys(body.questions.style_template?.criteria ?? {})).toHaveLength(13);
  });

  test('builds colors from the named choices when it is told to use custom colors', async () => {
    const { handlers } = endpoint(JEV, () => Response.json(answers({ style_template: { choice: 'custom_colors', confidence: 0.8 }, fg_color: { choice: 'teal' }, bg_color: { choice: 'mint' } })));
    const res = await postJson(rig(env, handlers), '/api/qr/style-parse', { prompt: 'teal on mint' });
    expect(await res.json()).toEqual({ engine: 'jev', confidence: 0.8, result: { fgColor: '#0d9488', bgColor: '#ecfdf5', errorLevel: 'H', frame: 'ring', summary: 'teal on mint' } });
  });

  test('falls back to defaults for colors it has no name for, and to the brand preset for a template it does not know', async () => {
    const custom = endpoint(JEV, () => Response.json(answers({ style_template: { choice: 'custom_colors', confidence: 0.8 }, fg_color: { choice: 'puce' }, bg_color: {} })));
    const a = (await (await postJson(rig(env, custom.handlers), '/api/qr/style-parse', { prompt: 'x' })).json()) as { result: { fgColor: string; bgColor: string } };
    expect([a.result.fgColor, a.result.bgColor]).toEqual(['#0f172a', '#ffffff']);
    const unknown = endpoint(JEV, () => Response.json(answers({ style_template: { choice: 'mystery', confidence: 0.9 }, error_level: undefined, frame: undefined })));
    const b = (await (await postJson(rig(env, unknown.handlers), '/api/qr/style-parse', { prompt: 'x' })).json()) as { result: unknown };
    expect(b.result).toEqual({ fgColor: '#1e3a8a', bgColor: '#f9f9f8', errorLevel: 'M', frame: 'ring', summary: 'quickqr brand look' });
  });

  test('a template it is unsure of is still returned when no language model is there to ask instead', async () => {
    const { handlers } = endpoint(JEV, () => Response.json(answers({ style_template: { choice: 'print_safe', confidence: 0.1 } })));
    const body = (await (await postJson(rig(env, handlers), '/api/qr/style-parse', { prompt: 'x' })).json()) as { engine: string; confidence: number };
    expect([body.engine, body.confidence]).toEqual(['jev', 0.1]);
  });

  test('is a 502 when it fails and nothing else can answer', async () => {
    for (const reply of [() => new Response('no', { status: 500 }), () => Response.json({ answers: {} })]) {
      const { handlers } = endpoint(JEV, reply);
      expect(await failure(await postJson(rig(env, handlers), '/api/qr/style-parse', { prompt: 'x' }))).toEqual([502, 'Jev style parse failed']);
    }
  });

  test('hands over to the language model when it is unsure or fails', async () => {
    const llm = { fgColor: '#222222', bgColor: '#ffffff', errorLevel: 'M', frame: 'plain', summary: 'From the model' };
    for (const jev of [() => Response.json(answers({ style_template: { choice: 'print_safe', confidence: 0.2 } })), () => new Response('no', { status: 500 })]) {
      const handlers = {
        ...endpoint(JEV, jev).handlers,
        ...endpoint('POST https://api.openai.com/v1/chat/completions', () => Response.json({ choices: [{ message: { content: JSON.stringify(llm) } }] })).handlers,
      };
      const res = await postJson(rig({ ...env, STYLE_LLM_API_KEY: 'k' }, handlers), '/api/qr/style-parse', { prompt: 'x' });
      expect(await res.json()).toEqual({ engine: 'llm', result: llm });
    }
  });
});

describe('the style agent', () => {
  const agent = (r: Rig, body: unknown, path = '/api/qr/style-agent'): Promise<Response> => postJson(r, path, body);
  const bodyOf = async (res: Response) => (await res.json()) as { resource: string; saved: boolean; engine: string; materials: { name: string; kind: string; used: boolean }[]; style: Record<string, string>; result: unknown };

  test('answers from a prompt alone, on both of its paths, saving nothing', async () => {
    for (const path of ['/api/qr/style', '/api/qr/style-agent']) {
      const r = rig();
      const body = await bodyOf(await agent(r, { prompt: 'navy on cream' }, path));
      expect(body).toMatchObject({ resource: 'qr.style', saved: false, engine: 'decision', materials: [], style: { fgColor: '#1e3a5f', bgColor: '#faf7f0', summary: 'From your prompt' } });
      expect(body.result).toEqual(body.style);
      expect(r.db.sqlite.query('SELECT count(*) AS n FROM links').get()).toEqual({ n: 0 });
    }
  });

  test('starts from the current style and from notes, and names what it used', async () => {
    const body = await bodyOf(await agent(rig(), { prompt: 'hello', current: { frame: 'soft', fgColor: '#123456' }, notes: ['  file:menu.txt\nCafe notes  ', '', '   ', 'second note'] }));
    expect(body.style).toMatchObject({ frame: 'soft', fgColor: '#123456', summary: 'From notes' });
    expect(body.materials).toEqual([
      { name: 'menu.txt', kind: 'note', used: true },
      { name: 'note', kind: 'note', used: true },
    ]);
  });

  test('a note is cut at 4000 bytes', async () => {
    const long = `Site example.com\n${'é'.repeat(3000)}`;
    const body = await bodyOf(await agent(rig(), { notes: [long] }));
    expect(body.style.summary).toBe('From example.com');
  });

  test('reads a photo into the palette, and names it', async () => {
    const body = await bodyOf(await agent(rig(), { images: [{ name: ' swatch.png ', media_type: 'image/png', data: photo('two-tone.png') }] }));
    expect(body.style).toMatchObject({ fgColor: '#2060e0', bgColor: '#f0f0f0', summary: 'From swatch.png' });
    expect(body.materials).toEqual([{ name: 'swatch.png', kind: 'image', used: true }]);
  });

  test('takes a data URL and unpadded base64, and a JPEG and a GIF', async () => {
    const png = photo('two-tone.png');
    for (const data of [`data:image/png;base64,${png}`, png.replace(/=+$/, '')]) {
      expect((await bodyOf(await agent(rig(), { images: [{ data }] }))).style.fgColor).toBe('#2060e0');
    }
    const body = await bodyOf(await agent(rig(), { images: [{ name: 'a.jpg', data: photo('blocks.jpg') }, { name: 'b.gif', data: photo('paletted.gif') }] }));
    expect(body.materials.map((m) => [m.name, m.used])).toEqual([['a.jpg', true], ['b.gif', true]]);
    expect(body.style.summary).toBe('From a.jpg, b.gif');
  });

  test('a photo too big for the edge to read is listed as not used, and does not change the colors', async () => {
    const huge = encodePng({ width: 2, height: 2, colorType: 6, depth: 8, samples: [[255, 0, 0, 255, 255, 0, 0, 255], [255, 0, 0, 255, 255, 0, 0, 255]] });
    new DataView(huge.buffer).setUint32(16, 3000);
    new DataView(huge.buffer).setUint32(20, 3000);
    const data = btoa(String.fromCharCode(...huge));
    const body = await bodyOf(await agent(rig(), { prompt: 'hello', images: [{ name: 'big.png', data }] }));
    expect(body.materials).toEqual([{ name: 'big.png', kind: 'image', used: false }]);
    expect(body.style.fgColor).toBe('#1e3a8a');
  });

  test('a photo gets the name "photo" when it has none', async () => {
    expect((await bodyOf(await agent(rig(), { images: [{ data: photo('gray.png') }] }))).materials[0]?.name).toBe('photo');
  });

  test('asks for something to work from', async () => {
    const r = rig();
    for (const body of [{}, { prompt: '  ', notes: [' '], images: [] }]) expect(await failure(await agent(r, body))).toEqual([400, 'Add a prompt, note, or photo']);
    for (const raw of ['', 'null', '  ']) expect(await failure(await rawPost(r, '/api/qr/style-agent', raw))).toEqual([400, 'Add a prompt, note, or photo']);
  });

  test('refuses a body of the wrong shape, in the Go server\'s lower-case words', async () => {
    const r = rig();
    for (const raw of ['{', '[]', '{"prompt":5}', '{"notes":"x"}', '{"notes":[1]}', '{"images":"x"}', '{"images":[5]}', '{"images":[{"data":5}]}', '{"current":[]}', '{"decision_only":"yes"}']) {
      expect([raw, await failure(await rawPost(r, '/api/qr/style-agent', raw))]).toEqual([raw, [400, 'invalid request body']]);
    }
  });

  test('refuses photos it cannot use', async () => {
    const r = rig();
    const five = Array.from({ length: 5 }, () => ({ data: photo('gray.png') }));
    expect(await failure(await agent(r, { images: five }))).toEqual([400, 'attach up to 4 photos']);
    expect(await failure(await agent(r, { images: [{ name: 'bad.png', data: '!!not base64!!' }] }))).toEqual([400, 'could not read bad.png']);
    expect(await failure(await agent(r, { images: [{ name: 'data:', data: 'data:image/png;base64' }] }))).toEqual([400, 'could not read data:']);
    expect(await failure(await agent(r, { images: [{ name: 'notes.txt', data: btoa('hello there') }] }))).toEqual([400, 'could not read notes.txt as a PNG, JPEG, or GIF']);
    expect(await failure(await agent(r, { images: [{ data: '' }] }))).toEqual([400, 'could not read photo as a PNG, JPEG, or GIF']);
    const cut = Uint8Array.from(atob(photo('blocks.jpg')), (c) => c.charCodeAt(0)).subarray(0, 300);
    expect(await failure(await agent(r, { images: [{ name: 'cut.jpg', data: btoa(String.fromCharCode(...cut)) }] }))).toEqual([400, 'could not read cut.jpg as a PNG, JPEG, or GIF']);
    const big = btoa('x'.repeat(1200 * 1024 + 1));
    expect(await failure(await agent(r, { images: [{ name: 'huge.png', data: big }] }))).toEqual([400, 'huge.png is larger than 1.2MB']);
  });

  test('a body over 8 MiB is refused, not read', async () => {
    const res = await rawPost(rig(), '/api/qr/style-agent', JSON.stringify({ prompt: 'x'.repeat(8 * 1024 * 1024) }));
    expect(await failure(res)).toEqual([400, 'invalid request body']);
  });

  describe('as an upload', () => {
    const upload = (r: Rig, fill: (form: FormData) => void): Promise<Response> => {
      const form = new FormData();
      fill(form);
      return go(r, '/api/qr/style-agent', { method: 'POST', body: form });
    };
    const file = (data: Uint8Array | string, name: string, type: string): File => new File([data], name, { type });
    const png = Uint8Array.from(atob(photo('two-tone.png')), (c) => c.charCodeAt(0));

    test('takes a prompt, notes, a current style, and photos as files', async () => {
      const body = await bodyOf(
        await upload(rig(), (form) => {
          form.set('prompt', 'make it pop');
          form.append('note', 'a note');
          form.append('notes', 'another');
          form.set('current', JSON.stringify({ frame: 'soft' }));
          form.append('materials', file(png, 'swatch.png', 'image/png'));
          form.append('images', file(Uint8Array.from(atob(photo('paletted.gif')), (c) => c.charCodeAt(0)), 'logo.gif', 'image/gif'));
        }),
      );
      expect(body.materials).toEqual([
        { name: 'note', kind: 'note', used: true },
        { name: 'note', kind: 'note', used: true },
        { name: 'swatch.png', kind: 'image', used: true },
        { name: 'logo.gif', kind: 'image', used: true },
      ]);
      expect(body.style).toMatchObject({ frame: 'soft', summary: 'From swatch.png, logo.gif' });
    });

    test('turns text files into notes named after them', async () => {
      const body = await bodyOf(
        await upload(rig(), (form) => {
          form.append('materials', file('Site cafe.example.org\ntheme-color: #0d9488', 'brand.txt', 'application/octet-stream'));
          form.append('materials', file('# notes', 'readme.MD', 'application/octet-stream'));
          form.append('materials', file('plain', 'x.csv', 'text/csv'));
        }),
      );
      expect(body.materials).toEqual([
        { name: 'brand.txt', kind: 'note', used: true },
        { name: 'readme.MD', kind: 'note', used: true },
        { name: 'x.csv', kind: 'note', used: true },
      ]);
      expect(body.style.summary).toBe('From cafe.example.org');
    });

    test('ignores a current style that is not JSON, and refuses what it cannot read', async () => {
      expect((await bodyOf(await upload(rig(), (form) => { form.set('prompt', 'x'); form.set('current', '{oops'); }))).style.frame).toBe('ring');
      const r = rig();
      expect(await failure(await upload(r, (form) => form.append('images', file(new Uint8Array(1200 * 1024 + 1), 'big.png', 'image/png'))))).toEqual([400, 'big.png is larger than 1.2MB']);
      expect(await failure(await upload(r, (form) => form.append('images', file('not an image', 'x.png', 'image/png'))))).toEqual([400, 'could not read x.png as a PNG, JPEG, or GIF']);
      expect(await failure(await upload(r, () => undefined))).toEqual([400, 'Add a prompt, note, or photo']);
      expect(await failure(await rawPost(r, '/api/qr/style-agent', 'garbage', 'multipart/form-data; boundary=x'))).toEqual([400, 'invalid upload']);
    });
  });

  describe('with xAI', () => {
    const XAI = 'POST https://api.x.ai/v1/responses';
    const style = { fgColor: '#ffff00', bgColor: '#ffffff', accentColor: '', errorLevel: 'h', frame: 'fancy', moduleColorMode: 'wild', dotShape: 'blob', summary: ' Brand ' };

    test('asks for a style with the photos, notes, and prompt, and makes the answer scannable', async () => {
      const { handlers, seen } = endpoint(XAI, () => Response.json({ output_text: `Here you go: ${JSON.stringify(style)} Enjoy!` }));
      const r = rig({ XAI_API_KEY: 'xk', XAI_MODEL: 'grok-x' }, handlers);
      const body = await bodyOf(await agent(r, { prompt: 'brand it', notes: ['a note'], current: { frame: 'ring' }, images: [{ name: 'a.png', media_type: 'image/png', data: photo('two-tone.png') }] }));
      expect(body.engine).toBe('xai');
      expect(body.style).toEqual({ fgColor: '#5f5f00', bgColor: '#ffffff', accentColor: '#ffff00', errorLevel: 'H', frame: 'plain', moduleColorMode: 'uniform', dotShape: 'square', summary: 'Brand' });
      expect(seen[0]?.headers.get('Authorization')).toBe('Bearer xk');
      const sent = seen[0]?.body as { model: string; input: { role: string; content: { type: string; image_url?: string; detail?: string; text?: string }[] }[] };
      expect(sent.model).toBe('grok-x');
      const [image, instruction] = sent.input[0]?.content ?? [];
      expect(image).toEqual({ type: 'input_image', image_url: `data:image/png;base64,${photo('two-tone.png')}`, detail: 'low' });
      expect(instruction?.text).toContain('Prompt: brand it\nNotes:\na note\nCurrent style JSON: {"frame":"ring"}');
    });

    test('reads the text from the structured output when there is no output_text', async () => {
      const { handlers } = endpoint(XAI, () => Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ fgColor: '#102030', bgColor: '#ffffff', summary: 'S' }) }] }] }));
      const body = await bodyOf(await agent(rig({ XAI_API_KEY: 'xk' }, handlers), { prompt: 'x' }));
      expect(body).toMatchObject({ engine: 'xai', style: { fgColor: '#102030', accentColor: '#102030' } });
    });

    test('defaults the model', async () => {
      const { handlers, seen } = endpoint(XAI, () => Response.json({ output_text: '{"fgColor":"#102030"}' }));
      await agent(rig({ XAI_API_KEY: 'xk' }, handlers), { prompt: 'x' });
      expect((seen[0]?.body as { model: string }).model).toBe('grok-4.7');
    });

    test('is skipped when the caller asks for the decision model only', async () => {
      const { handlers, seen } = endpoint(XAI, () => Response.json({ output_text: '{}' }));
      const body = await bodyOf(await agent(rig({ XAI_API_KEY: 'xk' }, handlers), { prompt: 'navy on cream', decision_only: true }));
      expect([body.engine, seen.length]).toEqual(['decision', 0]);
    });

    test.each([
      ['an error', () => new Response('no', { status: 500 })],
      ['a reply that is not a style', () => Response.json({ output_text: 'I cannot help with that' })],
    ])('falls back to the decision model after %s', async (_name, reply) => {
      const { handlers } = endpoint(XAI, reply);
      const body = await bodyOf(await agent(rig({ XAI_API_KEY: 'xk' }, handlers), { prompt: 'navy on cream' }));
      expect(body).toMatchObject({ engine: 'decision', style: { fgColor: '#1e3a5f' } });
    });
  });
});

describe('every photo format is accepted by the agent', () => {
  test.each(imageVectors.jpeg.filter((f) => f.expected).slice(0, 3).map((f) => [f.name, f.data]))('%s', async (name, data) => {
    const res = await postJson(rig(), '/api/qr/style-agent', { images: [{ name, data }] });
    expect(res.status).toBe(200);
  });
});
