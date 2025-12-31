import { NextRequest, NextResponse } from "next/server";

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

interface AIRecommendation {
  name: string;
  reasoning: string;
  category: string;
  estimatedRating: number;
  sources: string[];
}

interface PlaceSuggestion {
  placeId: string;
  name: string;
  vicinity?: string;
  rating?: number;
  types?: string[];
  category?: string; // Google's actual category (what Maps shows)
  coordinates: { lat: number; lng: number };
  distance?: number;
  duration?: number;
  aiReasoning?: string;
  sources?: string[];
}

// Haversine formula to calculate straight-line distance
function haversineDistance(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLon = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Estimate duration based on distance
function estimateDuration(distanceMeters: number): number {
  const avgSpeedKmh = 30;
  const avgSpeedMs = (avgSpeedKmh * 1000) / 3600;
  return Math.round(distanceMeters / avgSpeedMs);
}

/**
 * Validate and enrich AI recommendations with Google Places data
 */
async function validateWithGooglePlaces(
  recommendations: AIRecommendation[],
  destination: string,
  hotelCoordinates?: { lat: number; lng: number }
): Promise<PlaceSuggestion[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.error("❌ Google Places API key not configured");
    return [];
  }

  const validatedPlaces: PlaceSuggestion[] = [];

  console.log(`\n🔍 Validating ${recommendations.length} AI recommendations with Google Places...`);

  for (const rec of recommendations) {
    try {
      // Search for the place by name in the destination
      const searchQuery = `${rec.name} ${destination}`;
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${GOOGLE_PLACES_API_KEY}`;

      console.log(`   Searching: "${searchQuery}"`);

      const response = await fetch(searchUrl);
      const data = await response.json();

      if (data.status === "OK" && data.results && data.results.length > 0) {
        const place = data.results[0]; // Take the first (most relevant) result
        const placeId = place.place_id;

        // Fetch Place Details for accurate types (Text Search returns generic types)
        console.log(`   🔍 Fetching Place Details for accurate categorization...`);
        console.log(`   📋 Text Search returned types:`, place.types);
        let placeTypes = place.types || [];
        
        try {
          // Fetch types ONLY - NO manual categorization
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=types&key=${GOOGLE_PLACES_API_KEY}`;
          const detailsResponse = await fetch(detailsUrl);
          const detailsData = await detailsResponse.json();
          
          if (detailsData.status === "OK" && detailsData.result?.types) {
            placeTypes = detailsData.result.types;
            console.log(`   ✅ Got specific types from Place Details:`, placeTypes);
          } else {
            console.warn(`   ⚠️ Place Details failed (status: ${detailsData.status}), using Text Search types:`, placeTypes);
            console.warn(`   ⚠️ This may result in incorrect categorization!`);
          }
        } catch (error) {
          console.error(`   ❌ Place Details API error:`, error);
          console.warn(`   ⚠️ Falling back to Text Search types:`, placeTypes);
          console.warn(`   ⚠️ This may result in incorrect categorization!`);
        }

        // Calculate distance and duration if hotel coordinates provided
        let distance: number | undefined;
        let duration: number | undefined;

        if (hotelCoordinates && place.geometry?.location) {
          const placeCoords = {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
          };

          // Try Distance Matrix API first (REAL Google Maps data)
          try {
            const distanceMatrixUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${hotelCoordinates.lat},${hotelCoordinates.lng}&destinations=${placeCoords.lat},${placeCoords.lng}&mode=driving&key=${GOOGLE_PLACES_API_KEY}`;
            
            console.log(`   📍 Fetching real distance from Google Maps for ${place.name}...`);
            const dmResponse = await fetch(distanceMatrixUrl);
            const dmData = await dmResponse.json();

            console.log(`   📍 Distance Matrix status: ${dmData.status}`);
            
            if (dmData.status === "OK" && dmData.rows?.[0]?.elements?.[0]?.status === "OK") {
              distance = dmData.rows[0].elements[0].distance?.value;
              duration = dmData.rows[0].elements[0].duration?.value;
              console.log(`   ✅ Real Google Maps data: ${(distance/1000).toFixed(1)}km, ${Math.round(duration/60)} min`);
            } else {
              console.warn(`   ⚠️ Distance Matrix failed: ${dmData.status}, element status: ${dmData.rows?.[0]?.elements?.[0]?.status}`);
              console.warn(`   Error message: ${dmData.error_message || 'No error message'}`);
            }
          } catch (error) {
            console.error(`   ❌ Distance Matrix API error:`, error);
          }

          // Fallback to Haversine if Distance Matrix failed
          if (!distance) {
            console.warn(`   ⚠️ Using fallback Haversine calculation (straight-line estimate)`);
            distance = haversineDistance(hotelCoordinates, placeCoords);
            duration = estimateDuration(distance);
          }
        }

        // Check if Google provides a specific category field (primary_type or category)
        // Only use it if Google explicitly provides it - no inference
        let googleCategory = null;
        try {
          const categoryUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=primary_type,category&key=${GOOGLE_PLACES_API_KEY}`;
          const categoryResponse = await fetch(categoryUrl);
          const categoryData = await categoryResponse.json();
          if (categoryData.status === "OK" && categoryData.result) {
            const placeDetails = categoryData.result;
            googleCategory = (placeDetails as any).primary_type || (placeDetails as any).category || null;
          }
        } catch (error) {
          console.warn(`   ⚠️ Could not fetch category:`, error);
        }

        validatedPlaces.push({
          placeId: placeId,
          name: place.name,
          vicinity: place.formatted_address || place.vicinity,
          rating: place.rating,
          types: placeTypes, // Use types from Place Details API
          category: googleCategory, // Use Google's actual category if available
          coordinates: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
          },
          distance,
          duration,
          aiReasoning: rec.reasoning,
          sources: rec.sources,
        });

        console.log(`   ✅ Found: ${place.name} (${place.rating || "N/A"}⭐) - Types:`, placeTypes);
      } else {
        console.warn(`   ⚠️ Not found: ${rec.name}`);
      }
    } catch (error) {
      console.error(`   ❌ Error validating ${rec.name}:`, error);
    }
  }

  console.log(`✅ Validated ${validatedPlaces.length}/${recommendations.length} places\n`);

  return validatedPlaces;
}

