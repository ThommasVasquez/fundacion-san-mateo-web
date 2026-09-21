/**
 * Polyfill for Cloudflare Workers / unenv environment.
 * unenv defines process.umask as a function that throws [unenv] process.umask is not implemented yet!
 * Overriding it to return 0 prevents unhandled crashes in SSR.
 */
if (typeof process !== 'undefined') {
  try {
    Object.defineProperty(process, 'umask', {
      value: () => 0,
      writable: true,
      configurable: true,
    });
  } catch {
    try {
      (process as any).umask = () => 0;
    } catch {
      // ignore
    }
  }
}

export {};
