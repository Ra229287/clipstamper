import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import * as relations from './relations';

// Get database URL from environment
const databaseUrl = process.env['DATABASE_URL'];

// Create Neon client (only if DATABASE_URL is set)
const sql = databaseUrl ? neon(databaseUrl) : null;

// Export the database instance with schema for relational queries
export const db = sql 
  ? drizzle(sql, { schema: { ...schema, ...relations } })
  : null;

// Re-export schema and relations for use in other files
export * from './schema';
export * from './relations';

// Type helper for the database
export type Database = NonNullable<typeof db>;
