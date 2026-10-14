import { randomUUID } from 'node:crypto';
import {
  BloodGroup,
  BloodComponent,
  BloodInventoryBatch,
  Medicine,
  MedicineInventoryBatch,
  ReservationRecord,
  BloodInventoryFilterOptions,
  MedicineInventoryFilterOptions,
  MedicineCatalogFilterOptions,
  InventoryStatus,
} from '../types/inventory.types.js';
import { AuthUser } from '../types/auth.types.js';
import {
  CreateBloodBatchInput,
  UpdateBloodStockInput,
  CreateMedicineInput,
  CreateMedicineBatchInput,
  UpdateMedicineStockInput,
} from '../validators/inventory.validator.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
} from '../errors/appError.js';
import { FacilityService } from './facility.service.js';
import { getPrismaClient } from '../db/prisma.js';

const bloodGroupToPrisma: Record<string, any> = {
  'A+': 'A_POS',
  'A-': 'A_NEG',
  'B+': 'B_POS',
  'B-': 'B_NEG',
  'AB+': 'AB_POS',
  'AB-': 'AB_NEG',
  'O+': 'O_POS',
  'O-': 'O_NEG',
};

const prismaToBloodGroup: Record<string, BloodGroup> = {
  A_POS: 'A+',
  A_NEG: 'A-',
  B_POS: 'B+',
  B_NEG: 'B-',
  AB_POS: 'AB+',
  AB_NEG: 'AB-',
  O_POS: 'O+',
  O_NEG: 'O-',
  'A+': 'A+',
  'A-': 'A-',
  'B+': 'B+',
  'B-': 'B-',
  'AB+': 'AB+',
  'AB-': 'AB-',
  'O+': 'O+',
  'O-': 'O-',
};

export class InventoryService {
  // In-memory repositories for resilient, fast, deterministic testing & mock execution
  private static bloodComponentsStore: Map<string, BloodComponent> = new Map();
  private static bloodInventoryStore: Map<string, BloodInventoryBatch> = new Map();
  private static medicinesStore: Map<string, Medicine> = new Map();
  private static medicineInventoryStore: Map<string, MedicineInventoryBatch> = new Map();
  private static reservationsStore: Map<string, ReservationRecord> = new Map();
  private static auditLogsStore: Array<{
    id: string;
    entityType: string;
    entityId: string;
    actorId?: string | null;
    action: string;
    details: Record<string, unknown>;
    createdAt: Date;
  }> = [];

  constructor() {
    InventoryService.seedDefaultCatalogs();
  }

  private static isPostgres(): boolean {
    return process.env.STORAGE_DRIVER === 'postgres';
  }

  /**
   * Clears inventory stores (essential for isolated test runs)
   */
  public static resetStores(): void {
    InventoryService.bloodComponentsStore.clear();
    InventoryService.bloodInventoryStore.clear();
    InventoryService.medicinesStore.clear();
    InventoryService.medicineInventoryStore.clear();
    InventoryService.reservationsStore.clear();
    InventoryService.auditLogsStore = [];
    InventoryService.seedDefaultCatalogs();
  }

