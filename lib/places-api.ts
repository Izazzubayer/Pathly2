import type { Place, Coordinates } from "@/types";

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  rating?: number;
}

export async function validatePlace(
  placeName: string,
  destination?: string
): Promise<{
  validated: boolean;
  coordinates?: Coordinates;
  placeId?: string;
  address?: string;
  area?: string;
  category?: string;
  confidence: number;
  alternatives?: Array<{ name: string; address: string; placeId: string }>;
}> {
  if (!GOOGLE_PLACES_API_KEY) {
    return {
      validated: false,
      confidence: 0,
    };
  }

  try {
    // Build search query (include destination for better results)
    const query = destination ? `${placeName}, ${destination}` : placeName;
    const encodedQuery = encodeURIComponent(query);

    // Use Places API Text Search
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodedQuery}&key=${GOOGLE_PLACES_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Places API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status === "ZERO_RESULTS") {
      return {
        validated: false,
        confidence: 0,
        alternatives: [],
      };
    }

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      return {
        validated: false,
        confidence: 0,
      };
    }

    const results = data.results as GooglePlaceResult[];
    const primaryResult = results[0];

    // Calculate confidence based on name match and result quality
    const nameMatch = primaryResult.name
      .toLowerCase()
      .includes(placeName.toLowerCase()) ||
      placeName.toLowerCase().includes(primaryResult.name.toLowerCase());
    const confidence = nameMatch ? 0.9 : 0.7;

    // Extract area from address (simplified - could be improved)
    const addressParts = primaryResult.formatted_address.split(",");
    const area = addressParts.length > 1 ? addressParts[addressParts.length - 2].trim() : undefined;

    // Determine category from place types
    const category = inferCategory(primaryResult.types);

    // Get alternatives if multiple results
    const alternatives =
      results.length > 1
        ? results.slice(1, 4).map((r) => ({
            name: r.name,
            address: r.formatted_address,
            placeId: r.place_id,
          }))
        : undefined;

    return {
      validated: true,
      coordinates: {
        lat: primaryResult.geometry.location.lat,
        lng: primaryResult.geometry.location.lng,
      },
      placeId: primaryResult.place_id,
      address: primaryResult.formatted_address,
      area,
      category,
      confidence,
      alternatives,
    };
  } catch (error) {
    console.error("Error validating place:", error);
    return {
      validated: false,
      confidence: 0,
    };
  }
}

export function inferCategory(types: string[]): string {
  // Map Google Places types to our categories
  const typeMap: Record<string, string> = {
    // Food & Dining
    restaurant: "food",
    food: "food",
    cafe: "food",
    bakery: "food",
    meal_takeaway: "food",
    meal_delivery: "food",
    
    // Nightlife
    bar: "nightlife",
    night_club: "nightlife",
    
    // Nature
    park: "nature",
    zoo: "nature",
    aquarium: "nature",
    natural_feature: "nature",
    
    // Shopping
    shopping_mall: "shopping",
    department_store: "shopping",
    store: "shopping",
    clothing_store: "shopping",
    jewelry_store: "shopping",
    shoe_store: "shopping",
    
    // Entertainment
    movie_theater: "entertainment",
    amusement_park: "entertainment",
    bowling_alley: "entertainment",
    casino: "entertainment",
    
    // Museum & Culture
    museum: "museum",
    art_gallery: "museum",
    
    // Attractions
    tourist_attraction: "attraction",
    point_of_interest: "attraction",
    landmark: "attraction",
    
    // Religious
    church: "religious",
    mosque: "religious",
    synagogue: "religious",
    hindu_temple: "religious",
    place_of_worship: "religious",
    
    // Wellness
    spa: "wellness",
    beauty_salon: "wellness",
    gym: "wellness",
    
    // Beach
    beach: "beach",
    
    // Adventure
    campground: "adventure",
    rv_park: "adventure",
  };

  for (const type of types) {
    if (typeMap[type]) {
      return typeMap[type];
    }
  }

  return "other";
}

export async function geocodePlace(placeId: string): Promise<Coordinates | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_PLACES_API_KEY}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.status === "OK" && data.result?.geometry?.location) {
      return {
        lat: data.result.geometry.location.lat,
        lng: data.result.geometry.location.lng,
      };
    }

    return null;
  } catch (error) {
    console.error("Error geocoding place:", error);
    return null;
  }
}

