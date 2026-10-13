import { Router } from 'express';
import {
  listMedicinesHandler,
  getMedicineByIdHandler,
  createMedicineHandler,
} from '../controllers/inventory.controller.js';
import {
  authenticate,
  requireAuth,
  requireRoles,
} from '../middleware/auth.middleware.js';

const router = Router();

// Public master catalog discovery
router.get('/', listMedicinesHandler);
router.get('/:id', getMedicineByIdHandler);

// Admin-only master catalog additions
router.post(
  '/',
  authenticate,
  requireAuth,
  requireRoles('ADMIN'),
  createMedicineHandler
);

export default router;
