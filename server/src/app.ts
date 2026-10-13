import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import facilityRoutes from './routes/facility.routes.js';
import bloodComponentRoutes from './routes/bloodComponent.routes.js';
import bloodInventoryRoutes from './routes/bloodInventory.routes.js';
import medicineRoutes from './routes/medicine.routes.js';
import medicineInventoryRoutes from './routes/medicineInventory.routes.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

app.use(express.json());

// Health Check Endpoints
const healthHandler = (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'LifeLink API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// API Routes
app.use('/api/facilities', facilityRoutes);
app.use('/api/blood-components', bloodComponentRoutes);
app.use('/api/blood-inventory', bloodInventoryRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/medicine-inventory', medicineInventoryRoutes);

// Catch-all 404 handler for unmapped routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
  });
});

// Centralized Error Handler Middleware
app.use(errorHandler);

export default app;
