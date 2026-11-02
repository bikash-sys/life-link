export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type InventoryHealthStatus = 'Healthy' | 'Low' | 'Critical';

export type MedicineStatus = 'Available' | 'Low' | 'Critical' | 'Out of Stock';

export interface BloodGroupSummary {
  bloodGroup: BloodGroup;
  units: number;
  status: InventoryHealthStatus;
  trend?: string;
  minThreshold: number;
}

export interface MedicineItem {
  id: string;
  name: string;
  category: string;
  dosageForm: string;
  availableQuantity: number;
  unit: string;
  expiry: string; // e.g. "Dec 2027"
  status: MedicineStatus;
  facility: string;
}

export interface RecentActivityItem {
  id: string;
  title: string;
  timestamp: string;
  type: 'blood' | 'medicine' | 'donation' | 'alert' | 'transfer';
  detail?: string;
}

export interface DashboardStat {
  id: string;
  label: string;
  value: string;
  subtext: string;
  badgeText: string;
  badgeType: 'neutral' | 'warning' | 'critical' | 'success';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'FACILITY_ADMIN' | 'PHARMACIST' | 'VOLUNTEER';
  facilityName: string;
  facilityCity: string;
}

