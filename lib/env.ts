import { z } from "zod";

// Skip validation during build (secrets not available in Docker build phase)
const skipValidation = process.env.SKIP_ENV_VALIDATION === "1";

// Environment variable schema
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Database (Neon Postgres)
  DATABASE_URL: z.string().url().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().url().optional(), // For migrations and Prisma Studio

  // Auth.js
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),

  // Resend (Email)
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  RESEND_FROM_EMAIL: z.string().email("RESEND_FROM_EMAIL must be a valid email"),

  // Upstash Redis (Rate Limiting)
  UPSTASH_REDIS_REST_URL: z.string().url().min(1, "UPSTASH_REDIS_REST_URL is required"),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "UPSTASH_REDIS_REST_TOKEN is required"),

  // Sentry (optional in development)
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
});

// Validate environment variables
function validateEnv() {
  // Skip validation during Docker build (secrets not available)
  if (skipValidation) {
    console.warn("⚠️ Skipping env validation (SKIP_ENV_VALIDATION=1)");
    return process.env as unknown as z.infer<typeof envSchema>;
  }

  try {
    const parsed = envSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Environment variable validation failed:");
      error.issues.forEach((err: z.ZodIssue) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`);
      });
      throw new Error("Invalid environment variables. Check your .env file.");
    }
    throw error;
  }
}

// Export validated environment variables
export const env = validateEnv();

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;
