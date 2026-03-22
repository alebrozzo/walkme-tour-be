import mongoose from 'mongoose';
import type { Tour, Stop } from '../types/tour.js';

const coordinateSchema = new mongoose.Schema(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { _id: false },
);

const stopSchema = new mongoose.Schema<Stop>(
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

const tourSchema = new mongoose.Schema<Tour>({
  id: { type: String, required: true, unique: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  description: { type: String, required: true },
  color: { type: String, required: true },
  imageUrl: { type: String },
  stops: { type: [stopSchema], required: true },
});

tourSchema.set('toJSON', {
  transform(_doc, ret) {
    const record = ret as unknown as Record<string, unknown>;
    delete record['_id'];
    delete record['__v'];
    return record;
  },
});

export const TourModel = mongoose.model<Tour>('Tour', tourSchema);
