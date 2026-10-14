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

  it('rejects a correctly signed JWT that is missing the exp claim (returns 401)', async () => {
    process.env.NODE_ENV = 'production';

    // Signed token WITHOUT exp — must be rejected after the security fix
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

    const noExpToken = `${header}.${payload}.${signature}`;

    const response = await request(app)
      .post('/api/facilities')
      .set('Authorization', `Bearer ${noExpToken}`)
      .send(validFacility);

    expect(response.status).toBe(401);
    expect(response.body.status).toBe('error');
  });

  it('accepts a correctly signed JWT with a valid exp claim in production (returns 201)', async () => {
    process.env.NODE_ENV = 'production';

    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        id: 'real-admin-uuid',
        email: 'admin@lifelink.local',
        role: 'ADMIN',
        iat: now,
        exp: now + 3600, // 1 hour from now
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

  it('rejects an expired JWT even if the signature is valid (returns 401)', async () => {
    process.env.NODE_ENV = 'production';

    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        id: 'real-admin-uuid',
        email: 'admin@lifelink.local',
        role: 'ADMIN',
        iat: now - 7200,
        exp: now - 10, // expired 10 seconds ago
      })
    ).toString('base64url');

    const signature = createHmac('sha256', testSecret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    const expiredToken = `${header}.${payload}.${signature}`;

    const response = await request(app)
      .post('/api/facilities')
      .set('Authorization', `Bearer ${expiredToken}`)
      .send(validFacility);

    expect(response.status).toBe(401);
    expect(response.body.status).toBe('error');
  });

  it('rejects malformed tokens that do not have exactly three segments (returns 401)', async () => {
    process.env.NODE_ENV = 'production';

    // Two segments (missing signature)
    const twoPartResponse = await request(app)
      .post('/api/facilities')
      .set('Authorization', 'Bearer header.payload')
      .send(validFacility);

    expect(twoPartResponse.status).toBe(401);

    // Four segments
    const fourPartResponse = await request(app)
      .post('/api/facilities')
      .set('Authorization', 'Bearer a.b.c.d')
      .send(validFacility);

    expect(fourPartResponse.status).toBe(401);

    // Single string
    const singlePartResponse = await request(app)
      .post('/api/facilities')
      .set('Authorization', 'Bearer notsegmented')
      .send(validFacility);

    expect(singlePartResponse.status).toBe(401);
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
