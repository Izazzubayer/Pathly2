import type { Coordinates, Place } from "@/types";

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

interface GoogleDirectionsRoute {
  legs: Array<{
    distance: { value: number }; // meters
    duration: { value: number }; // seconds
    steps: Array<{
      start_location: { lat: number; lng: number };
      end_location: { lat: number; lng: number };
      polyline: { points: string };
    }>;
  }>;
  overview_polyline: { points: string };
}

interface PlaceAlongRoute {
  place: Place;
  detourCost: number; // minutes
  distanceFromRoute: number; // meters
  order: number; // position along route
}

/**
 * Calculate route from start to end using Google Directions API (via server-side API route)
 */
export async function calculateRoute(
  start: Coordinates,
  end: Coordinates
): Promise<{
  distance: number; // meters
  duration: number; // seconds
  polyline: string;
  steps: Array<{ start: Coordinates; end: Coordinates }>;
} | null> {
  try {
    console.log(`📍 Calculating route from (${start.lat}, ${start.lng}) to (${end.lat}, ${end.lng})`);
    
    // Call our server-side API route instead of calling Google directly
    const response = await fetch("/api/routes/calculate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ start, end }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ Route calculation failed: ${errorData.error || response.statusText}`);
      
      if (errorData.status === "REQUEST_DENIED") {
        console.error("⚠️ REQUEST_DENIED - Make sure Directions API is enabled in Google Cloud Console");
        console.error("Go to: https://console.cloud.google.com/apis/library/directions-backend.googleapis.com");
      }
      
      return null;
    }

    const data = await response.json();
    console.log("✅ Route calculated successfully");
    
    return {
      distance: data.distance,
      duration: data.duration,
      polyline: data.polyline,
      steps: data.steps,
    };
  } catch (error) {
    console.error("Error calculating route:", error);
    return null;
  }
}

/**
 * Find places along a route and calculate detour costs
 */
export async function findPlacesAlongRoute(
  places: Place[],
  routeStart: Coordinates,
  routeEnd: Coordinates,
  routeSteps?: Array<{ start: Coordinates; end: Coordinates }>
): Promise<PlaceAlongRoute[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    // Fallback: simple distance-based sorting
    return places
      .filter((p) => p.coordinates)
      .map((place, index) => ({
        place,
        detourCost: 5, // Mock
        distanceFromRoute: 0,
        order: index,
      }));
  }

  // Calculate base route if not provided
  let steps = routeSteps;
  if (!steps) {
    const route = await calculateRoute(routeStart, routeEnd);
    if (!route) {
      return [];
    }
    steps = route.steps;
  }

  // Filter places with coordinates
  const placesWithCoords = places.filter(
    (p) => p.coordinates && p.coordinates.lat !== 0 && p.coordinates.lng !== 0
  );

  if (placesWithCoords.length === 0) {
    return [];
  }

  // Calculate distance from each place to the route
  const placesAlongRoute: PlaceAlongRoute[] = [];

  for (const place of placesWithCoords) {
    if (!place.coordinates) continue;

    // Find closest point on route to this place
    let minDistance = Infinity;
    let closestStepIndex = 0;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const distance = distanceToLineSegment(
        place.coordinates,
        step.start,
        step.end
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestStepIndex = i;
      }
    }

    // Calculate detour cost (simplified: based on distance from route)
    // In production, you'd calculate actual detour time
    const detourCost = Math.round((minDistance / 1000) * 2); // ~2 min per km detour

    // Only include places within reasonable distance (e.g., 5km from route)
    if (minDistance < 5000) {
      placesAlongRoute.push({
        place,
        detourCost,
        distanceFromRoute: Math.round(minDistance),
        order: closestStepIndex,
      });
    }
  }

  // Sort by order along route
  placesAlongRoute.sort((a, b) => a.order - b.order);

  return placesAlongRoute;
}

/**
 * Calculate distance from a point to a line segment (Haversine formula)
 */
