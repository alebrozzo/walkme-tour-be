import { Router } from 'express';
import { TourModel } from '../models/tour.js';
import { lookupPlaceId } from '../services/places.js';

const router = Router();

async function checkGooglePlaces(): Promise<
  { status: 'ok'; samplePlaceId: string } | { status: 'error'; reason: string }
> {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return { status: 'error', reason: 'missing_api_key' };
  }

  try {
    const placeId = await lookupPlaceId('Eiffel Tower', 'Paris', 'France', 48.8584, 2.2945);
    if (!placeId) {
      return { status: 'error', reason: 'place_lookup_failed' };
    }
    return { status: 'ok', samplePlaceId: placeId };
  } catch {
    return { status: 'error', reason: 'places_check_threw' };
  }
}

router.get('/ping', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'walkme-tour-be',
    timestamp: new Date().toISOString(),
  });
});

router.get('/health-check', async (_req, res) => {
  const timestamp = new Date().toISOString();

  try {
    const parisTour = await TourModel.findOne({ city: 'Paris', country: 'France', language: 'en' })
      .select({ _id: 1 })
      .lean<{ _id: string }>();

    const placesCheck = await checkGooglePlaces();
    const isDegraded = placesCheck.status !== 'ok';

    res.status(isDegraded ? 503 : 200).json({
      status: isDegraded ? 'degraded' : 'ok',
      database: {
        status: 'ok',
        check: {
          city: 'Paris',
          country: 'France',
          language: 'en',
          found: Boolean(parisTour),
        },
      },
      googlePlaces: placesCheck,
      timestamp,
    });
  } catch (err) {
    console.error('[health-check] Database check failed:', err);
    const placesCheck = await checkGooglePlaces();
    res.status(503).json({
      status: 'degraded',
      database: {
        status: 'error',
        reason: 'db_check_failed',
      },
      googlePlaces: placesCheck,
      timestamp,
    });
  }
});

export default router;
