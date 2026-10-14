import { Router } from 'express';
import {
  registerHandler,
  loginHandler,
  getMeHandler,
} from '../controllers/auth.controller.js';
import { authenticate, requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Public Authentication Endpoints
router.post('/register', registerHandler);
router.post('/login', loginHandler);

// Protected Identity & Profile Endpoint
router.get('/me', authenticate, requireAuth, getMeHandler);

export default router;
