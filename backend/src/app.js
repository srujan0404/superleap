import express from 'express';
import leadRoutes from './routes/leadRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/leads', leadRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
