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

    // Fetch place details to get types (no inference, only what Google provides)
    let category = inferCategory(primaryResult.types);
    if (primaryResult.place_id) {
      try {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${primaryResult.place_id}&fields=types,primary_type,category&key=${GOOGLE_PLACES_API_KEY}`;
        const detailsResponse = await fetch(detailsUrl);
        
        if (detailsResponse.ok) {
          const detailsData = await detailsResponse.json();
          if (detailsData.status === "OK" && detailsData.result) {
            const place = detailsData.result;
            
            // Only use category if Google explicitly provides it
            const googleCategory = (place as any).primary_type || (place as any).category;
            if (googleCategory) {
              category = googleCategory;
            } else {
              // Use formatted types (will be empty string if only generic types)
              category = inferCategory(place.types || primaryResult.types);
            }
            
            console.log("📍 Category from Google:", category || "(none)");
          }
        }
      } catch (error) {
        console.error("Error fetching place details:", error);
      }
    }

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

/**
 * Format Google's type for display - NO mapping, NO inference
 * Returns the first meaningful type from Google's types array, formatted for display
 * Returns empty string if only generic types are available
 */
export function inferCategory(types: string[]): string {
  if (!types || types.length === 0) {
    return "";
  }

  // Filter out generic/useless types that don't tell the user anything meaningful
  const genericTypes = ['point_of_interest', 'establishment', 'locality', 'political'];
  const meaningfulTypes = types.filter(type => !genericTypes.includes(type));
  
  // If no meaningful types, return empty string (don't show anything)
  if (meaningfulTypes.length === 0) {
    return "";
  }
  
  const primaryType = meaningfulTypes[0];
  
  // Format for display: replace underscores with spaces, capitalize words
  return primaryType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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
