import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/auth.types.js';
import { UnauthorizedError, ForbiddenError } from '../errors/appError.js';
import { verifyToken } from '../utils/jwt.util.js';

/**
 * Extracts and verifies authenticated user identity on `req.user`.
 * - Mock headers and mock tokens are ONLY permitted when NODE_ENV === 'test'.
 * - In non-test environments, tokens MUST possess a valid cryptographic signature.
 * - Decoded unsigned JWT claims are NEVER trusted as identity.
 */
export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const isTestEnv = process.env.NODE_ENV === 'test';

  // 1. Test-only mock header extraction (STRICTLY RESTRICTED TO NODE_ENV === 'test')
  if (isTestEnv) {
    const mockRoleHeader = req.headers['x-user-role'] as UserRole | undefined;
    const mockIdHeader = req.headers['x-user-id'] as string | undefined;
    const mockEmailHeader = req.headers['x-user-email'] as string | undefined;
    const mockFacilityIdHeader = req.headers['x-user-facility-id'] as string | undefined;

    if (mockRoleHeader && mockIdHeader) {
      req.user = {
        id: mockIdHeader,
        email: mockEmailHeader || `${mockIdHeader}@lifelink.local`,
        role: mockRoleHeader,
        facilityId: mockFacilityIdHeader || null,
      };
      return next();
    }
  }

  // 2. Authorization Bearer Token processing
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();

    // Test-only mock token format (STRICTLY RESTRICTED TO NODE_ENV === 'test')
    if (isTestEnv && token.startsWith('mock-')) {
      const parts = token.split('-');
      const role = parts[1] as UserRole;
      const id = parts[2] || 'test-user-id';
      const facilityId = parts[3] || null;

      if (['USER', 'FACILITY_STAFF', 'ADMIN'].includes(role)) {
        req.user = {
          id,
          email: `${id}@lifelink.local`,
          role,
          facilityId,
        };
        return next();
      }
    }

    // Cryptographic JWT signature verification
    const verifiedPayload = verifyToken(token);
    if (
      verifiedPayload &&
      typeof verifiedPayload.id === 'string' &&
      typeof verifiedPayload.role === 'string'
    ) {
      req.user = {
        id: verifiedPayload.id,
        email: verifiedPayload.email || `${verifiedPayload.id}@lifelink.local`,
        role: verifiedPayload.role,
        facilityId: verifiedPayload.facilityId || null,
      };
      return next();
    }
  }

  next();
};

/**
 * Middleware ensuring a valid authenticated user exists.
 */
export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required to access this resource');
  }
  next();
};

/**
 * Middleware enforcing specific user roles.
 */
export const requireRoles = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Access restricted: requires one of [${roles.join(', ')}] role(s)`
      );
    }
    next();
  };
};
