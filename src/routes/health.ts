import { Router } from 'express';

const router = Router();

router.get('/ping', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'walkme-tour-be',
    timestamp: new Date().toISOString(),
  });
});

export default router;
