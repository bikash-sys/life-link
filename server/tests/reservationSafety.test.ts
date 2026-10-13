import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { FacilityService } from '../src/services/facility.service.js';
import { InventoryService } from '../src/services/inventory.service.js';

describe('Safe Inventory Reservations & Concurrency Control', () => {
  let facilityId: string;
  let componentId: string;
  let medicineId: string;
  let bloodBatchId: string;
  let medicineBatchId: string;
  let expiredBloodBatchId: string;

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

  beforeEach(async () => {
    FacilityService.resetStore();
    InventoryService.resetStores();

    // Setup test facility
    const facRes = await request(app)
      .post('/api/facilities')
      .set('x-user-role', 'ADMIN')
      .set('x-user-id', 'admin-01')
      .send({
        name: 'Metro Emergency Reserve Depot',
        facilityType: 'BLOOD_BANK',
        address: '500 LifeLink Ave',
        city: 'Metro City',
        state: 'State Central',
        contactPhone: '+1-555-0999',
      });
    facilityId = facRes.body.data.id;

    const compRes = await request(app).get('/api/blood-components');
    componentId = compRes.body.data.find(
      (c: { code: string }) => c.code === 'O_NEG' || c.code === 'WHOLE_BLOOD'
    ).id;

    const medRes = await request(app).get('/api/medicines');
    medicineId = medRes.body.data[0].id;

    // Create blood batch with totalUnits = 10
    const bloodRes = await request(app)
      .post('/api/blood-inventory')
      .set('x-user-role', 'ADMIN')
      .set('x-user-id', 'admin-01')
      .send({
        facilityId,
        componentId,
        bloodGroup: 'O-',
        batchNumber: 'RESERVE-BLOOD-01',
        totalUnits: 10,
        collectionDate: getPastDate(2),
        expiryDate: getFutureDate(30),
      });
    bloodBatchId = bloodRes.body.data.id;

    // Create expired blood batch
    const expBloodRes = await request(app)
      .post('/api/blood-inventory')
      .set('x-user-role', 'ADMIN')
      .set('x-user-id', 'admin-01')
      .send({
        facilityId,
        componentId,
        bloodGroup: 'O-',
        batchNumber: 'EXPIRED-RESERVE-01',
        totalUnits: 10,
        collectionDate: getPastDate(40),
        expiryDate: getPastDate(1),
      });
    expiredBloodBatchId = expBloodRes.body.data.id;

    // Create medicine batch with totalUnits = 100
    const medBatchRes = await request(app)
      .post('/api/medicine-inventory')
      .set('x-user-role', 'ADMIN')
      .set('x-user-id', 'admin-01')
      .send({
        facilityId,
        medicineId,
        batchNumber: 'RESERVE-MED-01',
        totalUnits: 100,
        expiryDate: getFutureDate(180),
      });
    medicineBatchId = medBatchRes.body.data.id;
  });

  describe('Blood Stock Reservation Operations', () => {
    it('successfully places a hold on unreserved blood stock', async () => {
      const res = await request(app)
        .post(`/api/blood-inventory/${bloodBatchId}/reserve`)
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({
          quantity: 4,
          requestItemId: '33333333-3333-4333-8333-333333333333',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.reservedQuantity).toBe(4);
      expect(res.body.data.status).toBe('ACTIVE');

      // Verify batch availableUnits decremented
      const batchRes = await request(app).get(`/api/blood-inventory/${bloodBatchId}`);
      expect(batchRes.body.data.reservedUnits).toBe(4);
      expect(batchRes.body.data.availableUnits).toBe(6);
    });

    it('rejects reservation request when requested quantity exceeds available stock', async () => {
      // Total units is 10. Requesting 15 units.
      const res = await request(app)
        .post(`/api/blood-inventory/${bloodBatchId}/reserve`)
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({
          quantity: 15,
          requestItemId: '33333333-3333-4333-8333-333333333333',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Insufficient available stock/i);

      // Verify no partial state corruption occurred
      const batchRes = await request(app).get(`/api/blood-inventory/${bloodBatchId}`);
      expect(batchRes.body.data.reservedUnits).toBe(0);
      expect(batchRes.body.data.availableUnits).toBe(10);
    });

    it('strictly forbids reserving stock from an expired batch', async () => {
      const res = await request(app)
        .post(`/api/blood-inventory/${expiredBloodBatchId}/reserve`)
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({
          quantity: 1,
          requestItemId: '33333333-3333-4333-8333-333333333333',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Cannot reserve stock from an expired blood batch/i);
    });

    it('safely releases held reservation and restores available stock', async () => {
      // First hold 3 units
      const reqId = '44444444-4444-4444-8444-444444444444';
      await request(app)
        .post(`/api/blood-inventory/${bloodBatchId}/reserve`)
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({
          quantity: 3,
          requestItemId: reqId,
        });

      let check = await request(app).get(`/api/blood-inventory/${bloodBatchId}`);
      expect(check.body.data.availableUnits).toBe(7);

      // Release the 3 units
      const releaseRes = await request(app)
        .post(`/api/blood-inventory/${bloodBatchId}/release`)
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({
          quantity: 3,
          requestItemId: reqId,
        });

      expect(releaseRes.status).toBe(200);

      // Verify stock restored
      check = await request(app).get(`/api/blood-inventory/${bloodBatchId}`);
      expect(check.body.data.reservedUnits).toBe(0);
      expect(check.body.data.availableUnits).toBe(10);
    });

    it('simulates concurrent reservation race: stock is not oversold under simultaneous calls', async () => {
      // Batch has 10 units. We fire three simultaneous requests of 4 units each (total 12 units).
      // Exactly two must succeed (4 + 4 = 8), and the third must fail (need 4, only 2 left).
      const req1 = request(app)
        .post(`/api/blood-inventory/${bloodBatchId}/reserve`)
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({ quantity: 4, requestItemId: '11111111-1111-4111-8111-111111111111' });

      const req2 = request(app)
        .post(`/api/blood-inventory/${bloodBatchId}/reserve`)
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({ quantity: 4, requestItemId: '22222222-2222-4222-8222-222222222222' });

      const req3 = request(app)
        .post(`/api/blood-inventory/${bloodBatchId}/reserve`)
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({ quantity: 4, requestItemId: '33333333-3333-4333-8333-333333333333' });

      const results = await Promise.all([req1, req2, req3]);
      const statusCodes = results.map((r) => r.status);

      const successCount = statusCodes.filter((s) => s === 201).length;
      const failureCount = statusCodes.filter((s) => s === 400).length;

      expect(successCount).toBe(2);
      expect(failureCount).toBe(1);

      // Verify final stock consistency: total=10, reserved=8, available=2
      const finalCheck = await request(app).get(`/api/blood-inventory/${bloodBatchId}`);
      expect(finalCheck.body.data.reservedUnits).toBe(8);
      expect(finalCheck.body.data.availableUnits).toBe(2);
    });
  });

  describe('Medicine Stock Reservation Operations', () => {
    it('successfully reserves and releases medicine units', async () => {
      const res = await request(app)
        .post(`/api/medicine-inventory/${medicineBatchId}/reserve`)
        .set('x-user-role', 'ADMIN')
        .set('x-user-id', 'admin-01')
        .send({
          quantity: 35,
          requestItemId: '55555555-5555-4555-8555-555555555555',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.reservedQuantity).toBe(35);

      const check = await request(app).get(`/api/medicine-inventory/${medicineBatchId}`);
      expect(check.body.data.reservedUnits).toBe(35);
      expect(check.body.data.availableUnits).toBe(65);
    });
  });
});
