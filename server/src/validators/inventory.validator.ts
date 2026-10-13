import { z } from 'zod';

export const bloodGroupEnum = z.enum([
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
]);

export const inventoryStatusEnum = z.enum([
  'AVAILABLE',
  'RESERVED',
  'EXPIRED',
  'QUARANTINED',
]);

export const dosageFormEnum = z.enum([
  'TABLET',
  'CAPSULE',
  'INJECTION',
  'SYRUP',
  'VIAL',
  'IV_INFUSION',
]);

// Date regex: YYYY-MM-DD
const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

// Blood Component Schema
export const createBloodComponentSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Component code must be at least 2 characters')
    .max(50, 'Component code cannot exceed 50 characters')
    .toUpperCase(),
  name: z
    .string()
    .trim()
    .min(2, 'Component name must be at least 2 characters')
    .max(100, 'Component name cannot exceed 100 characters'),
  defaultShelfLifeDays: z
    .number()
    .int('Shelf life must be an integer')
    .positive('Shelf life must be positive'),
  storageTempCelsius: z.string().trim().min(2).max(50),
  description: z.string().trim().optional().nullable(),
});

// Blood Inventory Batch Creation Schema
export const createBloodBatchSchema = z
  .object({
    facilityId: z.string().uuid('Facility ID must be a valid UUID'),
    componentId: z.string().uuid('Component ID must be a valid UUID'),
    bloodGroup: bloodGroupEnum,
    batchNumber: z
      .string()
      .trim()
      .min(2, 'Batch identifier must be at least 2 characters')
      .max(100, 'Batch identifier cannot exceed 100 characters'),
    totalUnits: z
      .number({ message: 'totalUnits must be a valid number' })
      .int('Total units must be an integer')
      .positive('Initial total units must be at least 1 unit'),
    reservedUnits: z
      .number()
      .int('Reserved units must be an integer')
      .min(0, 'Reserved units cannot be negative')
      .default(0),
    collectionDate: z
      .string()
      .regex(isoDateRegex, 'Collection date must follow YYYY-MM-DD format'),
    expiryDate: z
      .string()
      .regex(isoDateRegex, 'Expiry date must follow YYYY-MM-DD format'),
    storageLocation: z.string().trim().optional().nullable(),
    status: inventoryStatusEnum.optional().default('AVAILABLE'),
  })
  .refine((data) => data.expiryDate > data.collectionDate, {
    message: 'Expiry date must be strictly after collection date',
    path: ['expiryDate'],
  })
  .refine((data) => data.reservedUnits <= data.totalUnits, {
    message: 'Reserved units cannot exceed total units',
    path: ['reservedUnits'],
  });

// Safe Stock Adjustment Schema
export const updateBloodStockSchema = z
  .object({
    totalUnits: z
      .number()
      .int('Total units must be an integer')
      .min(0, 'Total units cannot be negative')
      .optional(),
    quantityDelta: z
      .number()
      .int('Quantity adjustment delta must be an integer')
      .optional(),
    status: inventoryStatusEnum.optional(),
    storageLocation: z.string().trim().optional().nullable(),
    notes: z.string().trim().optional(),
  })
  .refine(
    (data) =>
      data.totalUnits !== undefined ||
      data.quantityDelta !== undefined ||
      data.status !== undefined ||
      data.storageLocation !== undefined,
    { message: 'At least one field must be provided to update stock' }
  );

// Medicine Master Catalog Schema
export const createMedicineSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Medicine trade name must be at least 2 characters')
    .max(200, 'Medicine trade name cannot exceed 200 characters'),
  genericName: z
    .string()
    .trim()
    .min(2, 'Generic international nonproprietary name must be at least 2 characters')
    .max(200, 'Generic name cannot exceed 200 characters'),
  dosageForm: dosageFormEnum,
  strength: z
    .string()
    .trim()
    .min(1, 'Strength/concentration is required')
    .max(100, 'Strength cannot exceed 100 characters'),
  manufacturer: z.string().trim().optional().nullable(),
  category: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
});

export const updateMedicineSchema = createMedicineSchema.partial();