  /**
   * Seeds standardized blood component catalog and initial medicines
   */
  public static seedDefaultCatalogs(): void {
    if (InventoryService.bloodComponentsStore.size === 0) {
      const defaultComponents: BloodComponent[] = [
        {
          id: '10000000-0000-4000-8000-000000000001',
          code: 'WHOLE_BLOOD',
          name: 'Whole Blood (Human)',
          defaultShelfLifeDays: 35,
          storageTempCelsius: '2 to 6°C',
          description: 'Standard whole blood donation unit (approx 450-500 mL) collected in CPD/CPDA-1 anticoagulant.',
          createdAt: new Date('2026-01-01'),
        },
        {
          id: '10000000-0000-4000-8000-000000000002',
          code: 'PRBC',
          name: 'Packed Red Blood Cells',
          defaultShelfLifeDays: 42,
          storageTempCelsius: '2 to 6°C',
          description: 'Centrifuged red blood cells with SAGM additive solution for oxygen-carrying capacity.',
          createdAt: new Date('2026-01-01'),
        },
        {
          id: '10000000-0000-4000-8000-000000000003',
          code: 'PLATELETS',
          name: 'Platelet Concentrate',
          defaultShelfLifeDays: 5,
          storageTempCelsius: '20 to 24°C with continuous gentle agitation',
          description: 'Random or apheresis platelets used for severe thrombocytopenia or active platelet dysfunction.',
          createdAt: new Date('2026-01-01'),
        },
        {
          id: '10000000-0000-4000-8000-000000000004',
          code: 'FFP',
          name: 'Fresh Frozen Plasma',
          defaultShelfLifeDays: 365,
          storageTempCelsius: '-18°C or colder',
          description: 'Plasma separated and frozen within 8 hours of phlebotomy, rich in all coagulation factors.',
          createdAt: new Date('2026-01-01'),
        },
        {
          id: '10000000-0000-4000-8000-000000000005',
          code: 'CRYOPRECIPITATE',
          name: 'Cryoprecipitated AHF',
          defaultShelfLifeDays: 365,
          storageTempCelsius: '-18°C or colder',
          description: 'Cold-insoluble fraction of plasma rich in Factor VIII, von Willebrand factor, and Fibrinogen.',
          createdAt: new Date('2026-01-01'),
        },
      ];

      for (const comp of defaultComponents) {
        InventoryService.bloodComponentsStore.set(comp.id, comp);
      }
    }

    if (InventoryService.medicinesStore.size === 0) {
      const defaultMedicines: Medicine[] = [
        {
          id: '20000000-0000-4000-8000-000000000001',
          name: 'Paracetamol 500mg',
          genericName: 'Acetaminophen / Paracetamol',
          dosageForm: 'TABLET',
          strength: '500 mg',
          manufacturer: 'GSK / Generic Pharma',
          category: 'Analgesics & Antipyretics',
          description: 'First-line antipyretic and analgesic oral tablet.',
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
        {
          id: '20000000-0000-4000-8000-000000000002',
          name: 'Amoxicillin 500mg',
          genericName: 'Amoxicillin Trihydrate',
          dosageForm: 'CAPSULE',
          strength: '500 mg',
          manufacturer: 'Sandoz',
          category: 'Antibacterial / Beta-lactam',
          description: 'Broad-spectrum aminopenicillin antibiotic.',
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
        {
          id: '20000000-0000-4000-8000-000000000003',
          name: 'Epinephrine 1mg/ml (1:1000)',
          genericName: 'Epinephrine / Adrenaline',
          dosageForm: 'INJECTION',
          strength: '1 mg/mL',
          manufacturer: 'Pfizer Injectables',
          category: 'Emergency / Anaphylaxis & Resuscitation',
          description: 'Emergency sympathomimetic alpha/beta adrenergic agonist.',
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
        {
          id: '20000000-0000-4000-8000-000000000004',
          name: 'Normal Saline 0.9% IV',
          genericName: 'Sodium Chloride 0.9%',
          dosageForm: 'IV_INFUSION',
          strength: '0.9% w/v (500 mL)',
          manufacturer: 'Baxter Healthcare',
          category: 'IV Fluids & Electrolytes',
          description: 'Isotonic crystalloid fluid for intravenous hydration and resuscitation.',
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
        {
          id: '20000000-0000-4000-8000-000000000005',
          name: 'Regular Human Insulin 100 IU/ml',
          genericName: 'Insulin (Regular / Soluble)',
          dosageForm: 'VIAL',
          strength: '100 IU/mL (10 mL)',
          manufacturer: 'Novo Nordisk',
          category: 'Endocrine & Metabolic / Antidiabetic',
          description: 'Short-acting human regular insulin for glycemic control in diabetes and ketoacidosis.',
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
      ];

      for (const med of defaultMedicines) {
        InventoryService.medicinesStore.set(med.id, med);
      }
    }
  }

  public static isDateExpired(dateString: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateString);
    target.setHours(0, 0, 0, 0);
    return target < today;
  }

  public static computeAvailableUnits(
    total: number,
    reserved: number,
    expiryDate: string,
    status: InventoryStatus
  ): number {
    if (status !== 'AVAILABLE') return 0;
    if (InventoryService.isDateExpired(expiryDate)) return 0;
    return Math.max(0, total - reserved);
  }

  private enforceFacilityStaffAccess(facilityId: string, actor?: AuthUser): void {
    if (!actor) {
      throw new ForbiddenError('Authentication required to modify inventory');
    }
    if (actor.role === 'USER') {
      throw new ForbiddenError('Ordinary users are not authorized to manage inventory');
    }
    if (actor.role === 'FACILITY_STAFF' && actor.facilityId !== facilityId) {
      throw new ForbiddenError(
        'Facility staff are not authorized to modify inventory for a facility they do not manage'
      );
    }
  }

  private async logAudit(
    entityType: string,
    entityId: string,
    action: string,
    details: Record<string, unknown>,
    actor?: AuthUser
  ): Promise<void> {
    if (InventoryService.isPostgres()) {
      try {
        const prisma = getPrismaClient();
        await prisma.auditLog.create({
          data: {
            entityType,
            entityId,
            actorId: actor?.id || null,
            action,
            details: details as any,
          },
        });
      } catch {
        // Suppress audit log errors in tests
      }
      return;
    }

    InventoryService.auditLogsStore.push({
      id: randomUUID(),
      entityType,
      entityId,
      actorId: actor?.id || null,
      action,
      details,
      createdAt: new Date(),
    });
  }

  private toBloodBatch(record: any): BloodInventoryBatch {
    const collectionDateStr =
      record.collectionDate instanceof Date
        ? record.collectionDate.toISOString().slice(0, 10)
        : String(record.collectionDate);
    const expiryDateStr =
      record.expiryDate instanceof Date
        ? record.expiryDate.toISOString().slice(0, 10)
        : String(record.expiryDate);

    let status: InventoryStatus = record.status;
    if (status === 'AVAILABLE' && InventoryService.isDateExpired(expiryDateStr)) {
      status = 'EXPIRED';
    }

    const availableUnits = InventoryService.computeAvailableUnits(
      record.totalUnits,
      record.reservedUnits,
      expiryDateStr,
      status
    );

    return {
      id: record.id,
      facilityId: record.facilityId,
      componentId: record.componentId,
      bloodGroup: prismaToBloodGroup[record.bloodGroup] || (record.bloodGroup as BloodGroup),
      batchNumber: record.batchNumber,
      totalUnits: record.totalUnits,
      reservedUnits: record.reservedUnits,
      availableUnits,
      collectionDate: collectionDateStr,
      expiryDate: expiryDateStr,
      storageLocation: record.storageLocation ?? null,
      status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      facilityName: record.facility?.name,
      facilityCity: record.facility?.city,
      component: record.component
        ? {
            id: record.component.id,
            code: record.component.code,
            name: record.component.name,
            defaultShelfLifeDays: record.component.defaultShelfLifeDays,
            storageTempCelsius: record.component.storageTempCelsius,
            description: record.component.description,
            createdAt: record.component.createdAt,
          }
        : undefined,
    };
  }

  private toMedicineBatch(record: any): MedicineInventoryBatch {
    const expiryDateStr =
      record.expiryDate instanceof Date
        ? record.expiryDate.toISOString().slice(0, 10)
        : String(record.expiryDate);

    let status: InventoryStatus = record.status;
    if (status === 'AVAILABLE' && InventoryService.isDateExpired(expiryDateStr)) {
      status = 'EXPIRED';
    }

    const availableUnits = InventoryService.computeAvailableUnits(
      record.totalUnits,
      record.reservedUnits,
      expiryDateStr,
      status
    );

    return {
      id: record.id,
      facilityId: record.facilityId,
      medicineId: record.medicineId,
      batchNumber: record.batchNumber,
      totalUnits: record.totalUnits,
      reservedUnits: record.reservedUnits,
      availableUnits,
      expiryDate: expiryDateStr,
      storageLocation: record.storageLocation ?? null,
      status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      facilityName: record.facility?.name,
      facilityCity: record.facility?.city,
      medicine: record.medicine
        ? {
            id: record.medicine.id,
            name: record.medicine.name,
            genericName: record.medicine.genericName,
            dosageForm: record.medicine.dosageForm,
            strength: record.medicine.strength,
            manufacturer: record.medicine.manufacturer,
            category: record.medicine.category,
            description: record.medicine.description,
            createdAt: record.medicine.createdAt,
            updatedAt: record.medicine.updatedAt,
          }
        : undefined,
    };
  }

  // ==========================================
  // 1. BLOOD COMPONENT CATALOG OPERATIONS
  // ==========================================

  public async listBloodComponents(): Promise<BloodComponent[]> {
    if (InventoryService.isPostgres()) {
      const prisma = getPrismaClient();
      const records = await prisma.bloodComponent.findMany({
        orderBy: { code: 'asc' },
      });
      return records.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        defaultShelfLifeDays: c.defaultShelfLifeDays,
        storageTempCelsius: c.storageTempCelsius,
        description: c.description,
        createdAt: c.createdAt,
      }));
    }
    return Array.from(InventoryService.bloodComponentsStore.values());
  }

  public async getBloodComponentById(id: string): Promise<BloodComponent> {
    if (InventoryService.isPostgres()) {
      const prisma = getPrismaClient();
      const comp = await prisma.bloodComponent.findUnique({
        where: { id },
      });
      if (!comp) {
        throw new NotFoundError(`Blood component with ID '${id}' not found`);
      }
      return {
        id: comp.id,
        code: comp.code,
        name: comp.name,
        defaultShelfLifeDays: comp.defaultShelfLifeDays,
        storageTempCelsius: comp.storageTempCelsius,
        description: comp.description,
        createdAt: comp.createdAt,
      };
    }
    const comp = InventoryService.bloodComponentsStore.get(id);
    if (!comp) {
      throw new NotFoundError(`Blood component with ID '${id}' not found`);
    }
    return comp;
  }

  // ==========================================
  // 2. MEDICINE MASTER CATALOG OPERATIONS (3NF)
  // ==========================================

  public async listMedicines(options: MedicineCatalogFilterOptions): Promise<{
    data: Medicine[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    if (InventoryService.isPostgres()) {
      const prisma = getPrismaClient();
      const page = options.page || 1;
      const limit = options.limit || 10;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (options.dosageForm) where.dosageForm = options.dosageForm;
      if (options.category) {
        where.category = { contains: options.category, mode: 'insensitive' };
      }
      if (options.search) {
        where.OR = [
          { name: { contains: options.search, mode: 'insensitive' } },
          { genericName: { contains: options.search, mode: 'insensitive' } },
          { strength: { contains: options.search, mode: 'insensitive' } },
        ];
      }

      const [records, total] = await Promise.all([
        prisma.medicine.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
        }),
        prisma.medicine.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit) || 1;
      return {
        data: records.map((m) => ({
          id: m.id,
          name: m.name,
          genericName: m.genericName,
          dosageForm: m.dosageForm as Medicine['dosageForm'],
          strength: m.strength,
          manufacturer: m.manufacturer,
          category: m.category,
          description: m.description,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        })),
        pagination: { total, page, limit, totalPages },
      };
    }

    let meds = Array.from(InventoryService.medicinesStore.values());

    if (options.dosageForm) {
      meds = meds.filter((m) => m.dosageForm === options.dosageForm);
    }
    if (options.category) {
      const catQuery = options.category.toLowerCase();
      meds = meds.filter((m) => m.category?.toLowerCase().includes(catQuery));
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      meds = meds.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.genericName.toLowerCase().includes(q) ||
          m.strength.toLowerCase().includes(q)
      );
    }

    const total = meds.length;
    const page = options.page || 1;
    const limit = options.limit || 10;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = meds.slice(startIndex, startIndex + limit);

    return {
      data: paginated,
      pagination: { total, page, limit, totalPages },
    };
  }

