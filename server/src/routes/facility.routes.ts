import { Router } from 'express';
import {
  createFacilityHandler,
  listFacilitiesHandler,
  getFacilityByIdHandler,
  updateFacilityHandler,
  setVerificationStatusHandler,
  deleteFacilityHandler,
} from '../controllers/facility.controller.js';
import {
  listFacilityBloodInventoryHandler,
  listFacilityMedicineInventoryHandler,
} from '../controllers/inventory.controller.js';
import {
  authenticate,
  requireAuth,
  requireRoles,
} from '../middleware/auth.middleware.js';

const router = Router();

// Public discovery endpoints
router.get('/', listFacilitiesHandler);
router.get('/:id', getFacilityByIdHandler);

// Facility-specific inventory discovery endpoints
router.get('/:facilityId/blood-inventory', listFacilityBloodInventoryHandler);
router.get('/:facilityId/medicine-inventory', listFacilityMedicineInventoryHandler);

// Authenticated facility management
router.post('/', authenticate, requireAuth, createFacilityHandler);
router.patch('/:id', authenticate, requireAuth, updateFacilityHandler);
router.put('/:id', authenticate, requireAuth, updateFacilityHandler);

// Admin-only management endpoints
router.patch(
  '/:id/verify',
  authenticate,
  requireAuth,
  requireRoles('ADMIN'),
  setVerificationStatusHandler
);
router.delete(
  '/:id',
  authenticate,
  requireAuth,
  requireRoles('ADMIN'),
  deleteFacilityHandler
);

export default router;
