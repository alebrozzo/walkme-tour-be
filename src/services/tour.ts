import type { Tour } from '../types/tour.js';
import type { TourDoc } from '../models/tour.js';
import { TourModel } from '../models/tour.js';
import { generateTour } from './gemini.js';

function tourDocToTour(doc: TourDoc): Tour {
  const tour: Tour = {
    id: doc._id,
    city: doc.city,
    country: doc.country,
    language: doc.language,
    description: doc.description,
    color: doc.color,
    stops: doc.stops,
  };
  if (doc.imageUrl !== undefined) tour.imageUrl = doc.imageUrl;
  return tour;
}

export async function getOrCreateTour(placeId: string, name: string, country: string, language = 'en'): Promise<Tour> {
  const docId = `${placeId}_${language}`;
  const existing = await TourModel.findById(docId).lean<TourDoc>();
  if (existing) {
    return tourDocToTour(existing);
  }

  const tour = await generateTour(placeId, name, country, language);

  const docData: TourDoc = {
    _id: docId,
    city: tour.city,
    country: tour.country,
    language: tour.language,
    description: tour.description,
    color: tour.color,
    stops: tour.stops,
  };
  if (tour.imageUrl !== undefined) docData.imageUrl = tour.imageUrl;

  await TourModel.create(docData);

  return tour;
}
