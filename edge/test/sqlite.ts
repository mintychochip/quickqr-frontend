import { Database } from 'bun:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Db, Stmt, StmtResult } from '../db';

const migrations = join(import.meta.dir, '..', 'migrations');

/** The D1-shaped interface plus the raw SQLite handle, so a test can read and seed tables directly. */
export interface TestDb extends Db {
  sqlite: Database;
}

/**
 * A fresh in-process SQLite with every migration applied, behind the same interface as D1. The production code runs the
 * same SQL against D1 itself, so these tests exercise the real queries without needing the Workers runtime.
 */
export function testDb(): TestDb {
  const sqlite = new Database(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const file of readdirSync(migrations).filter((f) => f.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(join(migrations, file), 'utf8'));
  }

  // A statement that returns columns (SELECT, or anything with RETURNING) yields rows; the rest report their changes.
  const execute = (sql: string, args: unknown[]): StmtResult => {
    const query = sqlite.query(sql);
    const values: never[] = args as never[];
    if (query.columnNames.length > 0) return { results: query.all(...values) as Record<string, unknown>[], meta: { changes: 0 } };
    return { results: [], meta: { changes: query.run(...values).changes } };
  };

  // batch() receives the Stmt objects this adapter made, so it looks up how to run each one.
  const executors = new WeakMap<Stmt, () => StmtResult>();
  const statement = (sql: string, args: unknown[] = []): Stmt => {
    const stmt: Stmt = {
      bind: (...values) => statement(sql, values),
      first: async <T>() => (execute(sql, args).results[0] as T | undefined) ?? null,
      all: async <T>() => ({ results: execute(sql, args).results as T[] }),
      run: async () => ({ meta: execute(sql, args).meta }),
    };
    executors.set(stmt, () => execute(sql, args));
    return stmt;
  };

  return {
    sqlite,
    prepare: (sql) => statement(sql),
    batch: async (statements) => {
      sqlite.exec('BEGIN');
      try {
        const out = statements.map((s) => {
          const run = executors.get(s);
          if (!run) throw new Error('statement was not prepared by this database');
          return run();
        });
        sqlite.exec('COMMIT');
        return out;
      } catch (err) {
        sqlite.exec('ROLLBACK');
        throw err;
      }
    },
  };
}
