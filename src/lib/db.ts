import { neon } from '@neondatabase/serverless';

let cachedClient: any = null;

function getClient() {
  if (!cachedClient) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("DATABASE_URL environment variable is not defined");
    }
    cachedClient = neon(dbUrl);
  }
  return cachedClient;
}

// Ensure it works both locally and on edge deployments by retrieving the client lazily
export const sql = new Proxy(() => {}, {
  apply(target, thisArg, argumentsList) {
    return getClient()(...argumentsList);
  }
}) as any;
