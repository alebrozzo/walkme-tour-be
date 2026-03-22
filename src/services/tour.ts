import type { Tour, Stop } from '../types/tour.js';
import type { TourDoc, StopDoc } from '../models/tour.js';
import { TourModel } from '../models/tour.js';
import { generateTour } from './gemini.js';

function stopDocToStop(doc: StopDoc): Stop {
  const stop: Stop = {
    id: doc.id,
    order: doc.order,
    name: doc.name,
    address: doc.address,
    coordinate: doc.coordinate,
    type: doc.type,
    description: doc.description,
    duration: doc.duration,
  };
  if (doc.imageUrl !== undefined) stop.imageUrl = doc.imageUrl;
  if (doc.price !== undefined) stop.price = doc.price;
  return stop;
}

function tourDocToTour(doc: TourDoc): Tour {
  const tour: Tour = {
    id: doc._id,
    city: doc.city,
    country: doc.country,
    description: doc.description,
    color: doc.color,
    stops: doc.stops.map(stopDocToStop),
  };
  if (doc.imageUrl !== undefined) tour.imageUrl = doc.imageUrl;
  return tour;
}

export async function getOrCreateTour(placeId: string, name: string, country: string): Promise<Tour> {
  const existing = await TourModel.findById(placeId).lean<TourDoc>();
  if (existing) {
    return tourDocToTour(existing);
  }

  const tour = await generateTour(placeId, name, country);

  const stops: StopDoc[] = tour.stops.map((s): StopDoc => {
    const stopDoc: StopDoc = {
      id: s.id,
      order: s.order,
      name: s.name,
      address: s.address,
      coordinate: s.coordinate,
      type: s.type,
      description: s.description,
      duration: s.duration,
    };
    if (s.imageUrl !== undefined) stopDoc.imageUrl = s.imageUrl;
    if (s.price !== undefined) stopDoc.price = s.price;
    return stopDoc;
  });

  const docData: TourDoc = {
    _id: placeId,
    city: tour.city,
    country: tour.country,
    description: tour.description,
    color: tour.color,
    stops,
  };
  if (tour.imageUrl !== undefined) docData.imageUrl = tour.imageUrl;

  await TourModel.create(docData);

  return tour;
}
