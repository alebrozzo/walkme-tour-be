import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { Schema } from '@google/generative-ai';
import type { Tour, Stop, StopType } from '../types/tour.js';
import { logMessage } from '../utils/logger.js';
import { STOP_TYPES } from '../types/tour.js';
import { lookupPlaceId } from './places.js';

export const GEMINI_MODEL = 'gemini-2.5-flash';

// RawStop/RawTour represent the Gemini response before validation:
// stops lack `id`/`order` (assigned during transformation) and `type` is an
// unvalidated string until confirmed against the STOP_TYPES list.
type RawStop = Omit<Stop, 'id' | 'order' | 'type' | 'relevance'> & { type: string; relevance: number };
type RawTour = Pick<Tour, 'description' | 'color'> & { stops: RawStop[] };

// Structured JSON schema enforced by Gemini — guarantees all required fields are present.
const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    description: { type: SchemaType.STRING },
    color: { type: SchemaType.STRING },
    stops: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          address: { type: SchemaType.STRING },
          coordinate: {
            type: SchemaType.OBJECT,
            properties: {
              latitude: { type: SchemaType.NUMBER },
              longitude: { type: SchemaType.NUMBER },
            },
            required: ['latitude', 'longitude'],
          },
          type: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          duration: { type: SchemaType.NUMBER },
          price: { type: SchemaType.STRING },
          relevance: { type: SchemaType.INTEGER },
        },
        required: ['name', 'address', 'coordinate', 'type', 'description', 'duration', 'relevance'],
      },
    },
  },
  required: ['description', 'color', 'stops'],
};

function isValidStopType(value: string): value is StopType {
  return (STOP_TYPES as string[]).includes(value);
}

export async function generateTour(placeId: string, city: string, country: string, language = 'en'): Promise<Tour> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logMessage('error', 'GEMINI_API_KEY is not set');
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  });

  const prompt = `Generate a curated walking tour for ${city}, ${country}.
Very popular cities (e.g. Paris, New York, London, Rome, Tokyo, Barcelona, Amsterdam, Berlin, Sydney, Dubai) must have at least 10 stops. All other cities must have at least 4 stops. You may always include more stops than the minimum.
Order the stops logically for a walking tour.
For each stop provide accurate GPS coordinates.
The "type" field must be one of: landmark, museum, neighborhood, temple, shrine, park, piazza, market, beach.
The "color" field should be a hex color that represents the city's character (e.g. "#2C3E8C" for Paris).
The "duration" field is the recommended visit time in minutes.
Omit "price" for free stops; include it as a display string (e.g. "€17") for paid ones.
The "relevance" field must be an integer: 1 = must see, 2 = not so important but good to see, 3 = optional if you have time. It is okay if no stop has relevance 1.
Generate all text content (descriptions, names, addresses) in ${language}.`;

  logMessage('info', `Generating tour for ${JSON.stringify({ city, country, placeId, language })}`);

  let result;
  try {
    result = await geminiModel.generateContent(prompt);
  } catch (err) {
    logMessage(
      'error',
      `Gemini API call failed for ${JSON.stringify({ city, country, placeId, language })}`,
      String(err),
    );
    throw err;
  }

  const raw = JSON.parse(result.response.text()) as RawTour;

  if (!raw.description || !raw.color || !Array.isArray(raw.stops) || raw.stops.length === 0) {
    logMessage(
      'error',
      `Invalid response received for ${JSON.stringify({ city, country, placeId, language })}`,
      `missing required fields: ${JSON.stringify(raw)}`,
    );
    throw new Error('Invalid Gemini response: missing required fields');
  }

  const stops: Stop[] = await Promise.all(
    raw.stops.map(async (s, index): Promise<Stop> => {
      const order = index + 1;
      const type: StopType = isValidStopType(s.type) ? s.type : 'landmark';

      const rawRelevance = s.relevance;
      let relevance: 1 | 2 | 3;
      if (rawRelevance === 1 || rawRelevance === 2 || rawRelevance === 3) {
        relevance = rawRelevance;
      } else {
        logMessage('warn', `Invalid relevance value "${rawRelevance}" for stop "${s.name}", defaulting to 3`);
        relevance = 3;
      }

      const stop: Stop = {
        id: `${placeId}-${order}`,
        order,
        name: s.name,
        address: s.address,
        coordinate: { latitude: s.coordinate.latitude, longitude: s.coordinate.longitude },
        type,
        description: s.description,
        duration: s.duration,
        relevance,
      };

      if (s.price !== undefined && s.price !== '') {
        stop.price = s.price;
      }

      const googlePlaceId = await lookupPlaceId(s.name, city, country, s.coordinate.latitude, s.coordinate.longitude);
      if (googlePlaceId !== undefined) {
        stop.googlePlaceId = googlePlaceId;
      }

      return stop;
    }),
  );

  const tour: Tour = {
    id: `${placeId}_${language}`,
    placeId,
    city,
    country,
    language,
    description: raw.description,
    color: raw.color,
    stops,
  };

  logMessage('info', `Tour generated for "${city}, ${country}"`, `stops=${stops.length}`);

  return tour;
}
