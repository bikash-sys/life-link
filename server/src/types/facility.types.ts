export type FacilityType = 'HOSPITAL' | 'BLOOD_BANK' | 'PHARMACY';

export interface OperatingHours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
  open24x7?: boolean;
  notes?: string;
  [key: string]: unknown;
}

export interface Facility {
  id: string;
  name: string;
  facilityType: FacilityType;
  address: string;
  city: string;
  state: string;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  contactPhone: string;
  contactEmail?: string | null;
  operatingHours?: OperatingHours | null;
  isVerified: boolean;
  managerUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FacilityFilterOptions {
  city?: string;
  state?: string;
  facilityType?: FacilityType;
  isVerified?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
