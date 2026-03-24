import { Router } from 'express';
import { getOrCreateTour } from '../services/tour.js';

const router = Router();

router.get('/', async (req, res) => {
  const { placeId, name, country, language } = req.query;

  if (!placeId || !name || !country) {
    res.status(400).json({ error: 'Missing required query parameters: placeId, name, country' });
    return;
  }

  if (typeof placeId !== 'string' || typeof name !== 'string' || typeof country !== 'string') {
    res.status(400).json({ error: 'Query parameters placeId, name, and country must be strings' });
    return;
  }

  if (language !== undefined && typeof language !== 'string') {
    res.status(400).json({ error: 'Query parameter language must be a string' });
    return;
  }

  const sanitizedLanguage = language
    ? language
        .trim()
        .replace(/\s+/g, '-')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 50) || 'en'
    : 'en';

  const tour = await getOrCreateTour(placeId, name, country, sanitizedLanguage);
  res.json(tour);
});

export default router;
