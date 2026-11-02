import {
  BloodGroupSummary,
  MedicineItem,
  RecentActivityItem,
  DashboardStat,
  UserProfile,
} from '../types';

/**
 * ============================================================================
 * LIFELINK TEMPORARY MOCK DATA
 * ============================================================================
 * NOTE: The values below are mock fixtures for frontend UI foundation development.
 * In subsequent stages, these will be replaced with real backend API responses
 * connected to PostgreSQL via the Express server endpoints:
 *   - /api/inventory/blood
 *   - /api/inventory/medicine
 *   - /api/facilities
 * ============================================================================
 */

export const MOCK_USER: UserProfile = {
  id: 'usr_mock_001',
  name: 'Dr. Sarah Jenkins',
  email: 's.jenkins@citycentral.org',
  role: 'FACILITY_ADMIN',
  facilityName: 'City Central Blood Bank & Hospital',
  facilityCity: 'Metropolis',
};

export const MOCK_DASHBOARD_STATS: DashboardStat[] = [
  {
    id: 'total-blood-units',
    label: 'Total Blood Units',
    value: '1,284 Units',
    subtext: 'Across 8 standard blood groups',
    badgeText: 'Optimal Aggregate',
    badgeType: 'success',
  },
  {
    id: 'critical-blood-groups',
    label: 'Critical Blood Groups',
    value: '3 Groups',
    subtext: 'O-, AB-, and B- below safe reserve',
    badgeText: 'Immediate Attention',
    badgeType: 'critical',
  },
  {
    id: 'medicines-available',
    label: 'Medicines Available',
    value: '486 Items',
    subtext: 'Covering 18 therapeutic categories',
    badgeText: 'Stable Supply',
    badgeType: 'neutral',
  },
  {
    id: 'active-requests',
    label: 'Active Requests',
    value: '27 Requests',
    subtext: '6 marked as emergency priority',
    badgeText: 'Pending Dispatch',
    badgeType: 'warning',
  },
];

export const MOCK_BLOOD_INVENTORY: BloodGroupSummary[] = [
  { bloodGroup: 'A+', units: 182, status: 'Healthy', minThreshold: 60 },
  { bloodGroup: 'A-', units: 45, status: 'Low', minThreshold: 50 },
  { bloodGroup: 'B+', units: 164, status: 'Healthy', minThreshold: 60 },
  { bloodGroup: 'B-', units: 38, status: 'Low', minThreshold: 45 },
  { bloodGroup: 'AB+', units: 95, status: 'Healthy', minThreshold: 40 },
  { bloodGroup: 'AB-', units: 18, status: 'Critical', minThreshold: 30 },
  { bloodGroup: 'O+', units: 210, status: 'Healthy', minThreshold: 80 },
  { bloodGroup: 'O-', units: 21, status: 'Critical', minThreshold: 60 },
];

export const MOCK_MEDICINE_INVENTORY: MedicineItem[] = [
  {
    id: 'med_001',
    name: 'Paracetamol',
    category: 'Analgesic',
    dosageForm: '500mg Tablet',
    availableQuantity: 850,
    unit: 'strips',
    expiry: 'Dec 2027',
    status: 'Available',
    facility: 'Central Pharmacy Hub',
  },
  {
    id: 'med_002',
    name: 'Amoxicillin',
    category: 'Antibiotic',
    dosageForm: '250mg Capsule',
    availableQuantity: 120,
    unit: 'bottles',
    expiry: 'Jun 2027',
    status: 'Available',
    facility: 'Main Dispensary',
  },
  {
    id: 'med_003',
    name: 'Insulin (Regular)',
    category: 'Diabetes',
    dosageForm: '100 IU/ml Vial',
    availableQuantity: 24,
    unit: 'vials',
    expiry: 'Feb 2027',
    status: 'Low',
    facility: 'Cold Storage Unit B',
  },
  {
    id: 'med_004',
    name: 'ORS (Oral Rehydration Salts)',
    category: 'Essential',
    dosageForm: 'Sachet 21.8g',
    availableQuantity: 420,
    unit: 'packets',
    expiry: 'Aug 2028',
    status: 'Available',
    facility: 'General Stockroom',
  },
  {
    id: 'med_005',
    name: 'Epinephrine Injection',
    category: 'Emergency Care',
    dosageForm: '1mg/ml Ampoule',
    availableQuantity: 14,
    unit: 'ampoules',
    expiry: 'Nov 2026',
    status: 'Critical',
    facility: 'ICU Crash Cart Reserve',
  },
  {
    id: 'med_006',
    name: 'Ceftriaxone',
    category: 'Antibiotic',
    dosageForm: '1g IV Vial',
    availableQuantity: 92,
    unit: 'vials',
    expiry: 'Apr 2027',
    status: 'Available',
    facility: 'Inpatient Pharmacy',
  },
];

export const MOCK_RECENT_ACTIVITY: RecentActivityItem[] = [
  {
    id: 'act_001',
    title: 'Blood request fulfilled — O+',
    timestamp: '10 minutes ago',
    type: 'blood',
    detail: '2 units issued to City Trauma Center',
  },
  {
    id: 'act_002',
    title: 'Medicine stock updated — Insulin',
    timestamp: '32 minutes ago',
    type: 'medicine',
    detail: 'Cold-chain verification logged by Pharmacist Dave',
  },
  {
    id: 'act_003',
    title: 'New blood donation recorded — A+',
    timestamp: '1 hour ago',
    type: 'donation',
    detail: 'Voluntary mobile drive donation batch #BLD-2026-904',
  },
  {
    id: 'act_004',
    title: 'Low stock alert — Amoxicillin',
    timestamp: '2 hours ago',
    type: 'alert',
    detail: 'Reorder threshold reached for 250mg capsules',
  },
  {
    id: 'act_005',
    title: 'Emergency transfer initiated — O- (4 units)',
    timestamp: '3 hours ago',
    type: 'transfer',
    detail: 'Cross-facility mutual aid to Regional Pediatric Ward',
  },
];

