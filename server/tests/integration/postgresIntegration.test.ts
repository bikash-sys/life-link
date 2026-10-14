import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { getPrismaClient, disconnectPrisma } from '../../src/db/prisma.js';
import { userRepository } from '../../src/repositories/user.repository.js';
import { PrismaUserRepository } from '../../src/repositories/prismaUser.repository.js';
import { FacilityService } from '../../src/services/facility.service.js';
import { InventoryService } from '../../src/services/inventory.service.js';
import { hashPassword } from '../../src/utils/password.util.js';
import { AuthUser } from '../../src/types/auth.types.js';

describe('PostgreSQL Real Integration Suite', () => {
  const prisma = getPrismaClient();
  const facilityService = new FacilityService();
  const inventoryService = new InventoryService();

  // Test identifiers for cleanup
  const testRunId = randomUUID().slice(0, 8);
  const testUserEmail = `pg_test_${testRunId}@lifelink.test`;
  let createdUserId: string | null = null;
  let createdFacilityId: string | null = null;
  let createdMedicineId: string | null = null;
  let createdBloodBatchId: string | null = null;
  let createdMedicineBatchId: string | null = null;
  let concurrentBloodBatchId: string | null = null;

  // Known seed component from database/seed.sql (Packed Red Blood Cells)
  const validComponentId = 'bc000001-0000-0000-0000-000000000002';

  const adminActor: AuthUser = {
    id: randomUUID(),
    email: `admin_${testRunId}@lifelink.test`,
    role: 'ADMIN',
    facilityId: null,
  };

  const getStaffActor = (): AuthUser => ({
    id: createdUserId || randomUUID(),
    email: testUserEmail,
    role: 'FACILITY_STAFF',
    facilityId: createdFacilityId!,
  });

  beforeAll(async () => {
    process.env.STORAGE_DRIVER = 'postgres';
    // Verify direct PostgreSQL connection
    const result = await prisma.$queryRaw<Array<{ connected: number }>>`SELECT 1 as connected`;
    expect(result[0]?.connected).toBe(1);
  });

  afterAll(async () => {
    // Clean up all artifacts created during this test run in reverse dependency order
    try {
      if (concurrentBloodBatchId) {
        await prisma.auditLog.deleteMany({ where: { entityId: concurrentBloodBatchId } });
        await prisma.bloodInventory.deleteMany({ where: { id: concurrentBloodBatchId } });
      }
      if (createdBloodBatchId) {
        await prisma.auditLog.deleteMany({ where: { entityId: createdBloodBatchId } });
        await prisma.bloodInventory.deleteMany({ where: { id: createdBloodBatchId } });
      }
      if (createdMedicineBatchId) {
        await prisma.auditLog.deleteMany({ where: { entityId: createdMedicineBatchId } });
        await prisma.medicineInventory.deleteMany({ where: { id: createdMedicineBatchId } });
      }
      if (createdMedicineId) {
        await prisma.medicine.deleteMany({ where: { id: createdMedicineId } });
      }
      if (createdFacilityId) {
        await prisma.facility.deleteMany({ where: { id: createdFacilityId } });
      }
      if (createdUserId) {
        await prisma.user.deleteMany({ where: { id: createdUserId } });
      }
    } finally {
      await disconnectPrisma();
    }
  });

  describe('1. User Repository PostgreSQL Persistence', () => {
    it('persists a new user directly in PostgreSQL and retrieves it', async () => {
      const pwd = await hashPassword('SecurePass123!');
      const user = await userRepository.create({
        email: testUserEmail,
        passwordHash: pwd,
        fullName: 'Integration Test User',
        phone: '+977-9800000000',
        role: 'USER',
        facilityId: null,
      });

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(testUserEmail);
      createdUserId = user.id;

      // Direct SQL verification against PostgreSQL table
      const dbRows = await prisma.$queryRaw<Array<{ id: string; email: string; full_name: string }>>`
        SELECT id, email, full_name FROM users WHERE id = ${user.id}::uuid
      `;
      expect(dbRows.length).toBe(1);
      expect(dbRows[0]?.email).toBe(testUserEmail);
      expect(dbRows[0]?.full_name).toBe('Integration Test User');

      // Verify retrieval through standard repository findByEmail
      const found = await userRepository.findByEmail(testUserEmail);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(user.id);
    });

    it('re-instantiated repository retrieves the user (proving non-in-memory storage)', async () => {
      // Create a brand new, isolated instance of PrismaUserRepository
      const brandNewRepo = new PrismaUserRepository();
      const user = await brandNewRepo.findByEmail(testUserEmail);
      expect(user).not.toBeNull();
      expect(user?.email).toBe(testUserEmail);
      expect(user?.id).toBe(createdUserId);
    });

    it('enforces unique email constraint at database level', async () => {
      const pwd = await hashPassword('DuplicatePass123!');
      await expect(
        userRepository.create({
          email: testUserEmail,
          passwordHash: pwd,
          fullName: 'Duplicate Email User',
          phone: '+977-9811111111',
          role: 'USER',
          facilityId: null,
        })
      ).rejects.toThrow();
    });
  });

  describe('2. Facility Management PostgreSQL Persistence', () => {
    const facilityName = `Test Hospital ${testRunId}`;

    it('creates and persists a facility in PostgreSQL', async () => {
      const facility = await facilityService.createFacility({
        name: facilityName,
        facilityType: 'HOSPITAL',
        address: '100 Health Avenue',
        city: 'Kathmandu',
        state: 'Bagmati',
        postalCode: '44600',
        latitude: 27.7172,
        longitude: 85.324,
        contactPhone: '+977-1-4444444',
        contactEmail: `contact_${testRunId}@testhospital.org`,
      }, adminActor);

      expect(facility).toBeDefined();
      expect(facility.id).toBeDefined();
      expect(facility.name).toBe(facilityName);
      createdFacilityId = facility.id;

      // Direct PostgreSQL query
      const dbRows = await prisma.$queryRaw<Array<{ id: string; name: string; city: string }>>`
        SELECT id, name, city FROM facilities WHERE id = ${facility.id}::uuid
      `;
      expect(dbRows.length).toBe(1);
      expect(dbRows[0]?.name).toBe(facilityName);
      expect(dbRows[0]?.city).toBe('Kathmandu');
    });

    it('re-instantiated FacilityService reads facility from PostgreSQL', async () => {
      const freshService = new FacilityService();
      const fetched = await freshService.getFacilityById(createdFacilityId!);
      expect(fetched).toBeDefined();
      expect(fetched.name).toBe(facilityName);
      expect(fetched.city).toBe('Kathmandu');
    });

    it('updates facility details and verifies database persistence', async () => {
      const freshService = new FacilityService();
      const updated = await freshService.updateFacility(createdFacilityId!, {
        contactPhone: '+977-1-9999999',
      }, adminActor);
      expect(updated.contactPhone).toBe('+977-1-9999999');

      // Direct PostgreSQL query to verify updated record
      const dbRows = await prisma.$queryRaw<Array<{ contact_phone: string }>>`
        SELECT contact_phone FROM facilities WHERE id = ${createdFacilityId!}::uuid
      `;
      expect(dbRows[0]?.contact_phone).toBe('+977-1-9999999');
    });
  });

  describe('3. Blood Inventory Persistence & Composite Constraints', () => {
    const batchNumber = `BLD-PG-${testRunId}`;

    it('creates a blood inventory batch and persists it in PostgreSQL', async () => {
      const collectionDate = new Date();
      collectionDate.setDate(collectionDate.getDate() - 5);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 35);

      const batch = await inventoryService.createBloodBatch({
        facilityId: createdFacilityId!,
        componentId: validComponentId,
        bloodGroup: 'B+',
        batchNumber,
        totalUnits: 25,
        collectionDate: collectionDate.toISOString().slice(0, 10),
        expiryDate: expiryDate.toISOString().slice(0, 10),
        storageLocation: 'Shelf-B4',
      }, getStaffActor());

      expect(batch).toBeDefined();
      expect(batch.id).toBeDefined();
      expect(batch.bloodGroup).toBe('B+');
      expect(batch.totalUnits).toBe(25);
      expect(batch.availableUnits).toBe(25);
      createdBloodBatchId = batch.id;

      // Direct SQL check
      const rows = await prisma.$queryRaw<Array<{ id: string; blood_group: string; total_units: number }>>`
        SELECT id, blood_group::text, total_units FROM blood_inventory WHERE id = ${batch.id}::uuid
      `;
      expect(rows.length).toBe(1);
      expect(rows[0]?.blood_group).toBe('B+');
      expect(rows[0]?.total_units).toBe(25);
    });

    it('enforces composite uniqueness on (facilityId, batchNumber)', async () => {
      const collectionDate = new Date().toISOString().slice(0, 10);
      const expiryDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

      await expect(
        inventoryService.createBloodBatch({
          facilityId: createdFacilityId!,
          componentId: validComponentId,
          bloodGroup: 'B+',
          batchNumber, // Same batch number at same facility
          totalUnits: 10,
          collectionDate,
          expiryDate,
        }, getStaffActor())
      ).rejects.toThrow();
    });

    it('filters blood batches correctly from PostgreSQL', async () => {
      const result = await inventoryService.listBloodInventory({
        facilityId: createdFacilityId!,
        bloodGroup: 'B+',
        availableOnly: true,
      });

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      const matched = result.data.find((b) => b.id === createdBloodBatchId);
      expect(matched).toBeDefined();
      expect(matched?.bloodGroup).toBe('B+');
      expect(matched?.batchNumber).toBe(batchNumber);
    });

    it('enforces foreign key constraint on invalid facilityId', async () => {
      const nonExistentFacilityId = '00000000-0000-0000-0000-000000000000';
      await expect(
        inventoryService.createBloodBatch({
          facilityId: nonExistentFacilityId,
          componentId: validComponentId,
          bloodGroup: 'O+',
          batchNumber: `FAIL-${testRunId}`,
          totalUnits: 10,
          collectionDate: '2026-01-01',
          expiryDate: '2026-02-01',
        }, adminActor)
      ).rejects.toThrow();
    });
  });

  describe('4. Medicine Inventory Persistence & Catalog', () => {
    const medBatchNumber = `MED-PG-${testRunId}`;

    it('creates medicine catalog item and persists in PostgreSQL', async () => {
      const med = await inventoryService.createMedicine({
        name: `Paracetamol ${testRunId}`,
        genericName: 'Acetaminophen',
        dosageForm: 'TABLET',
        strength: '500mg',
        manufacturer: 'Nepal Pharma Ltd',
        category: 'Analgesics',
      }, adminActor);

      expect(med).toBeDefined();
      expect(med.id).toBeDefined();
      createdMedicineId = med.id;

      // Direct SQL check
      const rows = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
        SELECT id, name FROM medicines WHERE id = ${med.id}::uuid
      `;
      expect(rows.length).toBe(1);
      expect(rows[0]?.name).toBe(`Paracetamol ${testRunId}`);
    });

    it('creates medicine batch and persists in PostgreSQL', async () => {
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      const batch = await inventoryService.createMedicineBatch({
        facilityId: createdFacilityId!,
        medicineId: createdMedicineId!,
        batchNumber: medBatchNumber,
        totalUnits: 100,
        expiryDate: expiryDate.toISOString().slice(0, 10),
        storageLocation: 'Cabinet-M1',
      }, getStaffActor());

      expect(batch).toBeDefined();
      expect(batch.id).toBeDefined();
      expect(batch.totalUnits).toBe(100);
      expect(batch.availableUnits).toBe(100);
      createdMedicineBatchId = batch.id;

      // Direct SQL check
      const rows = await prisma.$queryRaw<Array<{ id: string; batch_number: string; total_units: number }>>`
        SELECT id, batch_number, total_units FROM medicine_inventory WHERE id = ${batch.id}::uuid
      `;
      expect(rows.length).toBe(1);
      expect(rows[0]?.batch_number).toBe(medBatchNumber);
    });

    it('enforces composite uniqueness on (facilityId, medicineId, batchNumber)', async () => {
      const expiryDate = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
      await expect(
        inventoryService.createMedicineBatch({
          facilityId: createdFacilityId!,
          medicineId: createdMedicineId!,
          batchNumber: medBatchNumber,
          totalUnits: 50,
          expiryDate,
        }, getStaffActor())
      ).rejects.toThrow();
    });
  });

  describe('5. ACID Concurrent Reservation Safety (Pessimistic Row Locking)', () => {
    it('prevents over-reservation under high concurrency via PostgreSQL transactions & FOR UPDATE locks', async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      // Create a batch with exactly 10 units
      const batch = await inventoryService.createBloodBatch({
        facilityId: createdFacilityId!,
        componentId: validComponentId,
        bloodGroup: 'AB+',
        batchNumber: `CONCUR-${testRunId}`,
        totalUnits: 10,
        collectionDate: new Date().toISOString().slice(0, 10),
        expiryDate: expiryDate.toISOString().slice(0, 10),
      }, getStaffActor());
      concurrentBloodBatchId = batch.id;

      // Launch 5 simultaneous reservation requests of 3 units each
      // Total demand: 5 * 3 = 15 units.
      // Available: 10 units.
      // Exactly 3 requests must succeed (9 units reserved).
      // Exactly 2 requests must fail with insufficient stock.
      const reservationPromises = Array.from({ length: 5 }, (_, i) =>
        inventoryService.reserveBloodStock(
          concurrentBloodBatchId!,
          3,
          `req_item_concur_${i}`,
          120,
          getStaffActor()
        )
      );

      const results = await Promise.allSettled(reservationPromises);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(3);
      expect(rejected.length).toBe(2);

      // Verify the rejection errors mention insufficient stock
      rejected.forEach((r) => {
        if (r.status === 'rejected') {
          expect(r.reason.message).toContain('Insufficient available stock');
        }
      });

      // Verify PostgreSQL database state: exactly 9 reserved, 1 remaining available
      const dbRows = await prisma.$queryRaw<Array<{ total_units: number; reserved_units: number }>>`
        SELECT total_units, reserved_units FROM blood_inventory WHERE id = ${concurrentBloodBatchId}::uuid
      `;
      expect(dbRows[0]?.total_units).toBe(10);
      expect(dbRows[0]?.reserved_units).toBe(9);

      // Test stock release
      await inventoryService.releaseBloodStock(concurrentBloodBatchId!, 6, 'req_release_test', getStaffActor());

      const releasedRows = await prisma.$queryRaw<Array<{ total_units: number; reserved_units: number }>>`
        SELECT total_units, reserved_units FROM blood_inventory WHERE id = ${concurrentBloodBatchId}::uuid
      `;
      expect(releasedRows[0]?.total_units).toBe(10);
      expect(releasedRows[0]?.reserved_units).toBe(3);
    });
  });
});
