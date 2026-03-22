import type { Request, Response, NextFunction } from 'express';
import { getOrCreateTour } from '../services/tour.service.js';

export async function getCityTour(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { placeId, name, country } = req.query;

  if (!placeId || !name || !country) {
    res.status(400).json({ error: 'Missing required query parameters: placeId, name, country' });
    return;
  }

  if (typeof placeId !== 'string' || typeof name !== 'string' || typeof country !== 'string') {
    res.status(400).json({ error: 'Query parameters placeId, name, and country must be strings' });
    return;
  }

  try {
    const tour = await getOrCreateTour(placeId, name, country);
    res.json(tour);
  } catch (err) {
    next(err);
  }
}
