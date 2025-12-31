import { NextRequest, NextResponse } from "next/server";

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  if (!GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 });
  }

  try {
    console.log(`🔍 Searching for: "${query}" at ${lat},${lng}`);
    
    // Build search URL with location bias if provided
    let searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}`;
    
    if (lat && lng) {
      searchUrl += `&location=${lat},${lng}&radius=500`;
    }
    
    searchUrl += `&key=${GOOGLE_PLACES_API_KEY}`;
    
    console.log(`🌐 Calling Google Places API...`);
    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      console.error(`❌ HTTP error: ${searchResponse.status}`);
      throw new Error(`Places API error: ${searchResponse.statusText}`);
    }
    
    const searchData = await searchResponse.json();
    console.log(`📊 Search status: ${searchData.status}, Results: ${searchData.results?.length || 0}`);
    
    if (searchData.status !== "OK") {
      console.error(`❌ Google Places status: ${searchData.status}`, searchData.error_message);
      return NextResponse.json({ 
        error: "Place not found", 
        details: searchData.error_message || searchData.status 
      }, { status: 404 });
    }
    
    if (!searchData.results || searchData.results.length === 0) {
      console.log(`❌ No results found for "${query}"`);
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }
    
    const foundPlace = searchData.results[0];
    console.log(`✅ Found place: ${foundPlace.name} (${foundPlace.place_id})`);
    
    // Now fetch full details using the found placeId
    // Use specific fields instead of * (Google doesn't allow wildcard)
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
    
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${foundPlace.place_id}&fields=${fields}&key=${GOOGLE_PLACES_API_KEY}`;
    console.log(`📍 Fetching details for placeId: ${foundPlace.place_id}`);
    const detailsResponse = await fetch(detailsUrl);
    
    if (!detailsResponse.ok) {
      console.error(`❌ Details fetch HTTP error: ${detailsResponse.status}`);
      throw new Error(`Places API error: ${detailsResponse.statusText}`);
    }
    
    const detailsData = await detailsResponse.json();
    console.log(`📊 Details status: ${detailsData.status}`);
    
    if (detailsData.status !== "OK" || !detailsData.result) {
      console.error(`❌ Details not OK: ${detailsData.status}`, detailsData.error_message);
      return NextResponse.json({ 
        error: "Place details not found",
        details: detailsData.error_message || detailsData.status
      }, { status: 404 });
    }
    
    const place = detailsData.result;
    console.log(`✅ Got full details for: ${place.name}`);
    
    // Get photo URLs (all available photos - Google typically returns up to 10)
    const photos = place.photos?.map((photo: any) => {
      return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`;
    }) || [];
    
    const result = {
      placeId: foundPlace.place_id,
      name: place.name,
      address: place.formatted_address,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      photos,
      types: place.types || [],
      website: place.website,
      phone: place.international_phone_number,
      openingHours: place.opening_hours?.weekday_text || [],
      priceLevel: place.price_level,
      reviews: place.reviews?.slice(0, 3) || [],
    };
    
    console.log(`✅ Returning details:`, { 
      name: result.name, 
      hasPhotos: photos.length > 0,
      hasAddress: !!result.address,
      hasRating: !!result.rating 
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Error searching for place:", error);
    return NextResponse.json(
      { error: "Failed to search for place", details: String(error) },
      { status: 500 }
    );
  }
}

