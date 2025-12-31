import { NextRequest, NextResponse } from "next/server";
import { inferCategory } from "@/lib/places-api";

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { start, end, excludePlaceIds = [] } = await request.json();

    if (!start || !start.lat || !start.lng || !end || !end.lat || !end.lng) {
      return NextResponse.json({ error: "Start and end locations are required" }, { status: 400 });
    }

    if (!GOOGLE_PLACES_API_KEY) {
      return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 });
    }

    // Calculate midpoint of the route
    const midLat = (start.lat + end.lat) / 2;
    const midLng = (start.lng + end.lng) / 2;
    
    // Calculate distance between start and end (rough estimation)
    const R = 6371000; // Earth radius in meters
    const dLat = ((end.lat - start.lat) * Math.PI) / 180;
    const dLon = ((end.lng - start.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((start.lat * Math.PI) / 180) *
        Math.cos((end.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    // Use half the distance as search radius (but cap at 5km)
    const searchRadius = Math.min(distance / 2, 5000);

    // Search for places near the midpoint of the route
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${midLat},${midLng}&radius=${searchRadius}&key=${GOOGLE_PLACES_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" || !data.results) {
      return NextResponse.json({ places: [] });
    }

    // Filter places to only include those reasonably along the route
    // (within 2km of the line between start and end)
    const placesAlongRoute = data.results
      .filter((place: any) => {
        if (excludePlaceIds.includes(place.place_id)) return false;
        
        const placeLat = place.geometry.location.lat;
        const placeLng = place.geometry.location.lng;
        
        // Calculate distance from place to the line segment (start to end)
        const distanceToLine = pointToLineDistance(
          { lat: placeLat, lng: placeLng },
          start,
          end
        );
        
        // Only include places within 2km of the route line
        return distanceToLine <= 2000;
      })
      .slice(0, 3) // Limit to 3 recommendations
      .map((place: any) => {
        const category = inferCategory(place.types || []);
        
        return {
          id: `nearby_${place.place_id}`,
          name: place.name,
          placeId: place.place_id,
          category: category || "other",
          types: place.types || [],
          coordinates: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
          },
          rating: place.rating,
          confirmed: false,
          validated: true,
          confidence: 1.0,
          source: "Google Along Route",
        };
      });

    return NextResponse.json({ places: placesAlongRoute });
  } catch (error) {
    console.error("Error fetching places along route:", error);
    return NextResponse.json(
      { error: "Failed to fetch places along route" },
      { status: 500 }
    );
  }
}

// Calculate perpendicular distance from a point to a line segment
function pointToLineDistance(
  point: { lat: number; lng: number },
  lineStart: { lat: number; lng: number },
  lineEnd: { lat: number; lng: number }
): number {
  const R = 6371000; // Earth radius in meters
  
  // Convert to radians
  const lat1 = (lineStart.lat * Math.PI) / 180;
  const lng1 = (lineStart.lng * Math.PI) / 180;
  const lat2 = (lineEnd.lat * Math.PI) / 180;
  const lng2 = (lineEnd.lng * Math.PI) / 180;
  const latP = (point.lat * Math.PI) / 180;
  const lngP = (point.lng * Math.PI) / 180;
  
  // Calculate distances
  const d13 = Math.acos(
    Math.sin(lat1) * Math.sin(latP) +
    Math.cos(lat1) * Math.cos(latP) * Math.cos(lngP - lng1)
  ) * R;
  
  const d23 = Math.acos(
    Math.sin(lat2) * Math.sin(latP) +
    Math.cos(lat2) * Math.cos(latP) * Math.cos(lngP - lng2)
  ) * R;
  
  const d12 = Math.acos(
    Math.sin(lat1) * Math.sin(lat2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1)
  ) * R;
  
  // Use the cross-track distance formula
  const bearing13 = Math.atan2(
    Math.sin(lngP - lng1) * Math.cos(latP),
    Math.cos(lat1) * Math.sin(latP) - Math.sin(lat1) * Math.cos(latP) * Math.cos(lngP - lng1)
  );
  
  const bearing12 = Math.atan2(
    Math.sin(lng2 - lng1) * Math.cos(lat2),
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1)
  );
  
  const crossTrackDistance = Math.abs(Math.asin(Math.sin(d13 / R) * Math.sin(bearing13 - bearing12)) * R);
  
  return crossTrackDistance;
}

