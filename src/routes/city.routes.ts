import { Router } from 'express';
import { getCityTour } from '../controllers/city.controller.js';

const router = Router();

router.get('/cities', getCityTour);

export default router;
