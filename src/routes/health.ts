import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TourModel } from '../models/tour.js';
import { lookupPlaceId } from '../services/places.js';
import { GEMINI_MODEL } from '../services/gemini.js';
import { logMessage } from '../utils/logger.js';

const router = Router();

type CheckResult = { status: 'ok'; details?: Record<string, unknown> } | { status: 'error'; reason: string };

function queryFlag(value: unknown, defaultValue: boolean): boolean {
  if (typeof value !== 'string') {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

async function checkDatabase(): Promise<CheckResult> {
  try {
    const parisTour = await TourModel.findOne({ city: 'Paris', country: 'France', language: 'en' })
      .select({ _id: 1 })
      .lean<{ _id: string }>();

    return {
      status: 'ok',
      details: {
        check: {
          city: 'Paris',
          country: 'France',
          language: 'en',
          found: Boolean(parisTour),
        },
      },
    };
  } catch (err) {
    logMessage('error', 'Database check failed', undefined, {
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: 'error', reason: 'db_check_failed' };
  }
}

async function checkGooglePlaces(): Promise<
  { status: 'ok'; details: { samplePlaceId: string } } | { status: 'error'; reason: string }
> {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return { status: 'error', reason: 'missing_api_key' };
  }

  try {
    const placeId = await lookupPlaceId('Eiffel Tower', 'Paris', 'France', 48.8584, 2.2945);
    if (!placeId) {
      return { status: 'error', reason: 'place_lookup_failed' };
    }
    return { status: 'ok', details: { samplePlaceId: placeId } };
  } catch {
    return { status: 'error', reason: 'places_check_threw' };
  }
}

async function checkGemini(): Promise<CheckResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { status: 'error', reason: 'missing_api_key' };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent('Reply with exactly: ok');
    const text = result.response.text().trim().toLowerCase();

    return {
      status: 'ok',
      details: {
        responded: text.includes('ok'),
      },
    };
  } catch (err) {
    logMessage('error', 'Gemini check failed', undefined, {
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: 'error', reason: 'gemini_check_failed' };
  }
}

router.get('/ping', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'walkme-tour-be',
    timestamp: new Date().toISOString(),
  });
});

router.get('/health-check', async (req, res) => {
  const timestamp = new Date().toISOString();
  const includeDb = queryFlag(req.query.includeDb, true);
  const includePlaces = queryFlag(req.query.includePlaces, true);
  const includeAI = queryFlag(req.query.includeAI, false);

  logMessage('log', 'Health check requested', req, {
    includeDb,
    includePlaces,
    includeAI,
  });

  const checksRun: string[] = [];
  const checksSkipped: string[] = [];
  const components: Record<string, unknown> = {};

  if (includeDb) {
    checksRun.push('database');
    const dbCheck = await checkDatabase();
    components.database = dbCheck;
  } else {
    checksSkipped.push('database');
  }

  if (includePlaces) {
    checksRun.push('googlePlaces');
    components.googlePlaces = await checkGooglePlaces();
  } else {
    checksSkipped.push('googlePlaces');
  }

  if (includeAI) {
    checksRun.push('ai');
    components.ai = await checkGemini();
  } else {
    checksSkipped.push('ai');
  }

  const failingChecks = Object.entries(components)
    .filter(([, value]) => typeof value === 'object' && value !== null)
    .filter(([, value]) => {
      const status = (value as { status?: string }).status;
      return status === 'error';
    })
    .map(([name]) => name);

  const status = failingChecks.length > 0 ? 'degraded' : 'ok';
  const statusCode = failingChecks.length > 0 ? 503 : 200;

  logMessage('log', 'Health check completed', req, {
    status,
    failingChecks,
  });

  res.status(statusCode).json({
    status,
    checks: {
      run: checksRun,
      skipped: checksSkipped,
      failing: failingChecks,
    },
    ...components,
    timestamp,
  });
});

export default router;
