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
}

export interface Tour {
  id: string;
  city: string;
  country: string;
  description: string;
  color: string;
  imageUrl?: string;
  stops: Stop[];
}
