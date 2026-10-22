/** What a statement returns: its rows (for SELECT or RETURNING) and how many rows it changed. */
export interface StmtResult<T = Record<string, unknown>> {
  results: T[];
  meta: { changes: number };
}

/**
 * The slice of Cloudflare D1 the backend uses. D1 satisfies it structurally, and the tests satisfy it with an
 * in-process SQLite (edge/test/sqlite.ts), so the same SQL runs in both.
 */
export interface Stmt {
  bind(...values: unknown[]): Stmt;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number } }>;
}

export interface Db {
  prepare(sql: string): Stmt;
  /**
   * Runs the statements in order in one round trip and one transaction: all of them apply or none do. The results
   * come back in the same order, which also makes this the way to read several queries at the cost of one subrequest.
   */
  batch(statements: Stmt[]): Promise<StmtResult[]>;
}
