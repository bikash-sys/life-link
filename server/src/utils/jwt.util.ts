import { createHmac, timingSafeEqual } from 'node:crypto';
import { UserRole } from '../types/auth.types.js';

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  facilityId?: string | null;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

const DEFAULT_EXPIRATION_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Resolves the JWT secret.
 * Enforces strong secret requirements outside test environments.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isTest = process.env.NODE_ENV === 'test';

  if (!secret || secret.trim().length === 0) {
    if (isTest) {
      return 'lifelink-test-secret-32-bytes-minimum-security!';
    }
    throw new Error('JWT_SECRET environment variable is missing or empty.');
  }

  // Reject known placeholder in production
  if (process.env.NODE_ENV === 'production') {
    if (secret.includes('change_in_local_env') || secret.length < 16) {
      throw new Error(
        'Insecure JWT_SECRET detected in production. A strong secret of at least 16 characters is required.'
      );
    }
  }

  return secret;
}

/**
 * Signs a payload into a 3-part base64url HMAC-SHA256 JWT.
 */
export function signToken(
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  customSecret?: string,
  expiresInSeconds: number = DEFAULT_EXPIRATION_SECONDS
): string {
  const secret = customSecret || getJwtSecret();
  const now = Math.floor(Date.now() / 1000);

  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const dataToSign = `${headerB64}.${payloadB64}`;

  const signatureB64 = createHmac('sha256', secret)
    .update(dataToSign)
    .digest('base64url');

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

/**
 * Cryptographically verifies signature, payload structure, and expiration of a JWT.
 * Returns decoded payload on success, or null if tampered, invalid, or expired.
 */
export function verifyToken(token: string, customSecret?: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const dataToSign = `${headerB64}.${payloadB64}`;

    let secret: string;
    try {
      secret = customSecret || getJwtSecret();
    } catch {
      return null;
    }

    const expectedSig = createHmac('sha256', secret)
      .update(dataToSign)
      .digest('base64url');

    const sigBuf = Buffer.from(signatureB64);
    const expBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const parsed = JSON.parse(payloadJson) as JwtPayload;

    if (!parsed || typeof parsed.id !== 'string' || typeof parsed.role !== 'string') {
      return null;
    }

    // Verify expiration if exp claim is present
    if (typeof parsed.exp === 'number') {
      const now = Math.floor(Date.now() / 1000);
      if (now > parsed.exp) {
        return null; // Expired
      }
    }

    return parsed;
  } catch {
    return null;
  }
}
