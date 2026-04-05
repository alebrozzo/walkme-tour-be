import { Schema, model } from 'mongoose';
import type { Stop } from '../types/tour.js';

export interface TourDoc {
  _id: string;
  placeId: string;
  city: string;
  country: string;
  language: string;
  description: string;
  color: string;
  imageUrl?: string;
  stops: Stop[];
}

const coordinateSchema = new Schema(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { _id: false },
);

const stopSchema = new Schema<Stop>(
  {
    id: { type: String, required: true },
    order: { type: Number, required: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    coordinate: { type: coordinateSchema, required: true },
    type: { type: String, required: true },
    imageUrl: { type: String },
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    price: { type: String },
    googlePlaceId: { type: String },
    relevance: { type: Number, required: true },
  },
  { _id: false },
);

const tourSchema = new Schema<TourDoc>(
  {
    _id: { type: String, required: true },
    placeId: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    language: { type: String, required: true },
    description: { type: String, required: true },
    color: { type: String, required: true },
    imageUrl: { type: String },
    stops: { type: [stopSchema], required: true },
  },
  { versionKey: false },
);

export const TourModel = model<TourDoc>('Tour', tourSchema);
