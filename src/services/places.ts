const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

interface PlacesSearchResponse {
  places?: Array<{ id: string }>;
}

/**
 * Looks up a Google Maps Place ID for a given stop name biased to the supplied coordinates.
 * Returns undefined if the lookup fails or returns no results.
 */
export async function lookupPlaceId(name: string, latitude: number, longitude: number): Promise<string | undefined> {
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
        textQuery: name,
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
