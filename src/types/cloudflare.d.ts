/**
 * Minimal D1 typings.
 *
 * `@cloudflare/workers-types` redeclares DOM globals (fetch, Response, …) and clashes
 * with Next's `lib: ["dom"]`, so we declare only the surface this app actually uses.
 */

declare global {
  interface D1Result<T = Record<string, unknown>> {
    results: T[];
    success: boolean;
    meta: { last_row_id?: number; changes?: number; duration?: number } & Record<string, unknown>;
  }

  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T = Record<string, unknown>>(): Promise<T | null>;
    run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
    all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  }

  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
    exec(query: string): Promise<{ count: number; duration: number }>;
  }
}

export {};
