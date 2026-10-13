import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { FacilityService } from '../src/services/facility.service.js';
import { InventoryService } from '../src/services/inventory.service.js';

describe('Blood Inventory Management Integration Tests', () => {
  let facilityId: string;
  let componentId: string;

  beforeEach(async () => {
    FacilityService.resetStore();
    InventoryService.resetStores();

    // Create test facility
    const facilityRes = await request(app)
      .post('/api/facilities')
      .set('x-user-role', 'ADMIN')
      .set('x-user-id', 'admin-01')
      .send({
        name: 'Regional Blood Bank Alpha',
        facilityType: 'BLOOD_BANK',
        address: '100 Transfusion Way',
        city: 'Metro City',
        state: 'State Central',
        contactPhone: '+1-555-0111',
      });
    facilityId = facilityRes.body.data.id;

    // Get PRBC component ID from catalog
    const compRes = await request(app).get('/api/blood-components');
    const prbc = compRes.body.data.find((c: { code: string }) => c.code === 'PRBC');
    componentId = prbc.id;
  });

  const getFutureDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split('T')[0];
  };

  const getPastDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  describe('Blood Components Catalog Endpoints', () => {
    it('GET /api/blood-components returns 200 with standard catalogs', async () => {
      const res = await request(app).get('/api/blood-components');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(5);

      const codes = res.body.data.map((c: { code: string }) => c.code);
      expect(codes).toContain('WHOLE_BLOOD');
      expect(codes).toContain('PRBC');
      expect(codes).toContain('PLATELETS');
      expect(codes).toContain('FFP');
      expect(codes).toContain('CRYOPRECIPITATE');
    });

    it('GET /api/blood-components/:id returns details of single component', async () => {
      const res = await request(app).get(`/api/blood-components/${componentId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.code).toBe('PRBC');
      expect(res.body.data.defaultShelfLifeDays).toBe(42);
    });
  });

  describe('POST /api/blood-inventory — Batch Creation & Validation', () => {
    it('creates blood batch when authorized as facility staff', async () => {
      const res = await request(app)
        .post('/api/blood-inventory')
        .set('x-user-role', 'FACILITY_STAFF')
        .set('x-user-id', 'staff-alpha')
        .set('x-user-facility-id', facilityId)
        .send({
          facilityId,
          componentId,
          bloodGroup: 'O+',
          batchNumber: 'B-2026-001',
          totalUnits: 15,
          collectionDate: getPastDate(5),
          expiryDate: getFutureDate(37),
          storageLocation: 'Refrigerator-Unit-2',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.bloodGroup).toBe('O+');
      expect(res.body.data.totalUnits).toBe(15);
      expect(res.body.data.reservedUnits).toBe(0);
      expect(res.body.data.availableUnits).toBe(15);
      expect(res.body.data.status).toBe('AVAILABLE');
    });

    it('rejects batch creation when unauthenticated (401)', async () => {
      const res = await request(app)
        .post('/api/blood-inventory')
        .send({
          facilityId,
          componentId,
          bloodGroup: 'O+',
          batchNumber: 'B-2026-002',
          totalUnits: 10,
          collectionDate: getPastDate(2),
          expiryDate: getFutureDate(40),
        });

      expect(res.status).toBe(401);
    });

    it('rejects batch creation by ordinary USER role (403)', async () => {
      const res = await request(app)
        .post('/api/blood-inventory')
        .set('x-user-role', 'USER')
        .set('x-user-id', 'regular-user')
        .send({
          facilityId,
          componentId,
          bloodGroup: 'A+',
          batchNumber: 'B-2026-003',
          totalUnits: 5,
          collectionDate: getPastDate(1),
          expiryDate: getFutureDate(41),
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Ordinary users are not authorized/i);
    });

    it('rejects batch creation by staff of a DIFFERENT facility (403)', async () => {
      const res = await request(app)
        .post('/api/blood-inventory')
        .set('x-user-role', 'FACILITY_STAFF')
        .set('x-user-id', 'staff-other')
        .set('x-user-facility-id', '99999999-9999-9999-9999-999999999999')
        .send({
          facilityId,
          componentId,
          bloodGroup: 'B-',
          batchNumber: 'B-2026-004',
          totalUnits: 5,
          collectionDate: getPastDate(1),
          expiryDate: getFutureDate(41),
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized to modify inventory for a facility they do not manage/i);
    });

    it('rejects duplicate batch number at the SAME facility (409 Conflict)', async () => {
      // First batch
      await request(app)
        .post('/api/blood-inventory')
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({
          facilityId,
          componentId,
          bloodGroup: 'AB+',
          batchNumber: 'DUP-BATCH-001',
          totalUnits: 10,
          collectionDate: getPastDate(2),
          expiryDate: getFutureDate(40),
        });

      // Second batch with duplicate identifier
      const res = await request(app)
        .post('/api/blood-inventory')
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({
          facilityId,
          componentId,
          bloodGroup: 'AB+',
          batchNumber: 'DUP-BATCH-001',
          totalUnits: 5,
          collectionDate: getPastDate(1),
          expiryDate: getFutureDate(41),
        });

      expect(res.status).toBe(409);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('rejects negative or zero total units via Zod validation (400)', async () => {
      const res = await request(app)
        .post('/api/blood-inventory')
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({
          facilityId,
          componentId,
          bloodGroup: 'O-',
          batchNumber: 'B-INVALID-001',
          totalUnits: -5, // Negative quantity
          collectionDate: getPastDate(1),
          expiryDate: getFutureDate(40),
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('rejects invalid expiry date where expiry is before collection date (400)', async () => {
      const res = await request(app)
        .post('/api/blood-inventory')
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({
          facilityId,
          componentId,
          bloodGroup: 'O-',
          batchNumber: 'B-INVALID-002',
          totalUnits: 10,
          collectionDate: getFutureDate(10),
          expiryDate: getPastDate(5), // Expiry before collection
        });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].message).toMatch(/Expiry date must be strictly after collection date/i);
    });
  });

  describe('GET /api/blood-inventory — Filtering & Expiry Masking', () => {
    let validBatchId: string;
    let expiredBatchId: string;

    beforeEach(async () => {
      // Valid fresh batch
      const resValid = await request(app)
        .post('/api/blood-inventory')
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({
          facilityId,
          componentId,
          bloodGroup: 'O+',
          batchNumber: 'FRESH-001',
          totalUnits: 20,
          collectionDate: getPastDate(2),
          expiryDate: getFutureDate(30),
        });
      validBatchId = resValid.body.data.id;

      // Expired batch (expiry date in the past)
      const resExpired = await request(app)
        .post('/api/blood-inventory')
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({
          facilityId,
          componentId,
          bloodGroup: 'O+',
          batchNumber: 'EXPIRED-001',
          totalUnits: 8,
          collectionDate: getPastDate(45),
          expiryDate: getPastDate(1), // Already expired
        });
      expiredBatchId = resExpired.body.data.id;
    });

    it('automatically flags past-expiry batch as EXPIRED with availableUnits = 0', async () => {
      const res = await request(app).get(`/api/blood-inventory/${expiredBatchId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('EXPIRED');
      expect(res.body.data.availableUnits).toBe(0);
    });

    it('filters out expired batches when availableOnly=true is requested', async () => {
      const res = await request(app)
        .get('/api/blood-inventory')
        .query({ availableOnly: 'true' });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(validBatchId);
      expect(res.body.data[0].availableUnits).toBe(20);
    });

    it('filters blood batches by blood group', async () => {
      const res = await request(app)
        .get('/api/blood-inventory')
        .query({ bloodGroup: 'O+' });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it('supports facility-nested route GET /api/facilities/:facilityId/blood-inventory', async () => {
      const res = await request(app).get(
        `/api/facilities/${facilityId}/blood-inventory`
      );

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });
  });

  describe('PATCH /api/blood-inventory/:id/stock — Safe Stock Adjustments', () => {
    let batchId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/blood-inventory')
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({
          facilityId,
          componentId,
          bloodGroup: 'A-',
          batchNumber: 'ADJUST-001',
          totalUnits: 10,
          reservedUnits: 4,
          collectionDate: getPastDate(2),
          expiryDate: getFutureDate(30),
        });
      batchId = res.body.data.id;
    });

    it('increases total stock safely', async () => {
      const res = await request(app)
        .patch(`/api/blood-inventory/${batchId}/stock`)
        .set('x-user-role', 'FACILITY_STAFF')
        .set('x-user-id', 'staff-alpha')
        .set('x-user-facility-id', facilityId)
        .send({ quantityDelta: 5 });

      expect(res.status).toBe(200);
      expect(res.body.data.totalUnits).toBe(15);
      expect(res.body.data.reservedUnits).toBe(4);
      expect(res.body.data.availableUnits).toBe(11);
    });

    it('rejects stock reduction that would drop totalUnits below active reserved units', async () => {
      // Current: total=10, reserved=4. Reducing by 8 would result in total=2 < reserved=4!
      const res = await request(app)
        .patch(`/api/blood-inventory/${batchId}/stock`)
        .set('x-user-role', 'FACILITY_STAFF')
        .set('x-user-id', 'staff-alpha')
        .set('x-user-facility-id', facilityId)
        .send({ quantityDelta: -8 });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot be less than currently active reserved units/i);
    });

    it('rejects stock reduction that would result in negative totalUnits', async () => {
      const res = await request(app)
        .patch(`/api/blood-inventory/${batchId}/stock`)
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({ totalUnits: -1 });

      expect(res.status).toBe(400);
    });
  });
});
