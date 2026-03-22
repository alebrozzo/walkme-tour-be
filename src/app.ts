import express from 'express';
import rateLimit from 'express-rate-limit';
import citiesRouter from './routes/cities.js';

const app = express();

app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

app.use('/api/cities', citiesRouter);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    // Express requires the 4-parameter signature to treat this as an error handler
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  },
);

export default app;
