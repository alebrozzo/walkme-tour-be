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

export type StopBadge = 'must-see' | 'photo-spot' | 'family-friendly' | 'historic' | 'indoor' | 'outdoor' | 'free';

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

export const STOP_BADGES: StopBadge[] = [
  'must-see',
  'photo-spot',
  'family-friendly',
  'historic',
  'indoor',
  'outdoor',
  'free',
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
  openingHours?: string[];
  rating?: number;
  ratingCount?: number;
  highlights?: string[];
  knownFor?: string;
  badges?: StopBadge[];
}

export interface Tour {
  id: string;
  placeId: string;
  city: string;
  country: string;
  language: string;
  description: string;
  color: string;
  imageUrl?: string;
  stops: Stop[];
}
