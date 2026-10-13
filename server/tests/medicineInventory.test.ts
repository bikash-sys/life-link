import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { FacilityService } from '../src/services/facility.service.js';
import { InventoryService } from '../src/services/inventory.service.js';

describe('Medicine Inventory Management Integration Tests', () => {
  let facilityId: string;
  let medicineId: string;

  beforeEach(async () => {
    FacilityService.resetStore();
    InventoryService.resetStores();

    // Create test pharmacy facility
    const facRes = await request(app)
      .post('/api/facilities')
      .set('x-user-role', 'ADMIN')
      .set('x-user-id', 'admin-01')
      .send({
        name: 'Central Hospital Pharmacy',
        facilityType: 'PHARMACY',
        address: '250 Medical Plaza',
        city: 'Metro City',
        state: 'State Central',
        contactPhone: '+1-555-0222',
      });
    facilityId = facRes.body.data.id;

    // Get seeded Paracetamol medicine ID from catalog
    const medListRes = await request(app).get('/api/medicines');
    const paracetamol = medListRes.body.data.find(
      (m: { name: string }) => m.name.includes('Paracetamol')
    );
    medicineId = paracetamol.id;
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

  describe('Medicine Master Catalog (3NF)', () => {
    it('GET /api/medicines returns seeded master medicine catalog with pagination', async () => {
      const res = await request(app).get('/api/medicines');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);
      expect(res.body.pagination).toMatchObject({ page: 1, limit: 10 });
    });

    it('filters master medicines by generic name / keyword', async () => {
      const res = await request(app)
        .get('/api/medicines')
        .query({ search: 'Amoxicillin' });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].dosageForm).toBe('CAPSULE');
    });

    it('allows ADMIN to register new master medicine (POST /api/medicines)', async () => {
      const res = await request(app)
        .post('/api/medicines')
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({
          name: 'Ceftriaxone 1g Vial',
          genericName: 'Ceftriaxone Sodium',
          dosageForm: 'VIAL',
          strength: '1 g',
          manufacturer: 'Rocephin / Roche',
          category: 'Third-Generation Cephalosporin Antibiotic',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe('Ceftriaxone 1g Vial');
    });

    it('denies non-admin roles from creating master medicines (403)', async () => {
      const res = await request(app)
        .post('/api/medicines')
        .set('x-user-role', 'FACILITY_STAFF')
        .set('x-user-id', 'staff-01')
        .send({
          name: 'Unauthorized Drug',
          genericName: 'Drug X',
          dosageForm: 'TABLET',
          strength: '10mg',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/medicine-inventory — Batch Creation & Validation', () => {
    it('creates medicine batch when authorized as facility staff', async () => {
      const res = await request(app)
        .post('/api/medicine-inventory')
        .set('x-user-role', 'FACILITY_STAFF')
        .set('x-user-id', 'staff-pharmacy')
        .set('x-user-facility-id', facilityId)
        .send({
          facilityId,
          medicineId,
          batchNumber: 'MED-BATCH-2026-X1',
          totalUnits: 500,
          expiryDate: getFutureDate(365),
          storageLocation: 'Shelf-A3',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.batchNumber).toBe('MED-BATCH-2026-X1');
      expect(res.body.data.totalUnits).toBe(500);
      expect(res.body.data.reservedUnits).toBe(0);
      expect(res.body.data.availableUnits).toBe(500);
      expect(res.body.data.status).toBe('AVAILABLE');
    });

    it('rejects duplicate batch number for the same medicine at same facility (409)', async () => {
      await request(app)
        .post('/api/medicine-inventory')
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({
          facilityId,
          medicineId,
          batchNumber: 'DUP-MED-BATCH',
          totalUnits: 200,
          expiryDate: getFutureDate(180),
        });

      const duplicateRes = await request(app)
        .post('/api/medicine-inventory')
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({
          facilityId,
          medicineId,
          batchNumber: 'DUP-MED-BATCH',
          totalUnits: 100,
          expiryDate: getFutureDate(180),
        });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.status).toBe('error');
      expect(duplicateRes.body.message).toMatch(/already exists/i);
    });

    it('rejects creation by staff belonging to a different facility (403)', async () => {
      const res = await request(app)
        .post('/api/medicine-inventory')
        .set('x-user-role', 'FACILITY_STAFF')
        .set('x-user-id', 'staff-other')
        .set('x-user-facility-id', '88888888-8888-8888-8888-888888888888')
        .send({
          facilityId,
          medicineId,
          batchNumber: 'MED-UNAUTH-01',
          totalUnits: 100,
          expiryDate: getFutureDate(90),
        });

      expect(res.status).toBe(403);
    });

    it('rejects negative or zero total units (400)', async () => {
      const res = await request(app)
        .post('/api/medicine-inventory')
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({
          facilityId,
          medicineId,
          batchNumber: 'MED-NEG-01',
          totalUnits: -20,
          expiryDate: getFutureDate(90),
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/medicine-inventory — Expiry Masking & Safe Adjustments', () => {
    let validBatchId: string;
    let expiredBatchId: string;

    beforeEach(async () => {
      const resValid = await request(app)
        .post('/api/medicine-inventory')
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({
          facilityId,
          medicineId,
          batchNumber: 'BATCH-VALID-2026',
          totalUnits: 300,
          expiryDate: getFutureDate(120),
        });
      validBatchId = resValid.body.data.id;

      const resExpired = await request(app)
        .post('/api/medicine-inventory')
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({
          facilityId,
          medicineId,
          batchNumber: 'BATCH-EXPIRED-2026',
          totalUnits: 150,
          expiryDate: getPastDate(10), // Expired 10 days ago
        });
      expiredBatchId = resExpired.body.data.id;
    });

    it('automatically excludes expired medicine batches when availableOnly=true', async () => {
      const res = await request(app)
        .get('/api/medicine-inventory')
        .query({ availableOnly: 'true' });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(validBatchId);
      expect(res.body.data[0].availableUnits).toBe(300);
    });

    it('correctly marks expired batch status as EXPIRED on fetch', async () => {
      const res = await request(app).get(
        `/api/medicine-inventory/${expiredBatchId}`
      );

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('EXPIRED');
      expect(res.body.data.availableUnits).toBe(0);
    });

    it('safely updates medicine batch stock through PATCH endpoint', async () => {
      const res = await request(app)
        .patch(`/api/medicine-inventory/${validBatchId}/stock`)
        .set('x-user-role', 'FACILITY_STAFF')
        .set('x-user-id', 'staff-pharmacy')
        .set('x-user-facility-id', facilityId)
        .send({ quantityDelta: -50 });

      expect(res.status).toBe(200);
      expect(res.body.data.totalUnits).toBe(250);
      expect(res.body.data.availableUnits).toBe(250);
    });
  });
});
