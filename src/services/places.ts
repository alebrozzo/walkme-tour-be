interface PlaceDetailsResult {
  name: string;
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

interface PlaceDetailsResponse {
  result: PlaceDetailsResult;
  status: string;
}

export interface CityInfo {
  name: string;
  country: string;
}

export async function getCityInfo(placeId: string): Promise<CityInfo> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY environment variable is not set');

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'name,address_components');
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(
      `Google Places API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as PlaceDetailsResponse;

  if (data.status !== 'OK') {
    throw new Error(`Google Places API returned status: ${data.status}`);
  }

  const countryComponent = data.result.address_components.find((c) => c.types.includes('country'));
  if (!countryComponent) {
    throw new Error(`Could not determine country for place ID: ${placeId}`);
  }

  return {
    name: data.result.name,
    country: countryComponent.long_name,
  };
}
