import { Trip, Hotel, TravelerContext, Coordinates } from "@/types";

export function createTripId(): string {
  return `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createEmptyTrip(
  destination: string,
  hotelInput: string | { name: string; address: string; placeId?: string; coordinates?: { lat: number; lng: number } },
  travelerContext: TravelerContext,
  startDate?: string,
  endDate?: string,
  placesPerDay?: number
): Trip {
  const now = new Date().toISOString();
  
  // Create hotel from input (either string or object with coordinates)
  let hotel: Hotel;
  
  if (typeof hotelInput === "string") {
    // Fallback: just a name/address string (no coordinates yet)
    hotel = {
      id: `hotel_${Date.now()}`,
      name: hotelInput,
      address: hotelInput,
      coordinates: { lat: 0, lng: 0 }, // Will be geocoded later
    };
  } else {
    // Hotel data with coordinates from Places API
    hotel = {
      id: `hotel_${Date.now()}`,
      name: hotelInput.name,
      address: hotelInput.address,
      coordinates: hotelInput.coordinates || { lat: 0, lng: 0 },
      placeId: hotelInput.placeId,
    };
  }

  return {
    id: createTripId(),
    destination,
    hotel,
    travelerContext,
    startDate,
    endDate,
    placesPerDay,
    places: [],
    routes: [],
    days: [],
    createdAt: now,
    updatedAt: now,
  };
}

