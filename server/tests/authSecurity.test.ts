import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createHmac } from 'node:crypto';
import app from '../src/app.js';

describe('Authentication Security & Header Hardening', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJwtSecret = process.env.JWT_SECRET;
  const testSecret = 'super-secret-test-key-32-bytes-long!';

  beforeEach(() => {
    process.env.JWT_SECRET = testSecret;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.JWT_SECRET = originalJwtSecret;
  });

  const validFacility = {
    name: 'Security Test Medical Center',
    facilityType: 'HOSPITAL',
    address: '99 Security Blvd',
    city: 'Cyber City',
    state: 'Secure State',
    contactPhone: '+1-555-8888',
  };

  it('rejects spoofed x-user-role headers when NODE_ENV is production (returns 401)', async () => {
    process.env.NODE_ENV = 'production';

    const response = await request(app)
      .post('/api/facilities')
      .set('x-user-role', 'ADMIN')
      .set('x-user-id', 'attacker-01')
      .send(validFacility);

    expect(response.status).toBe(401);
    expect(response.body.status).toBe('error');
    expect(response.body.message).toMatch(/Authentication required/i);
  });

  it('rejects spoofed mock-ADMIN Bearer token when NODE_ENV is production (returns 401)', async () => {
    process.env.NODE_ENV = 'production';

    const response = await request(app)
      .post('/api/facilities')
      .set('Authorization', 'Bearer mock-ADMIN-attacker-01')
      .send(validFacility);

    expect(response.status).toBe(401);
    expect(response.body.status).toBe('error');
    expect(response.body.message).toMatch(/Authentication required/i);
  });

  it('rejects unverified / unsigned base64 JWT tokens in production (returns 401)', async () => {
    process.env.NODE_ENV = 'production';

    // Crafted fake token without valid HMAC signature
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ id: 'attacker', role: 'ADMIN' })).toString('base64url');
    const fakeToken = `${header}.${payload}.invalidsignature123`;

    const response = await request(app)
      .post('/api/facilities')
      .set('Authorization', `Bearer ${fakeToken}`)
      .send(validFacility);

    expect(response.status).toBe(401);
  });

  it('accepts cryptographically signed JWT with matching secret in production (returns 201)', async () => {
    process.env.NODE_ENV = 'production';

    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        id: 'real-admin-uuid',
        email: 'admin@lifelink.local',
        role: 'ADMIN',
      })
    ).toString('base64url');

    const signature = createHmac('sha256', testSecret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    const validSignedToken = `${header}.${payload}.${signature}`;

    const response = await request(app)
      .post('/api/facilities')
      .set('Authorization', `Bearer ${validSignedToken}`)
      .send(validFacility);

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('success');
  });

  it('allows mock testing headers when NODE_ENV is test (returns 201)', async () => {
    process.env.NODE_ENV = 'test';

    const response = await request(app)
      .post('/api/facilities')
      .set('x-user-role', 'ADMIN')
      .set('x-user-id', 'test-admin-id')
      .send(validFacility);

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('success');
  });
});
