import express from 'express';
import { locationController } from '../controllers/LocationController.js';

const router = express.Router();

// Geocoding Proxy Endpoints
router.get('/reverse-geocode', (req, res, next) => locationController.reverseGeocode(req, res, next));
router.get('/geocode', (req, res, next) => locationController.geocode(req, res, next));

export default router;
