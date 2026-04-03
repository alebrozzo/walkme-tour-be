import { Router } from 'express';
import { getOrCreateTour } from '../services/tour.js';
import { logInfo, logWarn, logError } from '../utils/logger.js';

const router = Router();

router.get('/', async (req, res) => {
  const { placeId, city, country, language } = req.query;
  logInfo('cities', 'GET city request', req, { placeId, city, country, language });

  if (typeof placeId !== 'string' || typeof city !== 'string' || typeof country !== 'string') {
    const msg = 'Missing required query parameters: placeId, city, country';
    res.status(400).json({ error: msg });
    logWarn('cities', '400 - Missing required query parameters', req, { placeId, city, country, language });
    return;
  }

  if (language !== undefined && typeof language !== 'string') {
    const msg = 'Query parameter language must be a string';
    res.status(400).json({ error: msg });
    logWarn('cities', '400 - Invalid language parameter', req);
    return;
  }

  const sanitizedPlaceId = placeId.trim();
  const sanitizedCity = city.trim();
  const sanitizedCountry = country.trim();
  const sanitizedLanguage = language
    ? language
        .trim()
        .replace(/\s+/g, '-')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 50) || 'en'
    : 'en';

  if (!sanitizedPlaceId || !sanitizedCity || !sanitizedCountry) {
    const msg = 'Missing required query parameters: placeId, city, country';
    res.status(400).json({ error: msg });
    logWarn('cities', '400 - Required parameters blank after sanitization', req, {
      placeId,
      city,
      country,
    });
    return;
  }

  try {
    const tour = await getOrCreateTour(sanitizedPlaceId, sanitizedCity, sanitizedCountry, sanitizedLanguage);
    logInfo('cities', 'Successfully retrieved/created tour', req, {
      city: sanitizedCity,
      country: sanitizedCountry,
      placeId: sanitizedPlaceId,
    });
    res.json(tour);
  } catch (err) {
    logError(
      'cities',
      `Failed to get/create tour for "${sanitizedCity}, ${sanitizedCountry}" (placeId=${sanitizedPlaceId})`,
      req,
      { error: err instanceof Error ? err.message : String(err) },
    );
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

export default router;