// Medicine Inventory Batch Creation Schema
export const createMedicineBatchSchema = z
  .object({
    facilityId: z.string().uuid('Facility ID must be a valid UUID'),
    medicineId: z.string().uuid('Medicine ID must be a valid UUID'),
    batchNumber: z
      .string()
      .trim()
      .min(2, 'Batch number must be at least 2 characters')
      .max(100, 'Batch number cannot exceed 100 characters'),
    totalUnits: z
      .number({ message: 'totalUnits must be a valid number' })
      .int('Total units must be an integer')
      .positive('Initial total units must be at least 1 unit'),
    reservedUnits: z
      .number()
      .int('Reserved units must be an integer')
      .min(0, 'Reserved units cannot be negative')
      .default(0),
    expiryDate: z
      .string()
      .regex(isoDateRegex, 'Expiry date must follow YYYY-MM-DD format'),
    storageLocation: z.string().trim().optional().nullable(),
    status: inventoryStatusEnum.optional().default('AVAILABLE'),
  })
  .refine((data) => data.reservedUnits <= data.totalUnits, {
    message: 'Reserved units cannot exceed total units',
    path: ['reservedUnits'],
  });

// Safe Medicine Stock Adjustment Schema
export const updateMedicineStockSchema = z
  .object({
    totalUnits: z
      .number()
      .int('Total units must be an integer')
      .min(0, 'Total units cannot be negative')
      .optional(),
    quantityDelta: z
      .number()
      .int('Quantity adjustment delta must be an integer')
      .optional(),
    status: inventoryStatusEnum.optional(),
    storageLocation: z.string().trim().optional().nullable(),
    notes: z.string().trim().optional(),
  })
  .refine(
    (data) =>
      data.totalUnits !== undefined ||
      data.quantityDelta !== undefined ||
      data.status !== undefined ||
      data.storageLocation !== undefined,
    { message: 'At least one field must be provided to update stock' }
  );

// Query Schemas
export const bloodInventoryQuerySchema = z.object({
  facilityId: z.string().uuid().optional(),
  bloodGroup: bloodGroupEnum.optional(),
  componentId: z.string().uuid().optional(),
  componentCode: z.string().trim().optional(),
  status: inventoryStatusEnum.optional(),
  availableOnly: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => val === true || val === 'true'),
  excludeExpired: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => val === true || val === 'true'),
  search: z.string().trim().optional(),
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => Math.max(1, parseInt(val, 10) || 1)),
  limit: z
    .string()
    .optional()
    .default('10')
    .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 10))),
});

export const medicineInventoryQuerySchema = z.object({
  facilityId: z.string().uuid().optional(),
  medicineId: z.string().uuid().optional(),
  dosageForm: dosageFormEnum.optional(),
  status: inventoryStatusEnum.optional(),
  availableOnly: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => val === true || val === 'true'),
  excludeExpired: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => val === true || val === 'true'),
  search: z.string().trim().optional(),
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => Math.max(1, parseInt(val, 10) || 1)),
  limit: z
    .string()
    .optional()
    .default('10')
    .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 10))),
});

export const medicineCatalogQuerySchema = z.object({
  search: z.string().trim().optional(),
  dosageForm: dosageFormEnum.optional(),
  category: z.string().trim().optional(),
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => Math.max(1, parseInt(val, 10) || 1)),
  limit: z
    .string()
    .optional()
    .default('10')
    .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 10))),
});

// Reservation Request Schemas
export const reserveStockSchema = z.object({
  quantity: z
    .number({ message: 'quantity must be a valid number' })
    .int('Quantity must be an integer')
    .positive('Reservation quantity must be at least 1 unit'),
  requestItemId: z.string().uuid('requestItemId must be a valid UUID'),
  holdDurationMinutes: z.number().int().min(5).max(1440).default(120),
});

export const releaseStockSchema = z.object({
  quantity: z
    .number({ message: 'quantity must be a valid number' })
    .int('Quantity must be an integer')
    .positive('Release quantity must be at least 1 unit'),
  requestItemId: z.string().uuid('requestItemId must be a valid UUID'),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Resource ID must be a valid UUID'),
});

export type CreateBloodBatchInput = z.infer<typeof createBloodBatchSchema>;
export type UpdateBloodStockInput = z.infer<typeof updateBloodStockSchema>;
export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;
export type CreateMedicineBatchInput = z.infer<typeof createMedicineBatchSchema>;
export type UpdateMedicineStockInput = z.infer<typeof updateMedicineStockSchema>;
export type ReserveStockInput = z.infer<typeof reserveStockSchema>;
export type ReleaseStockInput = z.infer<typeof releaseStockSchema>;