  public async getMedicineById(id: string): Promise<Medicine> {
    if (InventoryService.isPostgres()) {
      const prisma = getPrismaClient();
      const med = await prisma.medicine.findUnique({
        where: { id },
      });
      if (!med) {
        throw new NotFoundError(`Medicine with ID '${id}' not found`);
      }
      return {
        id: med.id,
        name: med.name,
        genericName: med.genericName,
        dosageForm: med.dosageForm as Medicine['dosageForm'],
        strength: med.strength,
        manufacturer: med.manufacturer,
        category: med.category,
        description: med.description,
        createdAt: med.createdAt,
        updatedAt: med.updatedAt,
      };
    }

    const med = InventoryService.medicinesStore.get(id);
    if (!med) {
      throw new NotFoundError(`Medicine with ID '${id}' not found`);
    }
    return med;
  }

  public async createMedicine(data: CreateMedicineInput, actor?: AuthUser): Promise<Medicine> {
    if (actor?.role !== 'ADMIN') {
      throw new ForbiddenError('Only administrators can add new master medicines to catalog');
    }

    if (InventoryService.isPostgres()) {
      const prisma = getPrismaClient();
      const created = await prisma.medicine.create({
        data: {
          name: data.name,
          genericName: data.genericName,
          dosageForm: data.dosageForm,
          strength: data.strength,
          manufacturer: data.manufacturer || null,
          category: data.category || null,
          description: data.description || null,
        },
      });
      await this.logAudit('MEDICINE_CATALOG', created.id, 'CREATE_MEDICINE', data as any, actor);
      return {
        id: created.id,
        name: created.name,
        genericName: created.genericName,
        dosageForm: created.dosageForm as Medicine['dosageForm'],
        strength: created.strength,
        manufacturer: created.manufacturer,
        category: created.category,
        description: created.description,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };
    }

    const now = new Date();
    const med: Medicine = {
      id: randomUUID(),
      name: data.name,
      genericName: data.genericName,
      dosageForm: data.dosageForm,
      strength: data.strength,
      manufacturer: data.manufacturer || null,
      category: data.category || null,
      description: data.description || null,
      createdAt: now,
      updatedAt: now,
    };

    InventoryService.medicinesStore.set(med.id, med);
    this.logAudit('MEDICINE_CATALOG', med.id, 'CREATE_MEDICINE', data as any, actor);
    return med;
  }

  // ==========================================
  // 3. BLOOD INVENTORY BATCH OPERATIONS
  // ==========================================

