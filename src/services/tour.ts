import type { Tour } from '../types/tour.js';
import type { TourDoc } from '../models/tour.js';
import { TourModel } from '../models/tour.js';
import { generateTour } from './gemini.js';

function tourDocToTour(doc: TourDoc): Tour {
  const tour: Tour = {
    id: doc._id,
    city: doc.city,
    country: doc.country,
    description: doc.description,
    color: doc.color,
    stops: doc.stops,
  };
  if (doc.imageUrl !== undefined) tour.imageUrl = doc.imageUrl;
  return tour;
}

export async function getOrCreateTour(placeId: string, name: string, country: string, language = 'English'): Promise<Tour> {
  const existing = await TourModel.findById(placeId).lean<TourDoc>();
  if (existing) {
    return tourDocToTour(existing);
  }

  const tour = await generateTour(placeId, name, country, language);

  const docData: TourDoc = {
    _id: placeId,
    city: tour.city,
    country: tour.country,
    description: tour.description,
    color: tour.color,
    stops: tour.stops,
  };
  if (tour.imageUrl !== undefined) docData.imageUrl = tour.imageUrl;

  await TourModel.create(docData);

  return tour;
}
