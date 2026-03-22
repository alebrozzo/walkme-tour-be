import { Router } from 'express';
import { TourModel } from '../models/tour.js';
import { generateTour } from '../services/gemini.js';

const router = Router();

router.get('/', async (req, res) => {
  const { placeId, name, country } = req.query;

  if (
    typeof placeId !== 'string' ||
    typeof name !== 'string' ||
    typeof country !== 'string' ||
    !placeId.trim() ||
    !name.trim() ||
    !country.trim()
  ) {
    res
      .status(400)
      .json({ error: 'Query parameters placeId, name, and country are required and must be non-empty strings' });
    return;
  }

  const existing = await TourModel.findOne({ id: placeId });
  if (existing) {
    res.json(existing.toJSON());
    return;
  }

  const tour = await generateTour(placeId, name, country);
  const saved = await TourModel.create(tour);
  res.status(201).json(saved.toJSON());
});

export default router;
