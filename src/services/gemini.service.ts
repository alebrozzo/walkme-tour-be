import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Tour, Stop, StopType, Coordinate } from '../types/tour.js';
import { STOP_TYPES } from '../types/tour.js';

interface GeminiStop {
  order: number;
  name: string;
  address: string;
  coordinate: Coordinate;
  type: string;
  imageUrl?: string;
  description: string;
  duration: number;
  price?: string;
}

interface GeminiTourData {
  description: string;
  color: string;
  stops: GeminiStop[];
}

function buildPrompt(name: string, country: string): string {
  return `You are a travel guide expert. Generate a curated walking tour for ${name}, ${country}.

Return ONLY a JSON object (no markdown, no code blocks, just raw JSON) with this exact structure:
{
  "description": "A compelling 1-2 sentence description of what makes this city's tour special",
  "color": "#XXXXXX",
  "stops": [
    {
      "order": 1,
      "name": "Place Name",
      "address": "Full street address",
      "coordinate": { "latitude": 48.8584, "longitude": 2.2945 },
      "type": "landmark",
      "description": "2-3 sentences about why this place is worth visiting and what to expect",
      "duration": 60
    }
  ]
}

Rules:
- Include between 4 and 10 of the most iconic and important places to visit
- For major/popular cities aim for 8-10 stops; for smaller cities aim for 4-6 stops
- Order stops logically for a walking tour (by geographic proximity when possible)
- Use real, accurate GPS coordinates and addresses
- The "color" must be a hex color string (e.g. "#2C3E8C") that evokes the city's character
- The "type" must be exactly one of: landmark, museum, neighborhood, temple, shrine, park, piazza, market, beach
- "duration" is in minutes (integer)
- Include "price" only if there is an entry fee (e.g. "€15", "$20"); omit the field entirely for free places
- Omit the "imageUrl" field entirely (leave it out)
- Each stop "description" should be informative and engaging (2-3 sentences)`;
}

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  // Strip markdown code block if present
  const match = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed);
  if (match?.[1]) return match[1].trim();
  return trimmed;
}

function isValidStopType(value: string): value is StopType {
  return (STOP_TYPES as string[]).includes(value);
}

function parseGeminiResponse(raw: string, placeId: string, name: string, country: string): Tour {
  const jsonStr = extractJson(raw);
  const data = JSON.parse(jsonStr) as GeminiTourData;

  if (!data.description || !data.color || !Array.isArray(data.stops) || data.stops.length === 0) {
    throw new Error('Invalid Gemini response: missing required fields');
  }

  const stops: Stop[] = data.stops.map((gs, index): Stop => {
    const order = gs.order ?? index + 1;
    const type: StopType = isValidStopType(gs.type) ? gs.type : 'landmark';

    const stop: Stop = {
      id: `${placeId}-${order}`,
      order,
      name: gs.name,
      address: gs.address,
      coordinate: gs.coordinate,
      type,
      description: gs.description,
      duration: gs.duration,
    };

    if (gs.price !== undefined) stop.price = gs.price;
    if (gs.imageUrl !== undefined) stop.imageUrl = gs.imageUrl;

    return stop;
  });

  const tour: Tour = {
    id: placeId,
    city: name,
    country,
    description: data.description,
    color: data.color,
    stops,
  };

  return tour;
}

export async function generateTour(placeId: string, name: string, country: string): Promise<Tour> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is not set');

  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = buildPrompt(name, country);
  const result = await geminiModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });

  const raw = result.response.text();
  return parseGeminiResponse(raw, placeId, name, country);
}
