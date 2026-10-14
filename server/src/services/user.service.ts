import { IUserRepository, SafeUser, UserRecord } from '../types/user.types.js';
import { userRepository } from '../repositories/user.repository.js';
import { RegisterInput, LoginInput } from '../validators/auth.validator.js';
import { hashPassword, verifyPassword } from '../utils/password.util.js';
import { signToken } from '../utils/jwt.util.js';
import {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from '../errors/appError.js';

export class UserService {
  constructor(private userRepo: IUserRepository = userRepository) {}

  /**
   * Converts a database UserRecord into a public SafeUser, ensuring passwordHash is excluded.
   */
  private toSafeUser(user: UserRecord): SafeUser {
    const { passwordHash: _hash, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Registers a new user with secure password hashing and default USER role.
   * Public registration attempts to claim ADMIN or FACILITY_STAFF roles are strictly rejected.
   */
  public async register(
    input: RegisterInput
  ): Promise<{ user: SafeUser; token: string }> {
    // Prevent unauthorized privilege self-assignment
    if (input.role && input.role !== 'USER') {
      throw new ForbiddenError(
        'Public registration cannot assign administrative or facility staff roles.'
      );
    }

    const normalizedEmail = input.email.trim().toLowerCase();

    // Check for email collisions
    const existingUser = await this.userRepo.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictError('A user with this email address already exists');
    }

    // Cryptographic hash of plaintext password
    const passwordHash = hashPassword(input.password);

    // Persist new user with default USER role
    const created = await this.userRepo.create({
      email: normalizedEmail,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone,
      role: 'USER',
      facilityId: null,
    });

    const safeUser = this.toSafeUser(created);

    // Issue standard cryptographic JWT token
    const token = signToken({
      id: safeUser.id,
      email: safeUser.email,
      role: safeUser.role,
      facilityId: safeUser.facilityId,
    });

    return { user: safeUser, token };
  }

  /**
   * Authenticates user credentials and issues a cryptographic JWT.
   * Returns generic 401 error to prevent username/email enumeration.
   */
  public async login(
    input: LoginInput
  ): Promise<{ user: SafeUser; token: string }> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const user = await this.userRepo.findByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValidPassword = verifyPassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const safeUser = this.toSafeUser(user);

    const token = signToken({
      id: safeUser.id,
      email: safeUser.email,
      role: safeUser.role,
      facilityId: safeUser.facilityId,
    });

    return { user: safeUser, token };
  }

  /**
   * Retrieves user profile details by ID.
   */
  public async getUserProfile(userId: string): Promise<SafeUser> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User profile not found');
    }
    return this.toSafeUser(user);
  }

  /**
   * Test helper to clear user records for test suite isolation.
   */
  public async resetStore(): Promise<void> {
    await this.userRepo.clear();
  }
}

export const userService = new UserService();
