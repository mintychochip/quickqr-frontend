/**
 * v1.json is a format, not configuration. Every code ever printed with v1 decodes only against these exact
 * tables. If this test fails, do not update the constants: restore the file. A better model is a v2.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import tables from './v1.json';
import { Model } from './model';
import { digest } from './testing';

const FILE_SHA256 = '658f43c3414cb8b8ae86bda54ec81d72e82d0428b3bbe32d9acce4865f8d22c4';
const ROW_DIGEST = 4190251012;

describe('the shipped v1 tables', () => {
  test('are byte for byte the ones codes were printed with', () => {
    const bytes = readFileSync(new URL('./v1.json', import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(FILE_SHA256);
  });

  test('derive the same probability rows the Go decoder derives', () => {
    expect(digest(new Model(tables), tables)).toBe(ROW_DIGEST);
  });

  test('describe a model the coder can use: a dictionary, and every row adding up', () => {
    const model = new Model(tables);
    expect(model.words.length > 4000).toBe(true);
    expect(model.literals(' ', ' ').freq.reduce((a, b) => a + b, 0)).toBe(2 ** tables.logT.lit);
  });
});
