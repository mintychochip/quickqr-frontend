/**
 * How much smaller are payloads than v0's, in real characters, on addresses the model never saw?
 *
 *   bun scripts/compression/evaluate.ts <urls.txt> [--tables path]
 *
 * Two sets: the corpus hosts that were held out of training (run `train.ts --holdout` and point `--tables` at the
 * result), and `corpus.ts`, the hand-written QR-style URLs that are never trained on. "shipped" is what the app
 * prints: `compress()` from src/lib/compression, which picks the shortest payload that is faithful and safe to
 * print, run here with whichever tables were given.
 */
import { readFile } from 'node:fs/promises';
import { outputAlphabetQR } from '../../src/lib/alphabets';
import { qrCorpus } from '../../src/lib/compression/corpus';
import { compress } from '../../src/lib/compression';
import { Model } from '../../src/lib/compression/model';
import type { TableData } from '../../src/lib/compression/model';
import { compress as compressV0, stringToNumber } from '../../src/lib/compression/v0.js';
import { compressV1 } from '../../src/lib/compression/v1';
import { loadSamples } from './data';

export type Row = { url: string; v0: number; v1: number | null; shipped: number; v0Bits: number; shippedBits: number };

const bitLength = (payload: string) => stringToNumber(payload, outputAlphabetQR).toString(2).length;
const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const percentile = (xs: readonly number[], p: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))]!;

/** Encodes every URL with v0, with plain v1, and as the app would. `compress` itself checks the result decodes back. */
export function measure(urls: readonly string[], model: Model): Row[] {
  return urls.map((url) => {
    const v0 = compressV0(url, outputAlphabetQR);
    const v1 = compressV1(new URL(url), outputAlphabetQR, model);
    const shipped = compress(url, outputAlphabetQR, model);
    return { url, v0: v0.length, v1: v1?.length ?? null, shipped: shipped.length, v0Bits: bitLength(v0), shippedBits: bitLength(shipped) };
  });
}

export function summarise(rows: readonly Row[]) {
  const v0 = rows.map((r) => r.v0);
  const shipped = rows.map((r) => r.shipped);
  return { v0: mean(v0), shipped: mean(shipped), saved: 1 - mean(shipped) / mean(v0) };
}

function report(label: string, rows: readonly Row[]) {
  const v0 = rows.map((r) => r.v0);
  const v1 = rows.map((r) => r.v1 ?? r.v0);
  const shipped = rows.map((r) => r.shipped);
  const pc = (a: number, b: number) => `${((1 - b / a) * 100).toFixed(1)}%`;
  console.log(`\n${label} (${rows.length} urls)`);
  console.log(`  mean characters   v0 ${mean(v0).toFixed(1)}   plain v1 ${mean(v1).toFixed(1)} (${pc(mean(v0), mean(v1))} smaller)   shipped ${mean(shipped).toFixed(1)} (${pc(mean(v0), mean(shipped))} smaller)`);
  console.log(`  mean bits         v0 ${mean(rows.map((r) => r.v0Bits)).toFixed(1)}   shipped ${mean(rows.map((r) => r.shippedBits)).toFixed(1)} (${pc(mean(rows.map((r) => r.v0Bits)), mean(rows.map((r) => r.shippedBits)))} smaller)`);
  console.log(`  characters p50    v0 ${percentile(v0, 50)}   shipped ${percentile(shipped, 50)}      p90   v0 ${percentile(v0, 90)}   shipped ${percentile(shipped, 90)}`);
  const shorter = rows.filter((r) => r.shipped < r.v0).length;
  const equal = rows.filter((r) => r.shipped === r.v0).length;
  console.log(`  shipped payload shorter than v0 on ${shorter}, equal on ${equal}, longer on ${rows.length - shorter - equal}`);
}

async function main() {
  const args = process.argv.slice(2);
  const tablesAt = args.indexOf('--tables');
  const file = args.find((a, i) => !a.startsWith('--') && (tablesAt < 0 || i !== tablesAt + 1));
  if (!file) throw new Error('usage: bun scripts/compression/evaluate.ts <urls.txt> [--tables path]');
  const tablesPath = tablesAt >= 0 ? args[tablesAt + 1]! : 'src/lib/compression/v1.json';
  const model = new Model(JSON.parse(await readFile(tablesPath, 'utf8')) as TableData);

  const held = (await loadSamples(file)).filter((s) => s.split === 'test').map((s) => s.url);
  report('held-out corpus hosts', measure(held, model));

  const qr = measure(
    qrCorpus.map(([, url]) => url),
    model,
  );
  report('hand-written QR URLs', qr);
  const groups = new Map<string, Row[]>();
  qrCorpus.forEach(([group], i) => groups.set(group, [...(groups.get(group) ?? []), qr[i]!]));
  for (const [group, rows] of groups) {
    const s = summarise(rows);
    console.log(`    ${group.padEnd(9)} ${String(rows.length).padStart(2)} urls   v0 ${s.v0.toFixed(1).padStart(5)}   shipped ${s.shipped.toFixed(1).padStart(5)}   ${(s.saved * 100).toFixed(0)}% smaller`);
  }
}

if (import.meta.main) await main();
