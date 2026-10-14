import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { userService } from '../src/services/user.service.js';
import { signToken } from '../src/utils/jwt.util.js';

describe('User Authentication & Identity Lifecycle', () => {
  beforeEach(async () => {
    await userService.resetStore();
  });

  const validUser = {
    email: 'donor.jane@example.com',
    password: 'SecurePassword123!',
    fullName: 'Jane Doe',
    phone: '+1-555-0199',
  };

  describe('POST /api/auth/register', () => {
    it('registers a new user successfully with default USER role and returns JWT', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('token');

      const user = res.body.data.user;
      expect(user.email).toBe('donor.jane@example.com');
      expect(user.fullName).toBe('Jane Doe');
      expect(user.role).toBe('USER');
      expect(user.facilityId).toBeNull();
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('createdAt');
      // Critical security check: password hash must NEVER be exposed
      expect(user).not.toHaveProperty('passwordHash');
      expect(user).not.toHaveProperty('password');
    });

    it('rejects duplicate email registrations with HTTP 409 Conflict', async () => {
      // First registration
      await request(app).post('/api/auth/register').send(validUser);

      // Attempt duplicate registration with uppercase variations
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          email: 'DONOR.JANE@EXAMPLE.COM',
        });

      expect(res.status).toBe(409);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('rejects weak passwords failing security requirements with HTTP 400', async () => {
      // Missing uppercase and number
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          password: 'short',
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.errors).toBeDefined();
    });

    it('blocks privilege escalation attempts claiming ADMIN role with HTTP 403', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          role: 'ADMIN',
        });

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toMatch(/cannot assign administrative/i);
    });

    it('blocks privilege escalation attempts claiming FACILITY_STAFF role with HTTP 403', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          role: 'FACILITY_STAFF',
        });

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toMatch(/cannot assign administrative/i);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(validUser);
    });

    it('authenticates valid credentials and returns a valid JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'donor.jane@example.com',
          password: 'SecurePassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe('donor.jane@example.com');
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('accepts login with case-insensitive email normalization', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'DONOR.JANE@EXAMPLE.COM',
          password: 'SecurePassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('rejects incorrect password with generic HTTP 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'donor.jane@example.com',
          password: 'WrongPassword999!',
        });

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('rejects non-existent email with generic HTTP 401 without revealing account existence', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent.user@example.com',
          password: 'SecurePassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toBe('Invalid email or password');
    });
  });

  describe('GET /api/auth/me', () => {
    let token: string;

    beforeEach(async () => {
      const regRes = await request(app).post('/api/auth/register').send(validUser);
      token = regRes.body.data.token;
    });

    it('returns the authenticated user profile when provided a valid JWT', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.email).toBe('donor.jane@example.com');
      expect(res.body.data.user.fullName).toBe('Jane Doe');
      expect(res.body.data.user.role).toBe('USER');
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('rejects unauthenticated requests without token with HTTP 401', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
    });

    it('rejects tampered tokens with HTTP 401', async () => {
      const tampered = token.slice(0, -6) + 'abcdef';

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tampered}`);

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
    });

    it('rejects expired tokens with HTTP 401', async () => {
      // Generate a token that expired 10 seconds ago (-10 seconds)
      const expiredToken = signToken(
        {
          id: 'test-user-id',
          email: 'test@example.com',
          role: 'USER',
        },
        undefined,
        -10
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
    });
  });

  describe('Interoperability with Existing Routes', () => {
    it('allows a token generated by auth to access protected facility endpoints as ADMIN', async () => {
      // Issue a token with ADMIN role
      const adminToken = signToken({
        id: 'real-admin-uuid',
        email: 'admin@lifelink.org',
        role: 'ADMIN',
      });

      const res = await request(app)
        .post('/api/facilities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Central Interop Hospital',
          facilityType: 'HOSPITAL',
          address: '100 Health Ave',
          city: 'Metropolis',
          state: 'State',
          contactPhone: '+1-555-1234',
          isVerified: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.name).toBe('Central Interop Hospital');
    });
  });
});
