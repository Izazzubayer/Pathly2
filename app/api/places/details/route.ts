import { NextRequest, NextResponse } from "next/server";

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const placeId = searchParams.get("placeId");

  if (!placeId) {
    return NextResponse.json({ error: "placeId is required" }, { status: 400 });
  }

  if (!GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 });
  }

  try {
    // Fetch specific fields (Google doesn't allow wildcard *)
    const fields = [
      'name',
      'formatted_address',
      'rating',
      'user_ratings_total',
      'photos',
      'types',
      'website',
      'international_phone_number',
      'opening_hours',
      'price_level',
      'reviews',
      'place_id'
    ].join(',');

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_PLACES_API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Places API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== "OK" || !data.result) {
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }

    const place = data.result;

    // Get photo URLs (all available photos - Google typically returns up to 10)
    const photos = place.photos?.map((photo: any) => {
      // Get maxwidth 800px photo
      return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`;
    }) || [];

    // Only use what Google provides - no inference
    // Check for primary_type or category fields (if Google adds them in future)
    const category = (place as any).primary_type || (place as any).category || null;
    
    console.log("🏷️ Types from Google:", place.types);
    console.log("🏷️ Category from Google:", category);
    
    return NextResponse.json({
      name: place.name,
      address: place.formatted_address,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      photos,
      types: place.types || [],
      category: category, // Return category if Google provides it
      website: place.website,
      phone: place.international_phone_number,
      openingHours: place.opening_hours?.weekday_text || [],
      priceLevel: place.price_level,
      reviews: place.reviews?.slice(0, 3) || [], // First 3 reviews
    });
  } catch (error) {
    console.error("Error fetching place details:", error);
    return NextResponse.json(
      { error: "Failed to fetch place details" },
      { status: 500 }
    );
  }
}

