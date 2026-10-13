import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { FacilityService } from '../src/services/facility.service.js';

describe('Facility Management Integration Tests', () => {
  beforeEach(() => {
    FacilityService.resetStore();
  });

  const validFacilityPayload = {
    name: 'Apex Trauma & Blood Center',
    facilityType: 'HOSPITAL',
    address: '101 Healthcare Boulevard',
    city: 'Metro City',
    state: 'State Central',
    postalCode: '10001',
    latitude: 40.7128,
    longitude: -74.006,
    contactPhone: '+1-555-0199',
    contactEmail: 'contact@apextrauma.org',
    operatingHours: {
      open24x7: true,
      emergencyService: 'Available',
    },
  };

  describe('POST /api/facilities — Facility Creation', () => {
    it('returns 401 when request is unauthenticated', async () => {
      const response = await request(app)
        .post('/api/facilities')
        .send(validFacilityPayload);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body.message).toMatch(/Authentication required/i);
    });

    it('returns 400 when payload violates Zod schema (missing required fields)', async () => {
      const response = await request(app)
        .post('/api/facilities')
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({
          name: 'A', // Too short (min 2)
          facilityType: 'INVALID_TYPE',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('successfully creates facility when authorized as ADMIN', async () => {
      const response = await request(app)
        .post('/api/facilities')
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send(validFacilityPayload);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(validFacilityPayload.name);
      expect(response.body.data.facilityType).toBe('HOSPITAL');
      expect(response.body.data.isVerified).toBe(false);
      expect(response.body.data.latitude).toBe(40.7128);
    });

    it('rejects attempt by ordinary user to create verified facility (403 Forbidden)', async () => {
      const response = await request(app)
        .post('/api/facilities')
        .set('x-user-role', 'USER')
        .set('x-user-id', 'user-01')
        .send({
          ...validFacilityPayload,
          isVerified: true,
        });

      expect(response.status).toBe(403);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toMatch(/Only administrators.*permission/i);
    });
  });

  describe('GET /api/facilities & GET /api/facilities/:id — Discovery & Filtering', () => {
    let facility1Id: string;
    let facility2Id: string;

    beforeEach(async () => {
      const res1 = await request(app)
        .post('/api/facilities')
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send(validFacilityPayload);
      facility1Id = res1.body.data.id;

      const res2 = await request(app)
        .post('/api/facilities')
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({
          name: 'Downtown Community Blood Bank',
          facilityType: 'BLOOD_BANK',
          address: '42 Main St',
          city: 'Riverdale',
          state: 'State North',
          contactPhone: '+1-555-0244',
          isVerified: true,
        });
      facility2Id = res2.body.data.id;
    });

    it('lists facilities with pagination metadata', async () => {
      const response = await request(app).get('/api/facilities');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination).toMatchObject({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('filters facilities by city', async () => {
      const response = await request(app)
        .get('/api/facilities')
        .query({ city: 'Riverdale' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].id).toBe(facility2Id);
    });

    it('filters facilities by facilityType', async () => {
      const response = await request(app)
        .get('/api/facilities')
        .query({ facilityType: 'BLOOD_BANK' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].facilityType).toBe('BLOOD_BANK');
    });

    it('filters facilities by verification status', async () => {
      const response = await request(app)
        .get('/api/facilities')
        .query({ isVerified: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].id).toBe(facility2Id);
    });

    it('performs multi-criteria search by keyword', async () => {
      const response = await request(app)
        .get('/api/facilities')
        .query({ search: 'Apex' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].id).toBe(facility1Id);
    });

    it('retrieves details of a single facility by ID', async () => {
      const response = await request(app).get(`/api/facilities/${facility1Id}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.id).toBe(facility1Id);
      expect(response.body.data.name).toBe('Apex Trauma & Blood Center');
    });

    it('returns 404 for a non-existent UUID', async () => {
      const response = await request(app).get(
        '/api/facilities/00000000-0000-0000-0000-000000000000'
      );

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });

    it('returns 400 for an invalid UUID parameter format', async () => {
      const response = await request(app).get('/api/facilities/not-a-valid-uuid');

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });

  describe('PATCH /api/facilities/:id — Updates & RBAC Security Enforcement', () => {
    let facilityId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/facilities')
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send(validFacilityPayload);
      facilityId = res.body.data.id;
    });

    it('rejects unauthenticated update attempt (401)', async () => {
      const response = await request(app)
        .patch(`/api/facilities/${facilityId}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(401);
    });

    it('rejects modification by ordinary USER role (403)', async () => {
      const response = await request(app)
        .patch(`/api/facilities/${facilityId}`)
        .set('x-user-role', 'USER')
        .set('x-user-id', 'user-02')
        .send({ name: 'Hacked Facility Name' });

      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/Ordinary users are not authorized/i);
    });

    it('rejects modification by FACILITY_STAFF who does not manage this facility (403)', async () => {
      const response = await request(app)
        .patch(`/api/facilities/${facilityId}`)
        .set('x-user-role', 'FACILITY_STAFF')
        .set('x-user-id', 'staff-unrelated')
        .set('x-user-facility-id', '11111111-1111-1111-1111-111111111111')
        .send({ contactPhone: '+1-555-9999' });

      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/staff are not authorized to modify facilities they do not manage/i);
    });

    it('allows modification by FACILITY_STAFF assigned to manage this facility', async () => {
      const response = await request(app)
        .patch(`/api/facilities/${facilityId}`)
        .set('x-user-role', 'FACILITY_STAFF')
        .set('x-user-id', 'staff-01')
        .set('x-user-facility-id', facilityId)
        .send({ contactPhone: '+1-555-7788' });

      expect(response.status).toBe(200);
      expect(response.body.data.contactPhone).toBe('+1-555-7788');
    });

    it('prevents FACILITY_STAFF from promoting their facility to verified status (403)', async () => {
      const response = await request(app)
        .patch(`/api/facilities/${facilityId}`)
        .set('x-user-role', 'FACILITY_STAFF')
        .set('x-user-id', 'staff-01')
        .set('x-user-facility-id', facilityId)
        .send({ isVerified: true });

      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/Only administrators.*verification/i);
    });

    it('allows ADMIN to update facility fields including verification status', async () => {
      const response = await request(app)
        .patch(`/api/facilities/${facilityId}`)
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({ name: 'Apex Premier Medical Center', isVerified: true });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Apex Premier Medical Center');
      expect(response.body.data.isVerified).toBe(true);
    });

    it('returns 400 when update payload is empty', async () => {
      const response = await request(app)
        .patch(`/api/facilities/${facilityId}`)
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/facilities/:id/verify & DELETE /api/facilities/:id — Admin Controls', () => {
    let facilityId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/facilities')
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send(validFacilityPayload);
      facilityId = res.body.data.id;
    });

    it('denies verification promotion by non-admin roles (403)', async () => {
      const response = await request(app)
        .patch(`/api/facilities/${facilityId}/verify`)
        .set('x-user-role', 'FACILITY_STAFF')
        .set('x-user-id', 'staff-01')
        .set('x-user-facility-id', facilityId)
        .send({ isVerified: true });

      expect(response.status).toBe(403);
    });

    it('allows ADMIN to verify a facility', async () => {
      const response = await request(app)
        .patch(`/api/facilities/${facilityId}/verify`)
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({ isVerified: true });

      expect(response.status).toBe(200);
      expect(response.body.data.isVerified).toBe(true);
    });

    it('denies facility deletion by non-admin (403)', async () => {
      const response = await request(app)
        .delete(`/api/facilities/${facilityId}`)
        .set('x-user-role', 'FACILITY_STAFF')
        .set('x-user-id', 'staff-01')
        .set('x-user-facility-id', facilityId);

      expect(response.status).toBe(403);
    });

    it('allows ADMIN to delete a facility', async () => {
      const deleteRes = await request(app)
        .delete(`/api/facilities/${facilityId}`)
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01');

      expect(deleteRes.status).toBe(200);

      // Verify it no longer exists
      const getRes = await request(app).get(`/api/facilities/${facilityId}`);
      expect(getRes.status).toBe(404);
    });
  });

  describe('Global 404 Route Handling', () => {
    it('returns 404 JSON response for unmapped endpoints', async () => {
      const response = await request(app).get('/api/unmapped-endpoint');
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Endpoint not found',
      });
    });
  });
});
