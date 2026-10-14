import dotenv from 'dotenv';
import type { Express } from 'express';

dotenv.config({ path: '../.env' });

async function start() {
  const appModule = (await import('./app.js')) as unknown as {
    default: Express;
  };

  const app = appModule.default;
  const PORT = process.env.PORT || 5001;

  app.listen(PORT, () => {
    console.log(`[LifeLink API] Server listening on port ${PORT}`);
    console.log(`[LifeLink API] Storage driver: ${process.env.STORAGE_DRIVER}`);
    console.log(`[LifeLink API] Health check: http://localhost:${PORT}/health`);
  });
}

start().catch((error) => {
  console.error('[LifeLink API] Failed to start:', error);
  process.exit(1);
});