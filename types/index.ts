// Trip Types
export interface Trip {
  id: string;
  destination: string;
  hotel: Hotel;
  travelerContext: TravelerContext;
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  placesPerDay?: number; // User preference for daily pace (1-10)
  places: Place[];
  routes: Route[];
  days: Day[];
  createdAt: string;
  updatedAt: string;
}

export interface Hotel {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  placeId?: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export type TravelerTag = 
  | "romantic" 
  | "food-first" 
  | "nightlife" 
  | "chill" 
  | "culture"
  | "adventure"
  | "luxury"
  | "budget"
  | "family-friendly"
  | "educational"
  | "nature";

export interface TravelerContext {
  type: "couple" | "friends" | "family" | "solo";
  tags?: TravelerTag[];
}

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  vibe?: PlaceVibe;
  coordinates?: Coordinates;
  area?: string;
  placeId?: string; // Google Places ID
  confidence: number;
  source: string; // URL or note reference
  confirmed: boolean;
  validated: boolean;
}

export type PlaceCategory = 
  | "food" 
  | "attraction" 
  | "nightlife" 
  | "nature" 
  | "shopping"
  | "entertainment"
  | "wellness"
  | "religious"
  | "museum"
  | "adventure"
  | "beach"
  | "other";
export type PlaceVibe = "romantic" | "party" | "chill" | "cultural";

export interface Route {
  id: string;
  start: Coordinates;
  end: Coordinates;
  startLabel?: string; // Human-readable start location name
  endLabel?: string; // Human-readable end location name
  places: RoutePlace[];
  baseDuration: number; // minutes
  polyline?: string; // Encoded polyline for map visualization
}

export interface RoutePlace {
  placeId: string;
  order: number;
  detourCost: number; // minutes added to route
}

export interface Day {
  id: string;
  date?: string;
  routes: string[]; // Route IDs
  places: string[]; // Place IDs
}

// Inspiration Input Types
export interface InspirationInput {
  type: "instagram" | "youtube" | "google-maps" | "text" | "file";
  content: string;
  url?: string;
}

// AI Extraction Types
export interface ExtractionResult {
  places: ExtractedPlace[];
  confidence: number;
}

export interface ExtractedPlace {
  name: string;
  category: PlaceCategory;
  vibe?: PlaceVibe;
  confidence: number;
  context?: string;
}

