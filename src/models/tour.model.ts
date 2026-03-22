import { Schema, model } from 'mongoose';
import type { StopType } from '../types/tour.js';

export interface StopDoc {
  id: string;
  order: number;
  name: string;
  address: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  type: StopType;
  imageUrl?: string;
  description: string;
  duration: number;
  price?: string;
}

export interface TourDoc {
  _id: string;
  city: string;
  country: string;
  description: string;
  color: string;
  imageUrl?: string;
  stops: StopDoc[];
}

const coordinateSchema = new Schema(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { _id: false },
);

const stopSchema = new Schema<StopDoc>(
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
  },
  { _id: false },
);

const tourSchema = new Schema<TourDoc>(
  {
    _id: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    description: { type: String, required: true },
    color: { type: String, required: true },
    imageUrl: { type: String },
    stops: { type: [stopSchema], required: true },
  },
  { versionKey: false },
);

export const TourModel = model<TourDoc>('Tour', tourSchema);
