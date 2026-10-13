import { Router } from 'express';
import {
  listBloodComponentsHandler,
  getBloodComponentByIdHandler,
} from '../controllers/inventory.controller.js';

const router = Router();

// Public master catalog discovery
router.get('/', listBloodComponentsHandler);
router.get('/:id', getBloodComponentByIdHandler);

export default router;
