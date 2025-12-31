import { NextRequest, NextResponse } from "next/server";
import { inferCategory } from "@/lib/places-api";

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { location, radius = 2000, excludePlaceIds = [] } = await request.json();

    if (!location || !location.lat || !location.lng) {
      return NextResponse.json({ error: "Location is required" }, { status: 400 });
    }

    if (!GOOGLE_PLACES_API_KEY) {
      return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 });
    }

    // Use Google Places Nearby Search
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=${radius}&key=${GOOGLE_PLACES_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" || !data.results) {
      return NextResponse.json({ places: [] });
    }

    // Filter out excluded places and format results
    const places = data.results
      .filter((place: any) => !excludePlaceIds.includes(place.place_id))
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
          source: "Google Nearby",
        };
      });

    return NextResponse.json({ places });
  } catch (error) {
    console.error("Error fetching nearby places:", error);
    return NextResponse.json(
      { error: "Failed to fetch nearby places" },
      { status: 500 }
    );
  }
}

