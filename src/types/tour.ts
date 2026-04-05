export type StopType =
  | 'landmark'
  | 'museum'
  | 'neighborhood'
  | 'temple'
  | 'shrine'
  | 'park'
  | 'piazza'
  | 'market'
  | 'beach';

export const STOP_TYPES: StopType[] = [
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

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Stop {
  id: string;
  order: number;
  name: string;
  address: string;
  coordinate: Coordinate;
  type: StopType;
  imageUrl?: string;
  description: string;
  duration: number;
  price?: string;
  googlePlaceId?: string;
  relevance: 1 | 2 | 3;
}

export interface Tour {
  id: string;
  placeId: string;
  city: string;
  country: string;
  language: string;
  description: string;
  imageUrl?: string;
  stops: Stop[];
}
