import { ConfigService } from '@nestjs/config';

/**
 * Resolves the JWT signing secret from configuration.
 *
 * Production (NODE_ENV=production) MUST provide a non-empty JWT_SECRET —
 * otherwise startup fails loudly rather than silently using a baked-in key.
 * Development/test fall back to a clearly-labelled insecure value so local
 * tooling and E2E scripts keep working without extra setup.
 */
const DEV_INSEGURE_FALLBACK = 'dev-only-insecure-jwt-secret-do-not-use-in-production';

export function resolveJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (secret && secret.trim().length >= 16) return secret;

  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') {
    throw new Error(
      'JWT_SECRET environment variable must be set (min 16 chars) when NODE_ENV=production.',
    );
  }
  return DEV_INSEGURE_FALLBACK;
}
