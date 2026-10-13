import { z } from 'zod';

export const facilityTypeEnum = z.enum(['HOSPITAL', 'BLOOD_BANK', 'PHARMACY']);

export const createFacilitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Facility name must be at least 2 characters')
    .max(200, 'Facility name cannot exceed 200 characters'),
  facilityType: facilityTypeEnum,
  address: z
    .string()
    .trim()
    .min(3, 'Address must be at least 3 characters')
    .max(300, 'Address cannot exceed 300 characters'),
  city: z
    .string()
    .trim()
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City cannot exceed 100 characters'),
  state: z
    .string()
    .trim()
    .min(2, 'State must be at least 2 characters')
    .max(100, 'State cannot exceed 100 characters'),
  postalCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9\s-]{3,20}$/, 'Invalid postal code format')
    .optional()
    .nullable(),
  latitude: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional()
    .nullable(),
  longitude: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional()
    .nullable(),
  contactPhone: z
    .string()
    .trim()
    .min(7, 'Contact phone must be at least 7 characters')
    .max(25, 'Contact phone cannot exceed 25 characters'),
  contactEmail: z
    .string()
    .trim()
    .email('Invalid email address format')
    .optional()
    .nullable(),
  operatingHours: z
    .record(z.string(), z.unknown())
    .optional()
    .nullable(),
  isVerified: z.boolean().optional(),
  managerUserId: z.string().uuid('Manager user ID must be a valid UUID').optional().nullable(),
});

export const updateFacilitySchema = createFacilitySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update',
  });

export const facilityQuerySchema = z.object({
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  facilityType: facilityTypeEnum.optional(),
  isVerified: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
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

export const facilityIdParamSchema = z.object({
  id: z.string().uuid('Facility ID must be a valid UUID'),
});

export type CreateFacilityInput = z.infer<typeof createFacilitySchema>;
export type UpdateFacilityInput = z.infer<typeof updateFacilitySchema>;
export type FacilityQueryInput = z.infer<typeof facilityQuerySchema>;