  public async createBloodBatch(
    data: CreateBloodBatchInput,
    actor?: AuthUser
  ): Promise<BloodInventoryBatch> {
    this.enforceFacilityStaffAccess(data.facilityId, actor);

    const facility = await new FacilityService().getFacilityById(data.facilityId);
    const component = await this.getBloodComponentById(data.componentId);

    if (InventoryService.isPostgres()) {
      const prisma = getPrismaClient();
      const existing = await prisma.bloodInventory.findUnique({
        where: {
          facilityId_batchNumber: {
            facilityId: data.facilityId,
            batchNumber: data.batchNumber,
          },
        },
      });
      if (existing) {
        throw new ConflictError(
          `A blood batch with identifier '${data.batchNumber}' already exists for facility '${facility.name}'`
        );
      }

      let status = data.status || 'AVAILABLE';
      if (InventoryService.isDateExpired(data.expiryDate)) {
        status = 'EXPIRED';
      }

      const created = await prisma.bloodInventory.create({
        data: {
          facilityId: data.facilityId,
          componentId: data.componentId,
          bloodGroup: (bloodGroupToPrisma[data.bloodGroup] || data.bloodGroup) as any,
          batchNumber: data.batchNumber,
          totalUnits: data.totalUnits,
          reservedUnits: data.reservedUnits || 0,
          collectionDate: new Date(data.collectionDate),
          expiryDate: new Date(data.expiryDate),
          storageLocation: data.storageLocation || null,
          status,
        },
        include: {
          facility: true,
          component: true,
        },
      });

      await this.logAudit('BLOOD_INVENTORY', created.id, 'CREATE_BATCH', { ...data, status }, actor);
      return this.toBloodBatch(created);
    }

    // Enforce composite uniqueness: UNIQUE(facility_id, batch_number)
    const existingBatches = Array.from(InventoryService.bloodInventoryStore.values());
    const isDuplicate = existingBatches.some(
      (b) => b.facilityId === data.facilityId && b.batchNumber.toLowerCase() === data.batchNumber.toLowerCase()
    );
    if (isDuplicate) {
      throw new ConflictError(
        `A blood batch with identifier '${data.batchNumber}' already exists for facility '${facility.name}'`
      );
    }

    let status = data.status || 'AVAILABLE';
    if (InventoryService.isDateExpired(data.expiryDate)) {
      status = 'EXPIRED';
    }

    const now = new Date();
    const batch: BloodInventoryBatch = {
      id: randomUUID(),
      facilityId: data.facilityId,
      componentId: data.componentId,
      bloodGroup: data.bloodGroup,
      batchNumber: data.batchNumber,
      totalUnits: data.totalUnits,
      reservedUnits: data.reservedUnits || 0,
      availableUnits: InventoryService.computeAvailableUnits(
        data.totalUnits,
        data.reservedUnits || 0,
        data.expiryDate,
        status
      ),
      collectionDate: data.collectionDate,
      expiryDate: data.expiryDate,
      storageLocation: data.storageLocation || null,
      status,
      createdAt: now,
      updatedAt: now,
      component,
      facilityName: facility.name,
      facilityCity: facility.city,
    };

    InventoryService.bloodInventoryStore.set(batch.id, batch);
    this.logAudit('BLOOD_INVENTORY', batch.id, 'CREATE_BATCH', { ...data, status }, actor);
    return batch;
  }

