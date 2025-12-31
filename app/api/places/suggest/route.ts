import { NextRequest, NextResponse } from "next/server";

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

// Haversine formula to calculate straight-line distance between two coordinates
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

// Estimate driving time based on distance (rough estimate: 30km/h average in city)
function estimateDrivingTime(distanceMeters: number): number {
  const avgSpeedKmh = 30; // Average city driving speed
  const avgSpeedMs = (avgSpeedKmh * 1000) / 3600; // Convert to m/s
  return Math.round(distanceMeters / avgSpeedMs); // Time in seconds
}

export async function POST(request: NextRequest) {
  try {
    const { coordinates, searchTypes, excludePlaceIds = [], hotelCoordinates } = await request.json();

    console.log('🔍 API Route called with:', { coordinates, searchTypes, excludeCount: excludePlaceIds.length, hasHotel: !!hotelCoordinates });
    
    // Detect preference context from search types
    const isNightlifeContext = searchTypes.filter((t: string) => t === 'night_club' || t === 'bar').length >= 3;
    const isFoodContext = searchTypes.filter((t: string) => t === 'restaurant').length >= 3;
    
    // Use hotel coordinates if provided, otherwise use search coordinates
    const originCoords = hotelCoordinates || coordinates;

    if (!GOOGLE_PLACES_API_KEY) {
      console.error('❌ Google Places API key not configured');
      return NextResponse.json(
        { error: "Google Places API key not configured" },
        { status: 500 }
      );
    }

    if (!coordinates || !coordinates.lat || !coordinates.lng) {
      console.error('❌ Invalid coordinates:', coordinates);
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 }
      );
    }

    const allSuggestions = new Map<string, any>();

    // Prioritize search types - don't shuffle, use order for priority
    // First types in array are higher priority
    const priorityTypes = searchTypes.slice(0, 8); // Search more types for better results
    
    console.log('🎯 Priority search order:', priorityTypes);
    
    // Search for each type in priority order
    for (const searchType of priorityTypes) {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coordinates.lat},${coordinates.lng}&radius=5000&type=${searchType}&key=${GOOGLE_PLACES_API_KEY}`;
      
      console.log(`🔎 Searching for type: ${searchType}`);
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`📊 Google API response for ${searchType}:`, data.status, `(${data.results?.length || 0} results)`);
        
        if (data.status === "OK" && data.results) {
          // For food-related types, prioritize higher ratings
          const minRating = (searchType === 'restaurant' || searchType === 'cafe' || searchType === 'bakery' || searchType === 'food') 
            ? 4.2  // Higher bar for food places
            : 4.0; // Standard for other types
          
          // Filter for highly rated places
          const filtered = data.results
            .filter((place: any) => place.rating && place.rating >= minRating)
            .slice(0, 10); // Get more results for priority types
          
          console.log(`✅ Found ${filtered.length} places (rating >= ${minRating}) for ${searchType}`);
          
          filtered.forEach((place: any) => {
            // Skip if already in suggestions or in exclude list
            if (!allSuggestions.has(place.place_id) && !excludePlaceIds.includes(place.place_id)) {
              // Check place types
              const placeTypes = place.types || [];
              const isFoodPlace = placeTypes.some((t: string) => 
                ['restaurant', 'cafe', 'bakery', 'food', 'meal_takeaway', 'bar'].includes(t)
              );
              const isNightlifePlace = placeTypes.some((t: string) => 
                ['night_club', 'bar'].includes(t)
              );
              const isReligiousPlace = placeTypes.some((t: string) => 
                ['church', 'mosque', 'synagogue', 'hindu_temple', 'place_of_worship'].includes(t)
              );
              
              // FILTER OUT: Religious places if nightlife context
              if (isNightlifeContext && isReligiousPlace) {
                console.log(`⛔ Filtering out religious place for nightlife: ${place.name}`);
                return;
              }
              
              // FILTER OUT: Religious places if food context (unless it's a tourist attraction)
              if (isFoodContext && isReligiousPlace && !placeTypes.includes('tourist_attraction')) {
                console.log(`⛔ Filtering out religious place for food context: ${place.name}`);
                return;
              }
              
              allSuggestions.set(place.place_id, {
                name: place.name,
                placeId: place.place_id,
                coordinates: {
                  lat: place.geometry.location.lat,
                  lng: place.geometry.location.lng,
                },
                types: placeTypes,
                rating: place.rating,
                vicinity: place.vicinity,
                isFoodPlace,
                isNightlifePlace,
              });
            }
          });
        } else if (data.status === "ZERO_RESULTS") {
          console.log(`⚠️ No results for ${searchType}`);
        } else {
          console.error(`❌ Google API error for ${searchType}:`, data.status, data.error_message);
        }
      } else {
        console.error(`❌ HTTP error for ${searchType}:`, response.status);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Sort results based on context
    const allResults = Array.from(allSuggestions.values())
      .sort((a, b) => {
        // Prioritize based on context
        if (isNightlifeContext) {
          // Nightlife places first
          if (a.isNightlifePlace && !b.isNightlifePlace) return -1;
          if (!a.isNightlifePlace && b.isNightlifePlace) return 1;
        } else if (isFoodContext) {
          // Food places first
          if (a.isFoodPlace && !b.isFoodPlace) return -1;
          if (!a.isFoodPlace && b.isFoodPlace) return 1;
        }
        // Then sort by rating
        return (b.rating || 0) - (a.rating || 0);
      });
    
    // Take top results (6 places max for better UX)
    let suggestions = allResults.slice(0, 6);
    
    // Calculate distance and duration from hotel if provided
    if (originCoords && originCoords.lat !== 0 && originCoords.lng !== 0 && originCoords.lat && originCoords.lng) {
      console.log('📍 Calculating distances from hotel:', originCoords);
      console.log(`📍 Number of suggestions to calculate: ${suggestions.length}`);
      
      // Use Distance Matrix API for batch calculation (max 25 destinations per request)
      const batchSize = 25;
      const batches = [];
      for (let i = 0; i < suggestions.length; i += batchSize) {
        batches.push(suggestions.slice(i, i + batchSize));
      }
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const destinations = batch.map(s => `${s.coordinates.lat},${s.coordinates.lng}`).join('|');
        const distanceMatrixUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originCoords.lat},${originCoords.lng}&destinations=${destinations}&mode=driving&key=${GOOGLE_PLACES_API_KEY}`;
        
        try {
          console.log(`📍 Fetching distance matrix for batch ${batchIndex + 1}/${batches.length}...`);
          const distanceResponse = await fetch(distanceMatrixUrl);
          
          if (distanceResponse.ok) {
            const distanceData = await distanceResponse.json();
            console.log('📍 Distance Matrix API response:', distanceData.status);
            
            if (distanceData.status === 'OK' && distanceData.rows?.[0]?.elements) {
              const startIndex = batchIndex * batchSize;
              batch.forEach((place, batchPlaceIndex) => {
                const globalIndex = startIndex + batchPlaceIndex;
                const element = distanceData.rows[0].elements[batchPlaceIndex];
                
                if (element && element.status === 'OK') {
                  suggestions[globalIndex] = {
                    ...suggestions[globalIndex],
                    distance: element.distance?.value || null, // meters
                    duration: element.duration?.value || null, // seconds
                  };
                  console.log(`📍 ${place.name}: ${element.distance?.text} (${element.duration?.text})`);
                } else {
                  console.log(`⚠️ No distance data for ${place.name}: ${element?.status}`);
                }
              });
            } else {
              console.error('⚠️ Distance Matrix API error:', distanceData.status, distanceData.error_message);
            }
          } else {
            console.error(`⚠️ Distance Matrix HTTP error: ${distanceResponse.status}`);
          }
        } catch (error) {
          console.error('⚠️ Error calculating distances:', error);
          // Continue without distance data
        }
        
        // Small delay between batches to avoid rate limiting
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      const placesWithDistance = suggestions.filter(s => s.distance).length;
      console.log(`✅ Calculated distances for ${placesWithDistance}/${suggestions.length} places`);
      
      // Fallback: Calculate straight-line distance for places without Distance Matrix data
      suggestions = suggestions.map((place) => {
        if (!place.distance && place.coordinates) {
          const straightLineDistance = calculateHaversineDistance(
            originCoords.lat,
            originCoords.lng,
            place.coordinates.lat,
            place.coordinates.lng
          );
          const estimatedTime = estimateDrivingTime(straightLineDistance);
          
          console.log(`📍 Fallback calculation for ${place.name}: ${(straightLineDistance / 1000).toFixed(1)}km`);
          
          return {
            ...place,
            distance: straightLineDistance,
            duration: estimatedTime,
          };
        }
        return place;
      });
    } else {
      console.log('⚠️ No valid hotel coordinates provided for distance calculation');
    }
    
    console.log(`🎯 Context: ${isNightlifeContext ? 'Nightlife' : isFoodContext ? 'Food' : 'General'}`);
    console.log(`📊 Results: ${suggestions.filter(s => s.isNightlifePlace).length} nightlife, ${suggestions.filter(s => s.isFoodPlace).length} food places`);

    console.log(`✅ Returning ${suggestions.length} total suggestions`);

    return NextResponse.json({ suggestions });

  } catch (error) {
    console.error("❌ Error suggesting places:", error);
    return NextResponse.json(
      { error: `Failed to suggest places: ${error}` },
      { status: 500 }
    );
  }
}

