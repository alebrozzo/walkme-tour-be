import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import citiesRouter from './routes/cities.js';
import healthRouter from './routes/health.js';
import { getOrGenerateCorrelationId } from './utils/correlationId.js';
import { logInfo } from './utils/logger.js';

const app = express();

app.use(express.json());

// Correlation ID middleware - extract from headers or generate new one
app.use((req: Request, res: Response, next: NextFunction) => {
  req.correlationId = getOrGenerateCorrelationId(req);
  // Add correlation ID to response headers so client can receive it if needed
  res.setHeader('X-Correlation-ID', req.correlationId);
  next();
});

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logInfo('app', `${req.method} ${req.url}`, req.correlationId, { path: req.path });
  next();
});

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean)
  : [];

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

  if (isDev) {
    res.header('Access-Control-Allow-Origin', '*');
  } else if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Correlation-ID');
  res.header('Access-Control-Expose-Headers', 'X-Correlation-ID');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

app.use('/api', healthRouter);
app.use('/api/cities', citiesRouter);

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
