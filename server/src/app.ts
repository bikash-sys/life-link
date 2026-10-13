import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import facilityRoutes from './routes/facility.routes.js';
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