  public async listBloodInventory(options: BloodInventoryFilterOptions): Promise<{
    data: BloodInventoryBatch[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    if (InventoryService.isPostgres()) {
      const prisma = getPrismaClient();
      const page = options.page || 1;
      const limit = options.limit || 10;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (options.facilityId) where.facilityId = options.facilityId;
      if (options.bloodGroup) where.bloodGroup = (bloodGroupToPrisma[options.bloodGroup] || options.bloodGroup) as any;
      if (options.componentId) where.componentId = options.componentId;
      if (options.componentCode) {
        where.component = { code: { equals: options.componentCode, mode: 'insensitive' } };
      }
      if (options.status) where.status = options.status;
      if (options.excludeExpired) {
        where.expiryDate = { gt: new Date() };
      }
      if (options.availableOnly) {
        where.status = 'AVAILABLE';
        where.expiryDate = { gt: new Date() };
      }
      if (options.search) {
        where.OR = [
          { batchNumber: { contains: options.search, mode: 'insensitive' } },
          { facility: { name: { contains: options.search, mode: 'insensitive' } } },
        ];
      }

      const [records, total] = await Promise.all([
        prisma.bloodInventory.findMany({
          where,
          skip,
          take: limit,
          include: { facility: true, component: true },
          orderBy: { expiryDate: 'asc' },
        }),
        prisma.bloodInventory.count({ where }),
      ]);

      let batches = records.map((r) => this.toBloodBatch(r));
      if (options.availableOnly) {
        batches = batches.filter((b) => b.availableUnits > 0);
      }

      const totalPages = Math.ceil(total / limit) || 1;
      return {
        data: batches,
        pagination: { total, page, limit, totalPages },
      };
    }

    let batches = Array.from(InventoryService.bloodInventoryStore.values());

    for (const b of batches) {
      if (b.status === 'AVAILABLE' && InventoryService.isDateExpired(b.expiryDate)) {
        b.status = 'EXPIRED';
        b.availableUnits = 0;
      } else {
        b.availableUnits = InventoryService.computeAvailableUnits(
          b.totalUnits,
          b.reservedUnits,
          b.expiryDate,
          b.status
        );
      }
    }

    if (options.facilityId) {
      batches = batches.filter((b) => b.facilityId === options.facilityId);
    }
    if (options.bloodGroup) {
      batches = batches.filter((b) => b.bloodGroup === options.bloodGroup);
    }
    if (options.componentId) {
      batches = batches.filter((b) => b.componentId === options.componentId);
    }
    if (options.componentCode) {
      batches = batches.filter(
        (b) => b.component?.code.toUpperCase() === options.componentCode?.toUpperCase()
      );
    }
    if (options.status) {
      batches = batches.filter((b) => b.status === options.status);
    }
    if (options.excludeExpired) {
      batches = batches.filter((b) => !InventoryService.isDateExpired(b.expiryDate));
    }
    if (options.availableOnly) {
      batches = batches.filter(
        (b) =>
          b.status === 'AVAILABLE' &&
          !InventoryService.isDateExpired(b.expiryDate) &&
          b.availableUnits > 0
      );
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      batches = batches.filter(
        (b) =>
          b.batchNumber.toLowerCase().includes(q) ||
          b.bloodGroup.toLowerCase().includes(q) ||
          b.component?.name.toLowerCase().includes(q) ||
          b.facilityName?.toLowerCase().includes(q)
      );
    }

    batches.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

    const total = batches.length;
    const page = options.page || 1;
    const limit = options.limit || 10;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = batches.slice(startIndex, startIndex + limit);

    return {
      data: paginated,
      pagination: { total, page, limit, totalPages },
    };
  }

  public async getBloodBatchById(id: string): Promise<BloodInventoryBatch> {
    if (InventoryService.isPostgres()) {
      const prisma = getPrismaClient();
      const batch = await prisma.bloodInventory.findUnique({
        where: { id },
        include: { facility: true, component: true },
      });
      if (!batch) {
        throw new NotFoundError(`Blood inventory batch '${id}' not found`);
      }
      return this.toBloodBatch(batch);
    }

    const batch = InventoryService.bloodInventoryStore.get(id);
    if (!batch) {
      throw new NotFoundError(`Blood inventory batch '${id}' not found`);
    }

    if (batch.status === 'AVAILABLE' && InventoryService.isDateExpired(batch.expiryDate)) {
      batch.status = 'EXPIRED';
      batch.availableUnits = 0;
    } else {
      batch.availableUnits = InventoryService.computeAvailableUnits(
        batch.totalUnits,
        batch.reservedUnits,
        batch.expiryDate,
        batch.status
      );
    }

    return batch;
  }

  public async updateBloodStock(
    id: string,
    updates: UpdateBloodStockInput,
    actor?: AuthUser
  ): Promise<BloodInventoryBatch> {
    const batch = await this.getBloodBatchById(id);
    this.enforceFacilityStaffAccess(batch.facilityId, actor);

    let newTotal = batch.totalUnits;
    if (updates.totalUnits !== undefined) {
      newTotal = updates.totalUnits;
    } else if (updates.quantityDelta !== undefined) {
      newTotal = batch.totalUnits + updates.quantityDelta;
    }

    if (newTotal < 0) {
      throw new BadRequestError('Total units cannot be reduced below 0');
    }
    if (newTotal < batch.reservedUnits) {
      throw new BadRequestError(
        `Total units (${newTotal}) cannot be less than currently active reserved units (${batch.reservedUnits})`
      );
    }

    const newStatus = updates.status || batch.status;

    if (InventoryService.isPostgres()) {
      const prisma = getPrismaClient();
      const updated = await prisma.bloodInventory.update({
        where: { id },
        data: {
          totalUnits: newTotal,
          status: newStatus,
          storageLocation:
            updates.storageLocation !== undefined ? updates.storageLocation : batch.storageLocation,
          updatedAt: new Date(),
        },
        include: { facility: true, component: true },
      });

      await this.logAudit(
        'BLOOD_INVENTORY',
        id,
        'UPDATE_STOCK',
        {
          oldTotal: batch.totalUnits,
          newTotal,
          reservedUnits: batch.reservedUnits,
          notes: updates.notes,
        },
        actor
      );

      return this.toBloodBatch(updated);
    }

    const updated: BloodInventoryBatch = {
      ...batch,
      totalUnits: newTotal,
      status: newStatus,
      storageLocation:
        updates.storageLocation !== undefined ? updates.storageLocation : batch.storageLocation,
      availableUnits: InventoryService.computeAvailableUnits(
        newTotal,
        batch.reservedUnits,
        batch.expiryDate,
        newStatus
      ),
      updatedAt: new Date(),
    };

    InventoryService.bloodInventoryStore.set(id, updated);
    this.logAudit(
      'BLOOD_INVENTORY',
      id,
      'UPDATE_STOCK',
      {
        oldTotal: batch.totalUnits,
        newTotal,
        reservedUnits: batch.reservedUnits,
        notes: updates.notes,
      },
      actor
    );

    return updated;
  }

  // ==========================================
  // 4. MEDICINE INVENTORY BATCH OPERATIONS
  // ==========================================

  public async createMedicineBatch(
    data: CreateMedicineBatchInput,
    actor?: AuthUser
  ): Promise<MedicineInventoryBatch> {
    this.enforceFacilityStaffAccess(data.facilityId, actor);

    const facility = await new FacilityService().getFacilityById(data.facilityId);
    const medicine = await this.getMedicineById(data.medicineId);

    if (InventoryService.isPostgres()) {
      const prisma = getPrismaClient();
      const existing = await prisma.medicineInventory.findUnique({
        where: {
          facilityId_medicineId_batchNumber: {
            facilityId: data.facilityId,
            medicineId: data.medicineId,
            batchNumber: data.batchNumber,
          },
        },
      });
      if (existing) {
        throw new ConflictError(
          `Batch number '${data.batchNumber}' already exists for medicine '${medicine.name}' at this facility`
        );
      }

      let status = data.status || 'AVAILABLE';
      if (InventoryService.isDateExpired(data.expiryDate)) {
        status = 'EXPIRED';
      }

      const created = await prisma.medicineInventory.create({
        data: {
          facilityId: data.facilityId,
          medicineId: data.medicineId,
          batchNumber: data.batchNumber,
          totalUnits: data.totalUnits,
          reservedUnits: data.reservedUnits || 0,
          expiryDate: new Date(data.expiryDate),
          storageLocation: data.storageLocation || null,
          status,
        },
        include: { facility: true, medicine: true },
      });

      await this.logAudit('MEDICINE_INVENTORY', created.id, 'CREATE_BATCH', { ...data, status }, actor);
      return this.toMedicineBatch(created);
    }

    const existingBatches = Array.from(InventoryService.medicineInventoryStore.values());
    const isDuplicate = existingBatches.some(
      (b) =>
        b.facilityId === data.facilityId &&
        b.medicineId === data.medicineId &&
        b.batchNumber.toLowerCase() === data.batchNumber.toLowerCase()
    );
    if (isDuplicate) {
      throw new ConflictError(
        `Batch number '${data.batchNumber}' already exists for medicine '${medicine.name}' at this facility`
      );
    }

    let status = data.status || 'AVAILABLE';
    if (InventoryService.isDateExpired(data.expiryDate)) {
      status = 'EXPIRED';
    }

    const now = new Date();
    const batch: MedicineInventoryBatch = {
      id: randomUUID(),
      facilityId: data.facilityId,
      medicineId: data.medicineId,
      batchNumber: data.batchNumber,
      totalUnits: data.totalUnits,
      reservedUnits: data.reservedUnits || 0,
      availableUnits: InventoryService.computeAvailableUnits(
        data.totalUnits,
        data.reservedUnits || 0,
        data.expiryDate,
        status
      ),
      expiryDate: data.expiryDate,
      storageLocation: data.storageLocation || null,
      status,
      createdAt: now,
      updatedAt: now,
      medicine,
      facilityName: facility.name,
      facilityCity: facility.city,
    };

    InventoryService.medicineInventoryStore.set(batch.id, batch);
    this.logAudit('MEDICINE_INVENTORY', batch.id, 'CREATE_BATCH', { ...data, status }, actor);
    return batch;
  }

  public async listMedicineInventory(options: MedicineInventoryFilterOptions): Promise<{
    data: MedicineInventoryBatch[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    if (InventoryService.isPostgres()) {
      const prisma = getPrismaClient();
      const page = options.page || 1;
      const limit = options.limit || 10;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (options.facilityId) where.facilityId = options.facilityId;
      if (options.medicineId) where.medicineId = options.medicineId;
      if (options.dosageForm) {
        where.medicine = { dosageForm: options.dosageForm };
      }
      if (options.status) where.status = options.status;
      if (options.excludeExpired) {
        where.expiryDate = { gt: new Date() };
      }
      if (options.availableOnly) {
        where.status = 'AVAILABLE';
        where.expiryDate = { gt: new Date() };
      }
      if (options.search) {
        where.OR = [
          { batchNumber: { contains: options.search, mode: 'insensitive' } },
          { medicine: { name: { contains: options.search, mode: 'insensitive' } } },
          { medicine: { genericName: { contains: options.search, mode: 'insensitive' } } },
          { facility: { name: { contains: options.search, mode: 'insensitive' } } },
        ];
      }

      const [records, total] = await Promise.all([
        prisma.medicineInventory.findMany({
          where,
          skip,
          take: limit,
          include: { facility: true, medicine: true },
          orderBy: { expiryDate: 'asc' },
        }),
        prisma.medicineInventory.count({ where }),
      ]);

      let batches = records.map((r) => this.toMedicineBatch(r));
      if (options.availableOnly) {
        batches = batches.filter((b) => b.availableUnits > 0);
      }

      const totalPages = Math.ceil(total / limit) || 1;
      return {
        data: batches,
        pagination: { total, page, limit, totalPages },
      };
    }

    let batches = Array.from(InventoryService.medicineInventoryStore.values());

    for (const b of batches) {
      if (b.status === 'AVAILABLE' && InventoryService.isDateExpired(b.expiryDate)) {
        b.status = 'EXPIRED';
        b.availableUnits = 0;
      } else {
        b.availableUnits = InventoryService.computeAvailableUnits(
          b.totalUnits,
          b.reservedUnits,
          b.expiryDate,
          b.status
        );
      }
    }

    if (options.facilityId) {
      batches = batches.filter((b) => b.facilityId === options.facilityId);
    }
    if (options.medicineId) {
      batches = batches.filter((b) => b.medicineId === options.medicineId);
    }
    if (options.dosageForm) {
      batches = batches.filter((b) => b.medicine?.dosageForm === options.dosageForm);
    }
    if (options.status) {
      batches = batches.filter((b) => b.status === options.status);
    }
    if (options.excludeExpired) {
      batches = batches.filter((b) => !InventoryService.isDateExpired(b.expiryDate));
    }
    if (options.availableOnly) {
      batches = batches.filter(
        (b) =>
          b.status === 'AVAILABLE' &&
          !InventoryService.isDateExpired(b.expiryDate) &&
          b.availableUnits > 0
      );
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      batches = batches.filter(
        (b) =>
          b.batchNumber.toLowerCase().includes(q) ||
          b.medicine?.name.toLowerCase().includes(q) ||
          b.medicine?.genericName.toLowerCase().includes(q) ||
          b.facilityName?.toLowerCase().includes(q)
      );
    }

    batches.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

    const total = batches.length;
    const page = options.page || 1;
    const limit = options.limit || 10;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = batches.slice(startIndex, startIndex + limit);

    return {
      data: paginated,
      pagination: { total, page, limit, totalPages },
    };
  }

  public async getMedicineBatchById(id: string): Promise<MedicineInventoryBatch> {
    if (InventoryService.isPostgres()) {
      const prisma = getPrismaClient();
      const batch = await prisma.medicineInventory.findUnique({
        where: { id },
        include: { facility: true, medicine: true },
      });
      if (!batch) {
        throw new NotFoundError(`Medicine inventory batch '${id}' not found`);
      }
      return this.toMedicineBatch(batch);
    }

    const batch = InventoryService.medicineInventoryStore.get(id);
    if (!batch) {
      throw new NotFoundError(`Medicine inventory batch '${id}' not found`);
    }

    if (batch.status === 'AVAILABLE' && InventoryService.isDateExpired(batch.expiryDate)) {
      batch.status = 'EXPIRED';
      batch.availableUnits = 0;
    } else {
      batch.availableUnits = InventoryService.computeAvailableUnits(
        batch.totalUnits,
        batch.reservedUnits,
        batch.expiryDate,
        batch.status
      );
    }

    return batch;
  }

  public async updateMedicineStock(
    id: string,
    updates: UpdateMedicineStockInput,
    actor?: AuthUser
  ): Promise<MedicineInventoryBatch> {
    const batch = await this.getMedicineBatchById(id);
    this.enforceFacilityStaffAccess(batch.facilityId, actor);

    let newTotal = batch.totalUnits;
    if (updates.totalUnits !== undefined) {
      newTotal = updates.totalUnits;
    } else if (updates.quantityDelta !== undefined) {
      newTotal = batch.totalUnits + updates.quantityDelta;
    }

    if (newTotal < 0) {
      throw new BadRequestError('Total units cannot be reduced below 0');
    }
    if (newTotal < batch.reservedUnits) {
      throw new BadRequestError(
        `Total units (${newTotal}) cannot be less than currently active reserved units (${batch.reservedUnits})`
      );
    }

    const newStatus = updates.status || batch.status;

    if (InventoryService.isPostgres()) {
      const prisma = getPrismaClient();
      const updated = await prisma.medicineInventory.update({
        where: { id },
        data: {
          totalUnits: newTotal,
          status: newStatus,
          storageLocation:
            updates.storageLocation !== undefined ? updates.storageLocation : batch.storageLocation,
          updatedAt: new Date(),
        },
        include: { facility: true, medicine: true },
      });

      await this.logAudit(
        'MEDICINE_INVENTORY',
        id,
        'UPDATE_STOCK',
        {
          oldTotal: batch.totalUnits,
          newTotal,
          reservedUnits: batch.reservedUnits,
          notes: updates.notes,
        },
        actor
      );

      return this.toMedicineBatch(updated);
    }

    const updated: MedicineInventoryBatch = {
      ...batch,
      totalUnits: newTotal,
      status: newStatus,
      storageLocation:
        updates.storageLocation !== undefined ? updates.storageLocation : batch.storageLocation,
      availableUnits: InventoryService.computeAvailableUnits(
        newTotal,
        batch.reservedUnits,
        batch.expiryDate,
        newStatus
      ),
      updatedAt: new Date(),
    };

    InventoryService.medicineInventoryStore.set(id, updated);
    this.logAudit(
      'MEDICINE_INVENTORY',
      id,
      'UPDATE_STOCK',
      {
        oldTotal: batch.totalUnits,
        newTotal,
        reservedUnits: batch.reservedUnits,
        notes: updates.notes,
      },
      actor
    );

    return updated;
  }

  // ==========================================
  // 5. ATOMIC RESERVATION SAFETY CONTRACT (ACID)
  // ==========================================

  public async reserveBloodStock(
    batchId: string,
    quantity: number,
    requestItemId: string,
    holdDurationMinutes = 120,
    actor?: AuthUser
  ): Promise<ReservationRecord> {
    if (InventoryService.isPostgres()) {
      const prisma = getPrismaClient();
      return await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<Array<{
          id: string;
          totalUnits: number;
          reservedUnits: number;
          expiryDate: Date;
          status: string;
          batchNumber: string;
        }>>`SELECT id, total_units as "totalUnits", reserved_units as "reservedUnits", expiry_date as "expiryDate", status, batch_number as "batchNumber" FROM blood_inventory WHERE id = ${batchId}::uuid FOR UPDATE`;
        const batch = rows[0];
        if (!batch) {
          throw new NotFoundError(`Blood batch '${batchId}' was not found`);
        }

        const expiryStr = batch.expiryDate.toISOString().slice(0, 10);
        if (InventoryService.isDateExpired(expiryStr)) {
          throw new BadRequestError('Cannot reserve stock from an expired blood batch');
        }
        if (batch.status !== 'AVAILABLE') {
          throw new BadRequestError(`Cannot reserve blood batch in status '${batch.status}'`);
        }

        const currentAvailable = batch.totalUnits - batch.reservedUnits;
        if (currentAvailable < quantity) {
          throw new BadRequestError(
            `Insufficient available stock for batch '${batch.batchNumber}'. Requested: ${quantity}, Available: ${currentAvailable}`
          );
        }

        await tx.bloodInventory.update({
          where: { id: batchId },
          data: {
            reservedUnits: { increment: quantity },
            updatedAt: new Date(),
          },
        });

        const now = new Date();
        const expiresAt = new Date(now.getTime() + holdDurationMinutes * 60 * 1000);

        await tx.auditLog.create({
          data: {
            entityType: 'INVENTORY_RESERVATION',
            entityId: batchId,
            actorId: actor?.id || null,
            action: 'RESERVE_BLOOD_STOCK',
            details: { batchId, quantity, requestItemId, expiresAt },
          },
        });

        return {
          id: randomUUID(),
          requestItemId,
          inventoryType: 'BLOOD',
          batchId,
          reservedQuantity: quantity,
          status: 'ACTIVE',
          expiresAt,
          createdAt: now,
          releasedAt: null,
        };
      });
    }

    const batch = await this.getBloodBatchById(batchId);

    if (InventoryService.isDateExpired(batch.expiryDate)) {
      throw new BadRequestError('Cannot reserve stock from an expired blood batch');
    }
    if (batch.status !== 'AVAILABLE') {
      throw new BadRequestError(`Cannot reserve blood batch in status '${batch.status}'`);
    }

    const currentAvailable = batch.totalUnits - batch.reservedUnits;
    if (currentAvailable < quantity) {
      throw new BadRequestError(
        `Insufficient available stock for batch '${batch.batchNumber}'. Requested: ${quantity}, Available: ${currentAvailable}`
      );
    }

    batch.reservedUnits += quantity;
    batch.availableUnits = Math.max(0, batch.totalUnits - batch.reservedUnits);
    batch.updatedAt = new Date();
    InventoryService.bloodInventoryStore.set(batchId, batch);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + holdDurationMinutes * 60 * 1000);
    const reservation: ReservationRecord = {
      id: randomUUID(),
      requestItemId,
      inventoryType: 'BLOOD',
      batchId,
      reservedQuantity: quantity,
      status: 'ACTIVE',
      expiresAt,
      createdAt: now,
      releasedAt: null,
    };

