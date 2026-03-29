import type { Tour } from '../types/tour.js';
import type { TourDoc } from '../models/tour.js';
import { TourModel } from '../models/tour.js';
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
    console.error(`[tour] DB lookup failed for id="${docId}":`, err);
    throw err;
  }

  if (existing) {
    console.log(`[tour] Cache hit for id="${docId}"`);
    return tourDocToTour(existing);
  }

  console.log(`[tour] No cached tour found for id="${docId}", generating…`);

  let tour: Tour;
  try {
    tour = await generateTour(placeId, city, country, language);
  } catch (err) {
    console.error(
      `[tour] Tour generation failed for "${city}, ${country}" (placeId=${placeId}, language=${language}):`,
      err,
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
    await TourModel.create(docData);
  } catch (err) {
    console.error(`[tour] Failed to save tour to DB for id="${docId}":`, err);
    throw err;
  }

  console.log(`[tour] Tour saved to DB for id="${docId}"`);

  return tour;
}