/**
 * Main API route - AI-powered suggestions
 */
export async function POST(request: NextRequest) {
  try {
    const { destination, travelerType, preferences, hotelCoordinates, excludePlaceIds = [], numberOfSuggestions = 6 } = await request.json();

    console.log("\n🚀 AI-Powered Suggestions Request:");
    console.log(`   Destination: ${destination}`);
    console.log(`   Traveler: ${travelerType}`);
    console.log(`   Preferences: ${preferences?.join(", ") || "none"}`);
    console.log(`   Exclude: ${excludePlaceIds.length} places`);
    console.log(`   Number of suggestions requested: ${numberOfSuggestions}`);

    if (!destination) {
      return NextResponse.json(
        { error: "Destination is required" },
        { status: 400 }
      );
    }

    // Step 1: Get AI recommendations
    console.log("\n📡 Calling AI recommendations API...");
    const aiResponse = await fetch(`${request.nextUrl.origin}/api/ai-recommendations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        destination,
        travelerType: travelerType || "solo",
        preferences: preferences || [],
        numberOfRecommendations: numberOfSuggestions, // Pass the requested number
      }),
    });

    if (!aiResponse.ok) {
      console.error("❌ AI recommendations failed");
      return NextResponse.json(
        { error: "Failed to get AI recommendations" },
        { status: 500 }
      );
    }

    const aiData = await aiResponse.json();
    const recommendations: AIRecommendation[] = aiData.recommendations || [];

    console.log(`✅ Received ${recommendations.length} AI recommendations`);

    if (recommendations.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    // Step 2: Validate with Google Places and enrich with data
    const validatedPlaces = await validateWithGooglePlaces(
      recommendations,
      destination,
      hotelCoordinates
    );

    // Step 3: Filter out excluded places
    const filteredPlaces = validatedPlaces.filter(
      (place) => !excludePlaceIds.includes(place.placeId)
    );

    // Step 4: Sort by distance (if available) and limit to requested number
    const sortedPlaces = filteredPlaces
      .sort((a, b) => {
        if (a.distance && b.distance) return a.distance - b.distance;
        if (a.rating && b.rating) return b.rating - a.rating;
        return 0;
      })
      .slice(0, numberOfSuggestions);

    console.log(`\n✅ Returning ${sortedPlaces.length} AI-powered suggestions\n`);

    return NextResponse.json({
      suggestions: sortedPlaces,
      aiPowered: true,
      searchQueries: aiData.searchQueries,
      totalSources: aiData.totalSources,
    });

  } catch (error) {
    console.error("❌ Error in AI suggestions:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestions", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

