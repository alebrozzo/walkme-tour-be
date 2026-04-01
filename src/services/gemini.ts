import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { Schema } from '@google/generative-ai';
import type { Stop, StopBadge, StopType, Tour } from '../types/tour.js';
import { STOP_BADGES, STOP_TYPES } from '../types/tour.js';
import { enrichStopWithPlaceDetails } from './places.js';

// RawStop/RawTour represent the Gemini response before validation:
// stops lack `id`/`order` (assigned during transformation) and `type` is an
// unvalidated string until confirmed against the STOP_TYPES list.
type RawStop = Omit<Stop, 'id' | 'order' | 'type'> & { type: string };
type RawTour = Pick<Tour, 'description' | 'color'> & { stops: RawStop[] };
type StopMetadata = Pick<Stop, 'id' | 'highlights' | 'knownFor' | 'badges'>;

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
        },
        required: ['name', 'address', 'coordinate', 'type', 'description', 'duration'],
      },
    },
  },
  required: ['description', 'color', 'stops'],
};

const metadataSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    stops: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          highlights: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          knownFor: { type: SchemaType.STRING },
          badges: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ['id', 'highlights', 'knownFor', 'badges'],
      },
    },
  },
  required: ['stops'],
};

function isValidStopType(value: string): value is StopType {
  return (STOP_TYPES as string[]).includes(value);
}

function createGeminiModel(schema: Schema) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[gemini] GEMINI_API_KEY is not set');
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });
}

function normalizeBadges(stop: Stop, badges: string[] | undefined): StopBadge[] | undefined {
  const normalized = new Set<StopBadge>();

  for (const badge of badges ?? []) {
    if ((STOP_BADGES as string[]).includes(badge)) {
      normalized.add(badge as StopBadge);
    }
  }

  if (!stop.price) {
    normalized.add('free');
  }

  if (stop.type === 'museum' || stop.type === 'temple' || stop.type === 'shrine') {
    normalized.add('indoor');
  }

  if (
    stop.type === 'park' ||
    stop.type === 'beach' ||
    stop.type === 'neighborhood' ||
    stop.type === 'piazza' ||
    stop.type === 'market'
  ) {
    normalized.add('outdoor');
  }

  return normalized.size > 0 ? Array.from(normalized) : undefined;
}

export async function enrichStopMetadata(
  stops: Stop[],
  city: string,
  country: string,
  language = 'en',
): Promise<Stop[]> {
  if (stops.length === 0) {
    return stops;
  }

  let resultText: string;
  try {
    const geminiModel = createGeminiModel(metadataSchema);
    const prompt = `For each walking tour stop below in ${city}, ${country}, generate short metadata to help a user decide whether to visit.
Return metadata for every stop id exactly once.
Write all text in ${language}.
Use these badge values only when they fit: ${STOP_BADGES.join(', ')}.
Guidelines:
- knownFor: one short sentence fragment, max 90 characters.
- highlights: 2 to 4 concise bullets, each max 60 characters.
- badges: use zero or more allowed badges.
- Only use must-see for the most iconic stops.
- Do not invent prices or hours.

Stops:
${JSON.stringify(
  stops.map((stop) => ({
    id: stop.id,
    name: stop.name,
    type: stop.type,
    address: stop.address,
    description: stop.description,
    price: stop.price,
  })),
  null,
  2,
)}`;

    const result = await geminiModel.generateContent(prompt);
    resultText = result.response.text();
  } catch (err) {
    console.warn(`[gemini] Stop metadata enrichment failed for "${city}, ${country}":`, err);
    return stops.map((stop) => ({ ...stop, badges: normalizeBadges(stop, stop.badges) }));
  }

  try {
    const parsed = JSON.parse(resultText) as { stops?: StopMetadata[] };
    const metadataById = new Map((parsed.stops ?? []).map((item) => [item.id, item]));

    return stops.map((stop) => {
      const metadata = metadataById.get(stop.id);
      const highlights = metadata?.highlights
        ?.map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 4);
      const knownFor = metadata?.knownFor?.trim();

      return {
        ...stop,
        highlights: highlights && highlights.length > 0 ? highlights : stop.highlights,
        knownFor: knownFor || stop.knownFor,
        badges: normalizeBadges(stop, metadata?.badges ?? stop.badges),
      };
    });
  } catch (err) {
    console.warn(`[gemini] Failed to parse stop metadata enrichment for "${city}, ${country}":`, err);
    return stops.map((stop) => ({ ...stop, badges: normalizeBadges(stop, stop.badges) }));
  }
}

export async function generateTour(placeId: string, city: string, country: string, language = 'en'): Promise<Tour> {
  const geminiModel = createGeminiModel(responseSchema);

  const prompt = `Generate a curated walking tour for ${city}, ${country}.
Include between 4 and 10 of the most important and iconic stops to visit (aim for at least 4, max 10 for popular cities).
Order the stops logically for a walking tour.
For each stop provide accurate GPS coordinates.
The "type" field must be one of: landmark, museum, neighborhood, temple, shrine, park, piazza, market, beach.
The "color" field should be a hex color that represents the city's character (e.g. "#2C3E8C" for Paris).
The "duration" field is the recommended visit time in minutes.
Omit "price" for free stops; include it as a display string (e.g. "€17") for paid ones.
Generate all text content (descriptions, names, addresses) in ${language}.`;

  console.log(`[gemini] Generating tour for "${city}, ${country}" (placeId=${placeId}, language=${language})`);

  let result;
  try {
    result = await geminiModel.generateContent(prompt);
  } catch (err) {
    console.error(`[gemini] Gemini API call failed for "${city}, ${country}":`, err);
    throw err;
  }

  const raw = JSON.parse(result.response.text()) as RawTour;

  if (!raw.description || !raw.color || !Array.isArray(raw.stops) || raw.stops.length === 0) {
    console.error(`[gemini] Invalid response received for "${city}, ${country}": missing required fields`, raw);
    throw new Error('Invalid Gemini response: missing required fields');
  }

  const baseStops: Stop[] = await Promise.all(
    raw.stops.map(async (s, index): Promise<Stop> => {
      const order = index + 1;
      const type: StopType = isValidStopType(s.type) ? s.type : 'landmark';

      const stop: Stop = {
        id: `${placeId}-${order}`,
        order,
        name: s.name,
        address: s.address,
        coordinate: { latitude: s.coordinate.latitude, longitude: s.coordinate.longitude },
        type,
        description: s.description,
        duration: s.duration,
      };

      if (s.price !== undefined && s.price !== '') {
        stop.price = s.price;
      }

      return stop;
    }),
  );

  const stopsWithPlaceDetails = await Promise.all(
    baseStops.map((stop) => enrichStopWithPlaceDetails(stop, city, country, language)),
  );

  const stops = await enrichStopMetadata(stopsWithPlaceDetails, city, country, language);

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

  console.log(`[gemini] Tour generated for "${city}, ${country}" with ${stops.length} stops`);

  return tour;
}
