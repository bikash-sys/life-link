import dotenv from 'dotenv';
import type { Express } from 'express';

dotenv.config({ path: '../.env' });

async function start() {
  const appModule = (await import('./app.js')) as unknown as {
    default: Express;
  };

  const app = appModule.default;
  const PORT = process.env.PORT || 5001;

  const server = app.listen(PORT, async () => {
    console.log(`[LifeLink API] Server listening on port ${PORT}`);
    console.log(`[LifeLink API] Storage driver: ${process.env.STORAGE_DRIVER || 'in-memory'}`);
    console.log(`[LifeLink API] Health check: http://localhost:${PORT}/health`);

    // Non-blocking initialization of WhatsApp notification client
    try {
      const { whatsappService } = await import('./services/whatsapp.service.js');
      await whatsappService.initialize();
    } catch (waError: any) {
      console.warn('[LifeLink API] WhatsApp initialization notice (non-fatal):', waError?.message || waError);
    }
  });

  const shutdown = async (signal: string) => {
    console.log(`[LifeLink API] Received ${signal}. Graceful shutdown initiated.`);
    try {
      const { whatsappService } = await import('./services/whatsapp.service.js');
      await whatsappService.disconnect();
    } catch {
      // Ignore disconnect errors during teardown
    }
    server.close(() => {
      console.log('[LifeLink API] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

start().catch((error) => {
  console.error('[LifeLink API] Failed to start:', error);
  process.exit(1);
});