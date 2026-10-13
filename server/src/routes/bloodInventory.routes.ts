import { Router } from 'express';
import {
  createBloodBatchHandler,
  listBloodInventoryHandler,
  getBloodBatchByIdHandler,
  updateBloodStockHandler,
  reserveBloodStockHandler,
  releaseBloodStockHandler,
} from '../controllers/inventory.controller.js';
import { authenticate, requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Public inventory availability discovery
router.get('/', listBloodInventoryHandler);
router.get('/:id', getBloodBatchByIdHandler);

// Authorized inventory operations (Facility Staff & Admin)
router.post('/', authenticate, requireAuth, createBloodBatchHandler);
router.patch('/:id/stock', authenticate, requireAuth, updateBloodStockHandler);

// Atomic reservation lifecycle endpoints
router.post('/:id/reserve', authenticate, requireAuth, reserveBloodStockHandler);
router.post('/:id/release', authenticate, requireAuth, releaseBloodStockHandler);

export default router;
