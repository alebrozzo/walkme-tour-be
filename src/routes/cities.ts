import { Router } from 'express';
import { getOrCreateTour } from '../services/tour.js';

const router = Router();

router.get('/', async (req, res) => {
  const { placeId, city, country, language } = req.query;

  if (typeof placeId !== 'string' || typeof city !== 'string') {
    res.status(400).json({ error: 'Missing required query parameters: placeId, city' });
    return;
  }

  if (country !== undefined && typeof country !== 'string') {
    res.status(400).json({ error: 'Query parameter country must be a string' });
    return;
  }

  if (language !== undefined && typeof language !== 'string') {
    res.status(400).json({ error: 'Query parameter language must be a string' });
    return;
  }

  const sanitizedPlaceId = placeId.trim();
  const sanitizedCity = city.trim();
  const sanitizedCountry = country?.trim() ?? '';
  const sanitizedLanguage = language
    ? language
        .trim()
        .replace(/\s+/g, '-')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 50) || 'en'
    : 'en';

  if (!sanitizedPlaceId || !sanitizedCity) {
    res.status(400).json({ error: 'Missing required query parameters: placeId, city' });
    return;
  }

  const tour = await getOrCreateTour(sanitizedPlaceId, sanitizedCity, sanitizedCountry, sanitizedLanguage);
  res.json(tour);
});

export default router;
