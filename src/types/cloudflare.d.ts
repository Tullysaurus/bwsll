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
    /**
     * Runs statements sequentially in one implicit transaction on one connection.
     * Verified against local D1: `last_insert_rowid()` resolves to the row inserted by
     * an earlier statement in the same batch, and a failing statement rolls the whole
     * batch back. `src/lib/revisions.ts` relies on both.
     */
    batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
    exec(query: string): Promise<{ count: number; duration: number }>;
  }

  /* --- R2, same minimal-surface approach as D1 above --- */

  interface R2HTTPMetadata {
    contentType?: string;
    contentLanguage?: string;
    contentDisposition?: string;
    contentEncoding?: string;
    cacheControl?: string;
  }

  interface R2Object {
    key: string;
    version: string;
    size: number;
    etag: string;
    httpEtag: string;
    uploaded: Date;
    httpMetadata?: R2HTTPMetadata;
    customMetadata?: Record<string, string>;
    writeHttpMetadata(headers: Headers): void;
  }

  interface R2ObjectBody extends R2Object {
    body: ReadableStream;
    bodyUsed: boolean;
    arrayBuffer(): Promise<ArrayBuffer>;
    text(): Promise<string>;
  }

  interface R2PutOptions {
    httpMetadata?: R2HTTPMetadata;
    customMetadata?: Record<string, string>;
    sha256?: string;
  }

  interface R2Bucket {
    head(key: string): Promise<R2Object | null>;
    get(key: string): Promise<R2ObjectBody | null>;
    put(
      key: string,
      value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null,
      options?: R2PutOptions,
    ): Promise<R2Object | null>;
    delete(keys: string | string[]): Promise<void>;
    list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
      objects: R2Object[];
      truncated: boolean;
      cursor?: string;
    }>;
  }
}

export {};
