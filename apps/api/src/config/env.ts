import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(8).default('a-very-secret-key-that-is-at-least-32-chars-long'),
  JWT_REFRESH_SECRET: z.string().min(8).default('another-very-secret-refresh-key-at-least-32-chars'),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('*'),
  PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('FATAL: Invalid environment variables configuration:');
  const errors = _env.error.format();
  Object.entries(errors).forEach(([key, value]) => {
    if (key !== '_errors') {
      console.error(`  - ${key}: ${(value as any)._errors.join(', ')}`);
    }
  });
  console.error('\nPlease check your Render/Environment variables settings.');
  process.exit(1);
}

export const env = _env.data;
