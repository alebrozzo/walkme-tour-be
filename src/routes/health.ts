import { Router } from 'express';
import { TourModel } from '../models/tour.js';

const router = Router();

router.get('/ping', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'walkme-tour-be',
    timestamp: new Date().toISOString(),
  });
});

router.get('/health-check', async (_req, res) => {
  try {
    const parisTour = await TourModel.findOne({ city: 'Paris', country: 'France', language: 'en' })
      .select({ _id: 1 })
      .lean<{ _id: string }>();

    res.status(200).json({
      status: 'ok',
      database: {
        status: 'ok',
        check: {
          city: 'Paris',
          country: 'France',
          language: 'en',
          found: Boolean(parisTour),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[health-check] Database check failed:', err);
    res.status(503).json({
      status: 'degraded',
      database: {
        status: 'error',
        reason: 'db_check_failed',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
