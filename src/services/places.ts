import type { Stop } from '../types/tour.js';

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const PLACE_DETAILS_URL = 'https://places.googleapis.com/v1/places';

interface PlacesSearchResponse {
  places?: Array<{ id: string }>;
}

interface PlaceOpeningHours {
  weekdayDescriptions?: string[];
}

interface PlaceDetailsResponse {
  rating?: number;
  userRatingCount?: number;
  currentOpeningHours?: PlaceOpeningHours;
  regularOpeningHours?: PlaceOpeningHours;
}

export interface PlaceDetails {
  openingHours?: string[];
  rating?: number;
  ratingCount?: number;
}

/**
 * Looks up a Google Maps Place ID for a given stop.
 * Including city and country in the query ensures unambiguous matching regardless of the language
 * the stop name was generated in.
 * Returns undefined if the lookup fails or returns no results.
 */
export async function lookupPlaceId(
  name: string,
  city: string,
  country: string,
  latitude: number,
  longitude: number,
): Promise<string | undefined> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return undefined;
  }

  try {
    const response = await fetch(PLACES_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id',
      },
      body: JSON.stringify({
        textQuery: `${name}, ${city}, ${country}`,
        maxResultCount: 1,
        locationBias: {
          circle: {
            center: { latitude, longitude },
            radius: 500,
          },
        },
      }),
    });

    if (!response.ok) {
      console.warn(`[places] Text search failed for "${name}": ${response.status}`);
      return undefined;
    }

    const data = (await response.json()) as PlacesSearchResponse;
    return data.places?.[0]?.id;
  } catch (err) {
    console.warn(`[places] Text search threw for "${name}":`, err);
    return undefined;
  }
}

export async function fetchPlaceDetails(placeId: string, language = 'en'): Promise<PlaceDetails | undefined> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return undefined;
  }

  try {
    const response = await fetch(
      `${PLACE_DETAILS_URL}/${encodeURIComponent(placeId)}?languageCode=${encodeURIComponent(language)}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'rating,userRatingCount,currentOpeningHours.weekdayDescriptions,regularOpeningHours.weekdayDescriptions',
        },
      },
    );

    if (!response.ok) {
      console.warn(`[places] Details lookup failed for placeId="${placeId}": ${response.status}`);
      return undefined;
    }

    const data = (await response.json()) as PlaceDetailsResponse;
    const openingHours = data.currentOpeningHours?.weekdayDescriptions ?? data.regularOpeningHours?.weekdayDescriptions;

    return {
      openingHours: openingHours && openingHours.length > 0 ? openingHours : undefined,
      rating: data.rating,
      ratingCount: data.userRatingCount,
    };
  } catch (err) {
    console.warn(`[places] Details lookup threw for placeId="${placeId}":`, err);
    return undefined;
  }
}

export async function enrichStopWithPlaceDetails(
  stop: Stop,
  city: string,
  country: string,
  language = 'en',
): Promise<Stop> {
  const enrichedStop: Stop = { ...stop };

  if (!enrichedStop.googlePlaceId) {
    enrichedStop.googlePlaceId = await lookupPlaceId(
      enrichedStop.name,
      city,
      country,
      enrichedStop.coordinate.latitude,
      enrichedStop.coordinate.longitude,
    );
  }

  if (!enrichedStop.googlePlaceId) {
    return enrichedStop;
  }

  const details = await fetchPlaceDetails(enrichedStop.googlePlaceId, language);
  if (!details) {
    return enrichedStop;
  }

  if (details.openingHours && details.openingHours.length > 0) {
    enrichedStop.openingHours = details.openingHours;
  }

  if (details.rating !== undefined) {
    enrichedStop.rating = details.rating;
  }

  if (details.ratingCount !== undefined) {
    enrichedStop.ratingCount = details.ratingCount;
  }

  return enrichedStop;
}
