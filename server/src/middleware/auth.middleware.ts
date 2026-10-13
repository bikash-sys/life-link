import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/auth.types.js';
import { UnauthorizedError, ForbiddenError } from '../errors/appError.js';

/**
 * Extracts and sets authenticated user on `req.user`.
 * Supports Authorization Bearer tokens and testing headers.
 * Seamlessly interfaces with Developer A's planned JWT authentication.
 */
export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const mockRoleHeader = req.headers['x-user-role'] as UserRole | undefined;
  const mockIdHeader = req.headers['x-user-id'] as string | undefined;
  const mockEmailHeader = req.headers['x-user-email'] as string | undefined;
  const mockFacilityIdHeader = req.headers['x-user-facility-id'] as string | undefined;

  if (process.env.NODE_ENV !== 'production' && mockRoleHeader && mockIdHeader) {
    req.user = {
      id: mockIdHeader,
      email: mockEmailHeader || `${mockIdHeader}@lifelink.local`,
      role: mockRoleHeader,
      facilityId: mockFacilityIdHeader || null,
    };
    return next();
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();

    // Standard mock token format: mock-<role>-<userId>[:facilityId]
    if (token.startsWith('mock-')) {
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

    // Basic JWT payload extraction fallback (base64 payload decode)
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const payloadJson = Buffer.from(tokenParts[1], 'base64').toString('utf8');
        const payload = JSON.parse(payloadJson);
        if (payload && payload.id && payload.role) {
          req.user = {
            id: payload.id,
            email: payload.email || `${payload.id}@lifelink.local`,
            role: payload.role,
            facilityId: payload.facilityId || null,
          };
          return next();
        }
      }
    } catch {
      // If token decoding fails, let req.user remain undefined
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
