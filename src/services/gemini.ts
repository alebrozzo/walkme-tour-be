import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { Schema } from '@google/generative-ai';
import type { Stop, StopType, Tour } from '../types/tour.js';

const VALID_STOP_TYPES: StopType[] = [
  'landmark',
  'museum',
  'neighborhood',
  'temple',
  'shrine',
  'park',
  'piazza',
  'market',
  'beach',
];

// Enforces structured JSON output from Gemini — ensures consistent tour data with all required fields.
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
        },
        required: ['name', 'address', 'coordinate', 'type', 'description', 'duration'],
      },
    },
  },
  required: ['description', 'color', 'stops'],
};

interface RawStop {
  name: string;
  address: string;
  coordinate: { latitude: number; longitude: number };
  type: string;
  description: string;
  duration: number;
  price?: string;
}

interface RawTour {
  description: string;
  color: string;
  stops: RawStop[];
}

export async function generateTour(placeId: string, city: string, country: string): Promise<Tour> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  });

  const prompt = `Generate a curated walking tour for ${city}, ${country}.
Include between 4 and 10 of the most important and iconic stops to visit (aim for at least 4, max 10 for popular cities).
Order the stops logically for a walking tour.
For each stop provide accurate GPS coordinates.
The "type" field must be one of: landmark, museum, neighborhood, temple, shrine, park, piazza, market, beach.
The "color" field should be a hex color that represents the city's character (e.g. #2C3E8C for Paris).
The "duration" field is the recommended visit time in minutes.
Omit "price" for free stops; include it as a display string (e.g. "€17") for paid ones.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const raw = JSON.parse(text) as RawTour;

  const stops: Stop[] = raw.stops.map((s, index) => {
    const stopType = VALID_STOP_TYPES.includes(s.type as StopType) ? (s.type as StopType) : 'landmark';

    const stop: Stop = {
      id: `${placeId}-${index + 1}`,
      order: index + 1,
      name: s.name,
      address: s.address,
      coordinate: {
        latitude: s.coordinate.latitude,
        longitude: s.coordinate.longitude,
      },
      type: stopType,
      description: s.description,
      duration: s.duration,
    };

    if (s.price !== undefined && s.price !== '') {
      stop.price = s.price;
    }

    return stop;
  });

  return {
    id: placeId,
    city,
    country,
    description: raw.description,
    color: raw.color,
    stops,
  };
}
