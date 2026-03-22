import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cityRoutes from './routes/city.routes.js';

const app = express();

app.use(express.json());

app.use('/api', cityRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
});

export default app;
