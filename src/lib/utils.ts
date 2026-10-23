export function cn(...inputs: unknown[]): string {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (!value) return;
    if (typeof value === 'string') {
      out.push(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (typeof value === 'object') {
      for (const [key, on] of Object.entries(value as Record<string, unknown>)) {
        if (on) out.push(key);
      }
    }
  };
  for (const input of inputs) walk(input);
  return out.join(' ');
}


export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

export type WithoutChild<T> = T extends { child?: unknown } ? Omit<T, 'child'> : T;

export type WithoutChildren<T> = T extends { children?: unknown } ? Omit<T, 'children'> : T;

export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
