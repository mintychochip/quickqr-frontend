/**
 * The globals `bun test` provides, typed for the matchers the tests in src/ use. Declared once here so the
 * test files do not each carry (and disagree about) their own copy.
 */
declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => void | Promise<void>): void;
declare function beforeEach(fn: () => void | Promise<void>): void;
declare function expect<T>(actual: T): {
  toBe(expected: T): void;
  toEqual(expected: unknown): void;
  toThrow(): void;
  toBeNull(): void;
  toBeInstanceOf(expected: abstract new (...args: never[]) => unknown): void;
  toHaveLength(expected: number): void;
};