function distanceToLineSegment(
  point: Coordinates,
  lineStart: Coordinates,
  lineEnd: Coordinates
): number {
  // Calculate distance using Haversine formula
  const R = 6371000; // Earth radius in meters

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const lat1 = toRad(point.lat);
  const lon1 = toRad(point.lng);
  const lat2 = toRad(lineStart.lat);
  const lon2 = toRad(lineStart.lng);
  const lat3 = toRad(lineEnd.lat);
  const lon3 = toRad(lineEnd.lng);

  // Distance from point to line start
  const dLat1 = lat2 - lat1;
  const dLon1 = lon2 - lon1;
  const a1 =
    Math.sin(dLat1 / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon1 / 2) ** 2;
  const c1 = 2 * Math.atan2(Math.sqrt(a1), Math.sqrt(1 - a1));
  const dist1 = R * c1;

  // Distance from point to line end
  const dLat2 = lat3 - lat1;
  const dLon2 = lon3 - lon1;
  const a2 =
    Math.sin(dLat2 / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat3) * Math.sin(dLon2 / 2) ** 2;
  const c2 = 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
  const dist2 = R * c2;

  // Distance from line start to line end
  const dLat3 = lat3 - lat2;
  const dLon3 = lon3 - lon2;
  const a3 =
    Math.sin(dLat3 / 2) ** 2 +
    Math.cos(lat2) * Math.cos(lat3) * Math.sin(dLon3 / 2) ** 2;
  const c3 = 2 * Math.atan2(Math.sqrt(a3), Math.sqrt(1 - a3));
  const dist3 = R * c3;

  // Find closest point on line segment
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.lat - lineStart.lat) * (lineEnd.lat - lineStart.lat) +
        (point.lng - lineStart.lng) * (lineEnd.lng - lineStart.lng)) /
        (dist3 * dist3)
    )
  );

  const closestPoint = {
    lat: lineStart.lat + t * (lineEnd.lat - lineStart.lat),
    lng: lineStart.lng + t * (lineEnd.lng - lineStart.lng),
  };

  // Distance from point to closest point on line
  const dLat = toRad(closestPoint.lat) - lat1;
  const dLon = toRad(closestPoint.lng) - lon1;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(toRad(closestPoint.lat)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Geocode a place name to coordinates
 */
export async function geocodePlaceName(
  placeName: string,
  destination?: string
): Promise<Coordinates | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    return null;
  }

  try {
    const query = destination ? `${placeName}, ${destination}` : placeName;
    const encodedQuery = encodeURIComponent(query);

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedQuery}&key=${GOOGLE_PLACES_API_KEY}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.status === "OK" && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
      };
    }

    return null;
  } catch (error) {
    console.error("Error geocoding place:", error);
    return null;
  }
}

/**
 * Discover new places along a route using Google Places API
 */
export async function discoverPlacesAlongRoute(
  routeStart: Coordinates,
  routeEnd: Coordinates,
  routeSteps: Array<{ start: Coordinates; end: Coordinates }>,
  categories?: string[]
): Promise<Array<{
  name: string;
  placeId: string;
  coordinates: Coordinates;
  types: string[];
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  detourCost: number;
  distanceFromRoute: number;
}>> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.error("Google Places API key not found");
    return [];
  }

  try {
    // Sample points along the route (every ~500m)
    const samplePoints: Coordinates[] = [];
    
    for (const step of routeSteps) {
      samplePoints.push(step.start);
    }
    if (routeSteps.length > 0) {
      samplePoints.push(routeSteps[routeSteps.length - 1].end);
    }

    // Search for places near each sample point
    const allPlaces = new Map<string, any>(); // Use Map to deduplicate by placeId

    for (const point of samplePoints) {
      // Search for different types of places
      const searchTypes = categories || [
        'restaurant',
        'cafe',
        'tourist_attraction',
        'museum',
        'park',
        'shopping_mall',
        'bar',
        'night_club'
      ];

      for (const type of searchTypes) {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${point.lat},${point.lng}&radius=1000&type=${type}&key=${GOOGLE_PLACES_API_KEY}`
        );

        if (!response.ok) continue;

        const data = await response.json();

        if (data.status === "OK" && data.results) {
          for (const place of data.results) {
            if (!allPlaces.has(place.place_id)) {
              allPlaces.set(place.place_id, {
                name: place.name,
                placeId: place.place_id,
                coordinates: {
                  lat: place.geometry.location.lat,
                  lng: place.geometry.location.lng,
                },
                types: place.types || [],
                rating: place.rating,
                userRatingsTotal: place.user_ratings_total,
                priceLevel: place.price_level,
              });
            }
          }
        }

        // Rate limiting - wait a bit between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Calculate detour cost for each place
    const placesWithDetour = [];
    
    for (const place of allPlaces.values()) {
      // Find closest point on route
      let minDistance = Infinity;
      let closestStepIndex = 0;

      for (let i = 0; i < routeSteps.length; i++) {
        const step = routeSteps[i];
        const distance = distanceToLineSegment(
          place.coordinates,
          step.start,
          step.end
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestStepIndex = i;
        }
      }

      // Only include places within 2km of route
      if (minDistance < 2000) {
        const detourCost = Math.round((minDistance / 1000) * 2); // ~2 min per km

        placesWithDetour.push({
          ...place,
          detourCost,
          distanceFromRoute: Math.round(minDistance),
        });
      }
    }

    // Sort by detour cost (closest to route first)
    placesWithDetour.sort((a, b) => a.detourCost - b.detourCost);

    // Return top 20 places
    return placesWithDetour.slice(0, 20);

  } catch (error) {
    console.error("Error discovering places along route:", error);
    return [];
  }
}


