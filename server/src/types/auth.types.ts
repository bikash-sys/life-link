export type UserRole = 'USER' | 'FACILITY_STAFF' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  facilityId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
