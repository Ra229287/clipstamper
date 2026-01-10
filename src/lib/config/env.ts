import { z } from 'zod';

// Environment schema with Zod validation (H70 pattern)
const EnvSchema = z.object({
  // Required
  DATABASE_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  
  // Optional with defaults
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  
  // Platform integrations (optional)
  TWITCH_CLIENT_ID: z.string().optional(),
  TWITCH_CLIENT_SECRET: z.string().optional(),
  YOUTUBE_API_KEY: z.string().optional(),
});

// Type inferred from schema
export type Env = z.infer<typeof EnvSchema>;

// Validate at startup - warns but doesn't crash in dev
function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  
  if (!result.success) {
    console.warn('[env] Missing or invalid environment variables:', 
      result.error.issues.map(i => i.path.join('.')).join(', '));
    // Return defaults for development
    return EnvSchema.parse({});
  }
  
  return result.data;
}

export const env = loadEnv();
