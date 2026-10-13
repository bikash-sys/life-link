export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type InventoryStatus = 'AVAILABLE' | 'RESERVED' | 'EXPIRED' | 'QUARANTINED';

export type DosageForm =
  | 'TABLET'
  | 'CAPSULE'
  | 'INJECTION'
  | 'SYRUP'
  | 'VIAL'
  | 'IV_INFUSION';

export interface BloodComponent {
  id: string;
  code: string;
  name: string;
  defaultShelfLifeDays: number;
  storageTempCelsius: string;
  description?: string | null;
  createdAt: Date;
}

export interface BloodInventoryBatch {
  id: string;
  facilityId: string;
  componentId: string;
  bloodGroup: BloodGroup;
  batchNumber: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
  collectionDate: string; // ISO date string YYYY-MM-DD
  expiryDate: string;     // ISO date string YYYY-MM-DD
  storageLocation?: string | null;
  status: InventoryStatus;
  createdAt: Date;
  updatedAt: Date;
  component?: BloodComponent;
  facilityName?: string;
  facilityCity?: string;
}

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  dosageForm: DosageForm;
  strength: string;
  manufacturer?: string | null;
  category?: string | null;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicineInventoryBatch {
  id: string;
  facilityId: string;
  medicineId: string;
  batchNumber: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
  expiryDate: string; // ISO date string YYYY-MM-DD
  storageLocation?: string | null;
  status: InventoryStatus;
  createdAt: Date;
  updatedAt: Date;
  medicine?: Medicine;
  facilityName?: string;
  facilityCity?: string;
}

export interface BloodInventoryFilterOptions {
  facilityId?: string;
  bloodGroup?: BloodGroup;
  componentId?: string;
  componentCode?: string;
  status?: InventoryStatus;
  availableOnly?: boolean;
  excludeExpired?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface MedicineInventoryFilterOptions {
  facilityId?: string;
  medicineId?: string;
  dosageForm?: DosageForm;
  search?: string;
  status?: InventoryStatus;
  availableOnly?: boolean;
  excludeExpired?: boolean;
  page?: number;
  limit?: number;
}

export interface MedicineCatalogFilterOptions {
  search?: string;
  dosageForm?: DosageForm;
  category?: string;
  page?: number;
  limit?: number;
}

export interface ReservationRecord {
  id: string;
  requestItemId: string;
  inventoryType: 'BLOOD' | 'MEDICINE';
  batchId: string;
  reservedQuantity: number;
  status: 'ACTIVE' | 'CONFIRMED' | 'RELEASED' | 'EXPIRED';
  expiresAt: Date;
  createdAt: Date;
  releasedAt?: Date | null;
}
