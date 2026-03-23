import { Router } from 'express';
import { getOrCreateTour } from '../services/tour.js';

const router = Router();

router.get('/', async (req, res) => {
  const { placeId } = req.query;

  if (!placeId) {
    res.status(400).json({ error: 'Missing required query parameter: placeId' });
    return;
  }

  if (typeof placeId !== 'string') {
    res.status(400).json({ error: 'Query parameter placeId must be a string' });
    return;
  }

  const tour = await getOrCreateTour(placeId);
  res.json(tour);
});

export default router;
