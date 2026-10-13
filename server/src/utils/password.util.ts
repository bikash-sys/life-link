import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/**
 * Hashes a plaintext password using Node.js crypto.scrypt with a random salt.
 * Returns formatted string: `${saltHex}:${derivedKeyHex}`.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const derivedKey = scryptSync(password, salt, KEY_LENGTH);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Safely verifies a plaintext password against a stored `${saltHex}:${derivedKeyHex}` hash
 * using constant-time comparison to prevent timing attacks.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;

    const [salt, expectedKeyHex] = parts;
    const actualKey = scryptSync(password, salt, KEY_LENGTH);
    const expectedKey = Buffer.from(expectedKeyHex, 'hex');

    if (actualKey.length !== expectedKey.length) {
      return false;
    }

    return timingSafeEqual(actualKey, expectedKey);
  } catch {
    return false;
  }
}
