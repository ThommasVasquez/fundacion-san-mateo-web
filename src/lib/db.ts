import { neon } from '@neondatabase/serverless';

// Ensure it works both locally and on edge deployments
export const sql = neon(process.env.DATABASE_URL!);
