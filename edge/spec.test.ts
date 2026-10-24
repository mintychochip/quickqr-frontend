import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createApp } from './app';

/**
 * The documented API and the registered one must be the same set. The spec lives in the repository that holds this
 * one (docs/openapi.yaml), so the check is skipped when this tree is cloned on its own.
 */
const specPath = join(import.meta.dir, '..', '..', 'docs', 'openapi.yaml');

interface Spec {
  paths: Record<string, Record<string, unknown>>;
}

/** The scan gateway is registered as a subtree (`/r/`, `/R/`) and documented as one operation with a code in the path. */
const SUBTREES: Record<string, string> = { '/r/': 'GET /r/{code}', '/R/': 'GET /R/{code}', '/s/': 'GET /s/{code}' };

describe.skipIf(!existsSync(specPath))('the registered routes and docs/openapi.yaml', () => {
  const spec = Bun.YAML.parse(readFileSync(specPath, 'utf8')) as unknown as Spec;
  const documented = new Set<string>();
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) if (method in item) documented.add(`${method.toUpperCase()} ${path}`);
  }
  const routes = createApp().routes();
  const methodRoutes = routes.filter((route) => route.method !== '').map((route) => `${route.method} ${route.path}`);
  const subtrees = routes.filter((route) => route.method === '').map((route) => route.path);

  test('every route with a method is documented', () => {
    expect(methodRoutes.filter((route) => !documented.has(route))).toEqual([]);
  });

  test('every documented operation is registered, the scan operations through their subtree', () => {
    const served = new Set([...methodRoutes, ...subtrees.map((path) => SUBTREES[path]).filter((route): route is string => route !== undefined)]);
    expect([...documented].filter((route) => !served.has(route))).toEqual([]);
  });

  test('the only registrations without a method are the scan and site subtrees', () => {
    expect(subtrees.sort()).toEqual(['/R/', '/r/', '/s/']);
  });
});
