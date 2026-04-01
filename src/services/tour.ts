import type { Tour } from '../types/tour.js';
import type { TourDoc } from '../models/tour.js';
import { TourModel } from '../models/tour.js';
import { enrichStopMetadata, generateTour } from './gemini.js';
import { enrichStopWithPlaceDetails } from './places.js';

const TOUR_METADATA_VERSION = 1;

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

    if (existing.metadataVersion === TOUR_METADATA_VERSION) {
      return tourDocToTour(existing);
    }

    console.log(`[tour] Enriching cached tour metadata for id="${docId}"`);

    const stopsWithPlaceDetails = await Promise.all(
      existing.stops.map((stop) => enrichStopWithPlaceDetails(stop, city, country, language)),
    );
    const enrichedStops = await enrichStopMetadata(stopsWithPlaceDetails, city, country, language);

    const updatedDoc = await TourModel.findByIdAndUpdate(
      docId,
      {
        $set: {
          stops: enrichedStops,
          metadataVersion: TOUR_METADATA_VERSION,
        },
      },
      { returnDocument: 'after' },
    ).lean<TourDoc>();

    if (updatedDoc) {
      return tourDocToTour(updatedDoc);
    }

    return {
      ...tourDocToTour(existing),
      stops: enrichedStops,
    };
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
    metadataVersion: TOUR_METADATA_VERSION,
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
      throw new Error(`[tour] Upsert did not return a document for id="${docId}"`);
    }

    console.log(`[tour] Tour saved to DB for id="${docId}"`);

    return tourDocToTour(savedDoc);
  } catch (err) {
    console.error(`[tour] Failed to save tour to DB for id="${docId}":`, err);
    throw err;
  }
}
