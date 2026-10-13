import { Router } from 'express';
import {
  createMedicineBatchHandler,
  listMedicineInventoryHandler,
  getMedicineBatchByIdHandler,
  updateMedicineStockHandler,
  reserveMedicineStockHandler,
  releaseMedicineStockHandler,
} from '../controllers/inventory.controller.js';
import { authenticate, requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Public medicine availability discovery
router.get('/', listMedicineInventoryHandler);
router.get('/:id', getMedicineBatchByIdHandler);

// Authorized medicine inventory management
router.post('/', authenticate, requireAuth, createMedicineBatchHandler);
router.patch('/:id/stock', authenticate, requireAuth, updateMedicineStockHandler);

// Atomic reservation lifecycle endpoints
router.post('/:id/reserve', authenticate, requireAuth, reserveMedicineStockHandler);
router.post('/:id/release', authenticate, requireAuth, releaseMedicineStockHandler);

export default router;
