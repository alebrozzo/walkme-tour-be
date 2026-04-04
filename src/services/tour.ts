import type { Tour } from '../types/tour.js';
import type { TourDoc } from '../models/tour.js';
import { TourModel } from '../models/tour.js';
import { logMessage } from '../utils/logger.js';
import { generateTour } from './gemini.js';

function tourDocToTour(doc: TourDoc): Tour {
  const tour: Tour = {
    id: doc._id,
    placeId: doc.placeId,
    city: doc.city,
    country: doc.country,
    language: doc.language,
    description: doc.description,
    color: doc.color,
    stops: doc.stops,
  };
  if (doc.imageUrl !== undefined) {
    tour.imageUrl = doc.imageUrl;
  }
  return tour;
}

export async function getOrCreateTour(placeId: string, city: string, country: string, language = 'en'): Promise<Tour> {
  const docId = `${placeId}_${language}`;

  let existing: TourDoc | null;
  try {
    existing = await TourModel.findById(docId).lean<TourDoc>();
  } catch (err) {
    logMessage('error', `DB lookup failed for id="${docId}"`, String(err));
    throw err;
  }

  if (existing) {
    logMessage('info', `Cache hit for ${JSON.stringify({ id: docId })}`);
    return tourDocToTour(existing);
  }

  logMessage('info', `No cached tour found for ${JSON.stringify({ id: docId })}, generating…`);

  let tour: Tour;
  try {
    tour = await generateTour(placeId, city, country, language);
  } catch (err) {
    logMessage(
      'error',
      `Tour generation failed for ${JSON.stringify({ city, country, placeId, language })}`,
      String(err),
    );
    throw err;
  }

  const docData: TourDoc = {
    _id: docId,
    placeId,
    city: tour.city,
    country: tour.country,
    language: tour.language,
    description: tour.description,
    color: tour.color,
    stops: tour.stops,
  };
  if (tour.imageUrl !== undefined) {
    docData.imageUrl = tour.imageUrl;
  }

  try {
    const savedDoc = await TourModel.findByIdAndUpdate(
      docId,
      { $setOnInsert: docData },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ).lean<TourDoc>();

    if (!savedDoc) {
      throw new Error(`[tour] Upsert did not return a document for ${JSON.stringify({ id: docId })}`);
    }

    logMessage('info', `Tour saved to DB for ${JSON.stringify({ id: docId })}`);

    return tourDocToTour(savedDoc);
  } catch (err) {
    logMessage('error', `Failed to save tour to DB for ${JSON.stringify({ id: docId })}`, String(err));
    throw err;
  }
}