    InventoryService.reservationsStore.set(reservation.id, reservation);
    this.logAudit(
      'INVENTORY_RESERVATION',
      reservation.id,
      'RESERVE_BLOOD_STOCK',
      { batchId, quantity, requestItemId, expiresAt },
      actor
    );

    return reservation;
  }

  public async releaseBloodStock(
    batchId: string,
    quantity: number,
    requestItemId: string,
    actor?: AuthUser
  ): Promise<void> {
    if (InventoryService.isPostgres()) {
      const prisma = getPrismaClient();
      await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<Array<{ id: string; reservedUnits: number }>>`SELECT id, reserved_units as "reservedUnits" FROM blood_inventory WHERE id = ${batchId}::uuid FOR UPDATE`;
        const batch = rows[0];
        if (!batch) throw new NotFoundError(`Blood batch '${batchId}' was not found`);

        const newReserved = Math.max(0, batch.reservedUnits - quantity);
        await tx.bloodInventory.update({
          where: { id: batchId },
          data: {
            reservedUnits: newReserved,
            updatedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            entityType: 'INVENTORY_RESERVATION',
            entityId: batchId,
            actorId: actor?.id || null,
            action: 'RELEASE_BLOOD_STOCK',
            details: { quantity, requestItemId },
          },
        });
      });
      return;
    }

    const batch = await this.getBloodBatchById(batchId);

    batch.reservedUnits = Math.max(0, batch.reservedUnits - quantity);
    batch.availableUnits = InventoryService.computeAvailableUnits(
      batch.totalUnits,
      batch.reservedUnits,
      batch.expiryDate,
      batch.status
    );
    batch.updatedAt = new Date();
    InventoryService.bloodInventoryStore.set(batchId, batch);

    for (const res of InventoryService.reservationsStore.values()) {
      if (res.batchId === batchId && res.requestItemId === requestItemId && res.status === 'ACTIVE') {
        res.status = 'RELEASED';
        res.releasedAt = new Date();
      }
    }

    this.logAudit(
      'INVENTORY_RESERVATION',
      batchId,
      'RELEASE_BLOOD_STOCK',
      { quantity, requestItemId },
      actor
    );
  }

  public async reserveMedicineStock(
    batchId: string,
    quantity: number,
    requestItemId: string,
    holdDurationMinutes = 120,
    actor?: AuthUser
  ): Promise<ReservationRecord> {
    if (InventoryService.isPostgres()) {
      const prisma = getPrismaClient();
      return await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<Array<{
          id: string;
          totalUnits: number;
          reservedUnits: number;
          expiryDate: Date;
          status: string;
          batchNumber: string;
        }>>`SELECT id, total_units as "totalUnits", reserved_units as "reservedUnits", expiry_date as "expiryDate", status, batch_number as "batchNumber" FROM medicine_inventory WHERE id = ${batchId}::uuid FOR UPDATE`;
        const batch = rows[0];
        if (!batch) {
          throw new NotFoundError(`Medicine batch '${batchId}' was not found`);
        }

        const expiryStr = batch.expiryDate.toISOString().slice(0, 10);
        if (InventoryService.isDateExpired(expiryStr)) {
          throw new BadRequestError('Cannot reserve stock from an expired medicine batch');
        }
        if (batch.status !== 'AVAILABLE') {
          throw new BadRequestError(`Cannot reserve medicine batch in status '${batch.status}'`);
        }

        const currentAvailable = batch.totalUnits - batch.reservedUnits;
        if (currentAvailable < quantity) {
          throw new BadRequestError(
            `Insufficient available stock for medicine batch '${batch.batchNumber}'. Requested: ${quantity}, Available: ${currentAvailable}`
          );
        }

        await tx.medicineInventory.update({
          where: { id: batchId },
          data: {
            reservedUnits: { increment: quantity },
            updatedAt: new Date(),
          },
        });

        const now = new Date();
        const expiresAt = new Date(now.getTime() + holdDurationMinutes * 60 * 1000);

        await tx.auditLog.create({
          data: {
            entityType: 'INVENTORY_RESERVATION',
            entityId: batchId,
            actorId: actor?.id || null,
            action: 'RESERVE_MEDICINE_STOCK',
            details: { batchId, quantity, requestItemId, expiresAt },
          },
        });

        return {
          id: randomUUID(),
          requestItemId,
          inventoryType: 'MEDICINE',
          batchId,
          reservedQuantity: quantity,
          status: 'ACTIVE',
          expiresAt,
          createdAt: now,
          releasedAt: null,
        };
      });
    }

    const batch = await this.getMedicineBatchById(batchId);

    if (InventoryService.isDateExpired(batch.expiryDate)) {
      throw new BadRequestError('Cannot reserve stock from an expired medicine batch');
    }
    if (batch.status !== 'AVAILABLE') {
      throw new BadRequestError(`Cannot reserve medicine batch in status '${batch.status}'`);
    }

    const currentAvailable = batch.totalUnits - batch.reservedUnits;
    if (currentAvailable < quantity) {
      throw new BadRequestError(
        `Insufficient available stock for medicine batch '${batch.batchNumber}'. Requested: ${quantity}, Available: ${currentAvailable}`
      );
    }

    batch.reservedUnits += quantity;
    batch.availableUnits = Math.max(0, batch.totalUnits - batch.reservedUnits);
    batch.updatedAt = new Date();
    InventoryService.medicineInventoryStore.set(batchId, batch);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + holdDurationMinutes * 60 * 1000);
    const reservation: ReservationRecord = {
      id: randomUUID(),
      requestItemId,
      inventoryType: 'MEDICINE',
      batchId,
      reservedQuantity: quantity,
      status: 'ACTIVE',
      expiresAt,
      createdAt: now,
      releasedAt: null,
    };

    InventoryService.reservationsStore.set(reservation.id, reservation);
    this.logAudit(
      'INVENTORY_RESERVATION',
      reservation.id,
      'RESERVE_MEDICINE_STOCK',
      { batchId, quantity, requestItemId, expiresAt },
      actor
    );

    return reservation;
  }

  public async releaseMedicineStock(
    batchId: string,
    quantity: number,
    requestItemId: string,
    actor?: AuthUser
  ): Promise<void> {
    if (InventoryService.isPostgres()) {
      const prisma = getPrismaClient();
      await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<Array<{ id: string; reservedUnits: number }>>`SELECT id, reserved_units as "reservedUnits" FROM medicine_inventory WHERE id = ${batchId}::uuid FOR UPDATE`;
        const batch = rows[0];
        if (!batch) throw new NotFoundError(`Medicine batch '${batchId}' was not found`);

        const newReserved = Math.max(0, batch.reservedUnits - quantity);
        await tx.medicineInventory.update({
          where: { id: batchId },
          data: {
            reservedUnits: newReserved,
            updatedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            entityType: 'INVENTORY_RESERVATION',
            entityId: batchId,
            actorId: actor?.id || null,
            action: 'RELEASE_MEDICINE_STOCK',
            details: { quantity, requestItemId },
          },
        });
      });
      return;
    }

    const batch = await this.getMedicineBatchById(batchId);

    batch.reservedUnits = Math.max(0, batch.reservedUnits - quantity);
    batch.availableUnits = InventoryService.computeAvailableUnits(
      batch.totalUnits,
      batch.reservedUnits,
      batch.expiryDate,
      batch.status
    );
    batch.updatedAt = new Date();
    InventoryService.medicineInventoryStore.set(batchId, batch);

    for (const res of InventoryService.reservationsStore.values()) {
      if (res.batchId === batchId && res.requestItemId === requestItemId && res.status === 'ACTIVE') {
        res.status = 'RELEASED';
        res.releasedAt = new Date();
      }
    }

    this.logAudit(
      'INVENTORY_RESERVATION',
      batchId,
      'RELEASE_MEDICINE_STOCK',
      { quantity, requestItemId },
      actor
    );
  }
}

export const inventoryService = new InventoryService();
