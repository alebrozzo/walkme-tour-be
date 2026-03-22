import { Router } from 'express';
import { getOrCreateTour } from '../services/tour.js';

const router = Router();

router.get('/', async (req, res) => {
  const { placeId, name, country } = req.query;

  if (!placeId || !name || !country) {
    res.status(400).json({ error: 'Missing required query parameters: placeId, name, country' });
    return;
  }

  if (typeof placeId !== 'string' || typeof name !== 'string' || typeof country !== 'string') {
    res.status(400).json({ error: 'Query parameters placeId, name, and country must be strings' });
    return;
  }

  const tour = await getOrCreateTour(placeId, name, country);
  res.json(tour);
});

export default router;
