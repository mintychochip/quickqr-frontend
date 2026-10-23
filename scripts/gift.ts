/**
 * Makes, lists, and revokes gift links from a terminal, straight against D1 through wrangler. It needs no admin
 * session: your Cloudflare login is the credential, so it also works when ADMIN_EMAILS is unset or wrong.
 *
 *   bun scripts/gift.ts create --plan plus --days 30 [--uses 1] [--link-days 30] [--note "Sam"] --env local|staging|prod
 *   bun scripts/gift.ts list --env prod
 *   bun scripts/gift.ts revoke gft-abc12345 --env prod
 *
 * `--env` is required, with no default, so a gift is never made on production by accident. `staging` and `prod` also
 * need CLOUDFLARE_ACCOUNT_ID, because a stale account cached by wrangler can send a command to the wrong one (README).
 * `create` prints the link once. Only the token's SHA-256 is written to the database and to the command line, so the
 * link cannot be recovered later: copy it from the output.
 */
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { giftLink, newGiftToken, parseNewGift } from '../edge/gifts';
import { isRecord } from '../edge/http';
import { sha256Hex } from '../edge/ids';
import { GRANT_LIST_SQL, GRANT_REVOKE_SQL, grantInsert, grantStatus } from '../edge/store/gifts';

interface Target {
  database: string;
  remote: boolean;
  cwd: string;
  appUrl: string;
}

const frontend = join(import.meta.dir, '..');
const TARGETS: Record<string, Target> = {
  local: { database: 'quickqr-prod', remote: false, cwd: frontend, appUrl: 'http://localhost:5186' },
  staging: { database: 'quickqr-staging', remote: true, cwd: join(frontend, 'staging'), appUrl: 'https://staging.quickqr.app' },
  prod: { database: 'quickqr-prod', remote: true, cwd: frontend, appUrl: 'https://quickqr.app' },
};

function literal(value: unknown): string {
  if (value === null) return 'NULL';
  if (typeof value === 'string') return `'${value.replaceAll("'", "''")}'`;
  if (typeof value === 'number' && Number.isInteger(value)) return String(value);
  throw new Error(`cannot write ${typeof value} ${String(value)} into SQL`);
}

/**
 * Puts values into a statement's `?` placeholders as SQL literals, because `wrangler d1 execute` takes text and no
 * parameters. A string is quoted with its quotes doubled, so whatever it holds stays one value; a number must be whole.
 */
export function bindSql(sql: string, values: readonly unknown[]): string {
  const placeholders = sql.split('?').length - 1;
  if (placeholders !== values.length) throw new Error(`${placeholders} placeholders but ${values.length} values`);
  let next = 0;
  return sql.replace(/\?/g, () => literal(values[next++]));
}

/**
 * The rows of each statement from `wrangler d1 execute --json`, which may print a banner first. Locally wrangler reports
 * no changed-row counts, so a write is confirmed by reading the row back in the same command, never by a count.
 */
function rowsOf(output: string): Record<string, unknown>[][] {
  const start = output.indexOf('[');
  const parsed: unknown = JSON.parse(start >= 0 ? output.slice(start) : output);
  if (!Array.isArray(parsed)) throw new Error('wrangler answered with something this script does not understand');
  return parsed.map((entry) => (isRecord(entry) && Array.isArray(entry.results) ? entry.results.filter(isRecord) : []));
}

async function execute(target: Target, sql: string): Promise<Record<string, unknown>[][]> {
  const proc = Bun.spawn(['bunx', 'wrangler', 'd1', 'execute', target.database, target.remote ? '--remote' : '--local', '--json', '--command', sql], {
    cwd: target.cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [out, err, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  if (code !== 0) throw new Error(`wrangler exited with ${code}\n${err.trim() || out.trim()}`);
  return rowsOf(out);
}

const fail = (message: string): never => {
  console.error(message);
  process.exit(2);
};

const whole = (text: string | undefined): number | undefined => (text === undefined ? undefined : Number(text));

const GRANT_STATE_SQL = 'SELECT revoked_at FROM gift_grants WHERE id = ?';

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
    options: {
      env: { type: 'string' },
      plan: { type: 'string' },
      days: { type: 'string' },
      uses: { type: 'string' },
      'link-days': { type: 'string' },
      note: { type: 'string' },
      'app-url': { type: 'string' },
    },
  });
  const [command, id] = positionals;
  const target = TARGETS[values.env ?? ''];
  if (!command || !target) return fail('usage: bun scripts/gift.ts create|list|revoke <id> --env local|staging|prod   (see the top of this file)');
  if (target.remote && !process.env.CLOUDFLARE_ACCOUNT_ID) {
    return fail('CLOUDFLARE_ACCOUNT_ID must name the account that owns quickqr.app: a stale one cached by wrangler can send this to the wrong account.');
  }
  const now = new Date();

  if (command === 'create') {
    // wrangler takes the command as text, so a note is kept to one line.
    const note = values.note?.replace(/\s+/g, ' ');
    const parsed = parseNewGift({ plan: values.plan, days: whole(values.days), uses: whole(values.uses), link_days: whole(values['link-days']), note }, now);
    if (!parsed.ok) return fail(parsed.error);

    const token = newGiftToken();
    const { view, sql, values: bound } = grantInsert({ ...parsed.value, tokenHash: await sha256Hex(token), createdBy: 'cli' }, now);
    await execute(target, bindSql(sql, bound));

    console.log(`Gift ${view.id} made on ${values.env}: ${view.plan} for ${view.days} days, ${view.max_uses} use${view.max_uses === 1 ? '' : 's'}, link works until ${view.redeem_by}.`);
    if (view.note) console.log(`Note: ${view.note}`);
    console.log(`\n  ${giftLink(values['app-url'] ?? target.appUrl, token)}\n`);
    console.log('This is the only time the link is shown: the database keeps just its SHA-256.');
    return;
  }

  if (command === 'list') {
    const [rows = []] = await execute(target, GRANT_LIST_SQL);
    for (const row of rows) {
      const { uses, max_uses: max, revoked_at: revoked, redeem_by: redeemBy } = row;
      if (typeof uses !== 'number' || typeof max !== 'number' || typeof revoked === 'undefined' || typeof redeemBy === 'undefined') continue;
      const status = grantStatus({ uses, max_uses: max, revoked_at: typeof revoked === 'string' ? revoked : null, redeem_by: typeof redeemBy === 'string' ? redeemBy : null }, now);
      console.log([String(row.id).padEnd(13), String(row.plan).padEnd(5), `${row.days}d`.padEnd(5), `${uses}/${max}`.padEnd(8), status.padEnd(8), String(redeemBy ?? '').padEnd(25), String(row.note ?? '')].join(' '));
    }
    if (rows.length === 0) console.log('No gifts.');
    return;
  }

  if (command === 'revoke') {
    if (!id || !/^[a-z0-9-]+$/.test(id)) return fail('usage: bun scripts/gift.ts revoke <id> --env local|staging|prod   (an id looks like gft-abc12345)');
    const stamp = now.toISOString();
    const [, [row] = []] = await execute(target, `${bindSql(GRANT_REVOKE_SQL, [stamp, id])}; ${bindSql(GRANT_STATE_SQL, [id])}`);
    if (!row) console.log(`No gift has the id ${id} here.`);
    else if (row.revoked_at === stamp) console.log(`Revoked ${id}. Plans already given stay until they end.`);
    else console.log(`${id} was already revoked at ${String(row.revoked_at)}.`);
    return;
  }

  return fail(`unknown command "${command}"`);
}

if (import.meta.main) await main();
