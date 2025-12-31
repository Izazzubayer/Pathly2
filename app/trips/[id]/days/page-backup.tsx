"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTripById, updateTrip } from "@/lib/storage";
import { inferCategory } from "@/lib/places-api";
import { ArrowLeft, ArrowRight, Plus, Calendar, Hotel, MapPin, Clock, Search, X, Loader2, ChevronDown, ChevronUp, Utensils, Coffee, ShoppingBag, Landmark, Moon, Trees, Theater, Sparkles, Church, Building2, Mountain, Waves, type LucideIcon } from "lucide-react";
import { getCategoryIcon, getCategoryLabel } from "@/lib/category-utils";
import { PlacesAutocomplete } from "@/components/places-autocomplete";
import type { Trip, Day, Place, Coordinates } from "@/types";

// Map Google category strings to appropriate icons
function getIconForGoogleCategory(category: string): LucideIcon {
  const lowerCategory = category.toLowerCase();
  
  // Food & Dining
  if (lowerCategory.includes('restaurant') || lowerCategory.includes('food') || 
      lowerCategory.includes('dining') || lowerCategory.includes('meal') ||
      lowerCategory.includes('cafe') || lowerCategory.includes('coffee') ||
      lowerCategory.includes('bakery') || lowerCategory.includes('bar') ||
      lowerCategory.includes('bistro') || lowerCategory.includes('eatery')) {
    if (lowerCategory.includes('coffee') || lowerCategory.includes('cafe')) {
      return Coffee;
    }
    return Utensils;
  }
  
  // Shopping
  if (lowerCategory.includes('shop') || lowerCategory.includes('store') || 
      lowerCategory.includes('mall') || lowerCategory.includes('market') ||
      lowerCategory.includes('boutique')) {
    return ShoppingBag;
  }
  
  // Attractions & Landmarks
  if (lowerCategory.includes('attraction') || lowerCategory.includes('landmark') ||
      lowerCategory.includes('monument') || lowerCategory.includes('tower')) {
    return Landmark;
  }
  
  // Nightlife
  if (lowerCategory.includes('nightclub') || lowerCategory.includes('club') ||
      lowerCategory.includes('bar') || lowerCategory.includes('pub') ||
      lowerCategory.includes('lounge')) {
    return Moon;
  }
  
  // Nature & Parks
  if (lowerCategory.includes('park') || lowerCategory.includes('garden') ||
      lowerCategory.includes('nature') || lowerCategory.includes('forest') ||
      lowerCategory.includes('trail')) {
    return Trees;
  }
  
  // Entertainment
  if (lowerCategory.includes('theater') || lowerCategory.includes('cinema') ||
      lowerCategory.includes('movie') || lowerCategory.includes('entertainment') ||
      lowerCategory.includes('stadium') || lowerCategory.includes('arena')) {
    return Theater;
  }
  
  // Wellness & Spa
  if (lowerCategory.includes('spa') || lowerCategory.includes('wellness') ||
      lowerCategory.includes('gym') || lowerCategory.includes('fitness') ||
      lowerCategory.includes('yoga')) {
    return Sparkles;
  }
  
  // Religious
  if (lowerCategory.includes('temple') || lowerCategory.includes('church') ||
      lowerCategory.includes('mosque') || lowerCategory.includes('synagogue') ||
      lowerCategory.includes('shrine') || lowerCategory.includes('cathedral')) {
    return Church;
  }
  
  // Museums
  if (lowerCategory.includes('museum') || lowerCategory.includes('gallery') ||
      lowerCategory.includes('exhibition')) {
    return Building2;
  }
  
  // Adventure & Outdoor
  if (lowerCategory.includes('adventure') || lowerCategory.includes('hiking') ||
      lowerCategory.includes('mountain') || lowerCategory.includes('climbing')) {
    return Mountain;
  }
  
  // Beach & Water
  if (lowerCategory.includes('beach') || lowerCategory.includes('waterfront') ||
      lowerCategory.includes('marina') || lowerCategory.includes('harbor')) {
    return Waves;
  }
  
  // Default fallback
  return MapPin;
}

function PlaceItem({
  place,
  index,
  totalPlaces,
  previousPlaceCoords,
  previousPlaceName,
  hotelCoords,
  hotelName,
  onRemove,
  distanceWarning,
}: {
  place: Place;
  index: number;
  totalPlaces: number;
  previousPlaceCoords?: Coordinates;
  previousPlaceName?: string;
  hotelCoords: Coordinates;
  hotelName: string;
  onRemove: (placeId: string) => void;
  distanceWarning?: { distance: number; time: string };
}) {
  const [activities, setActivities] = useState<string[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  const isLast = index === totalPlaces - 1;

  // Calculate distance and time from previous place (or hotel if first)
  useEffect(() => {
    if (!place.coordinates || place.coordinates.lat === 0 || place.coordinates.lng === 0) {
      return;
    }

    const fromCoords = previousPlaceCoords || hotelCoords;
    if (!fromCoords || fromCoords.lat === 0 || fromCoords.lng === 0) {
      return;
    }

    setLoadingRoute(true);
    fetch("/api/routes/calculate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        start: fromCoords,
        end: place.coordinates,
      }),
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        return null;
      })
      .then((data) => {
        if (data) {
          setDistance(data.distance); // meters
          setDuration(data.duration); // seconds
        }
      })
      .catch((error) => {
        console.error("Error calculating route:", error);
      })
      .finally(() => {
        setLoadingRoute(false);
      });
  }, [place.coordinates, previousPlaceCoords, hotelCoords]);

  // Automatically fetch activities when component mounts (if place has placeId)
  useEffect(() => {
    if (place.placeId && activities.length === 0 && !loadingActivities) {
      setLoadingActivities(true);
      fetch(
        `/api/places/activities?placeId=${place.placeId}&placeName=${encodeURIComponent(place.name)}&category=${place.category}`
      )
        .then((response) => {
          if (response.ok) {
            return response.json();
          }
          return { activities: [] };
        })
        .then((data) => {
          setActivities(data.activities || []);
        })
        .catch((error) => {
          console.error("Error fetching activities:", error);
        })
        .finally(() => {
          setLoadingActivities(false);
        });
    }
  }, [place.placeId, place.name, place.category]);

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="relative flex gap-4 pb-8">
      <div className="relative flex flex-col items-center w-10 flex-shrink-0">
        <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-accent text-accent-foreground border-2 border-border">
          <span className="text-sm font-semibold">{index + 1}</span>
        </div>
        {/* Timeline connector - always show line to connect to next item or Add Place section */}
        <div className="absolute top-12 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-border" />
      </div>
      <div className="flex-1">
        <Card className="hover:border-primary/30 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <h4 className="text-base font-semibold">{place.name}</h4>
                  {place.category && place.category !== "other" && place.category.trim() !== "" && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-secondary text-secondary-foreground border border-border">
                      {(() => {
                        const Icon = getIconForGoogleCategory(place.category);
                        return <Icon className="h-3 w-3" />;
                      })()}
                      <span>{place.category}</span>
                    </div>
                  )}
                </div>
                
                {/* Distance and Time Info */}
                {place.coordinates && (previousPlaceCoords || hotelCoords) && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    {loadingRoute ? (
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Calculating route...</span>
                      </div>
                    ) : distance !== null && duration !== null ? (
                      <>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{formatDistance(distance)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDuration(duration)}</span>
                        </div>
                        <span className="text-xs">
                          {index === 0 ? `from ${hotelName}` : previousPlaceName ? `from ${previousPlaceName}` : "from previous location"}
                        </span>
                      </>
                    ) : null}
                  </div>
                )}
                
                {/* Distance Warning - Inline */}
                {distanceWarning && (
                  <div className="mb-3 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-600 dark:text-yellow-400 text-sm">⚠️</span>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-yellow-900 dark:text-yellow-100">
                          Far from route
                        </p>
                        <p className="text-xs text-yellow-800 dark:text-yellow-200 mt-0.5">
                          {distanceWarning.distance < 1000 
                            ? `${Math.round(distanceWarning.distance)}m` 
                            : `${(distanceWarning.distance / 1000).toFixed(1)}km`} away • {distanceWarning.time} travel time. This may affect route efficiency.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Things to Do Section - Auto-display */}
                {place.placeId && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    {loadingActivities ? (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Loading things to do...</span>
                      </div>
                    ) : activities.length > 0 ? (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Things to do:</p>
                        <ul className="space-y-2">
                          {activities.map((activity, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className="text-primary mt-0.5">•</span>
                              <span>{activity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(place.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                Remove
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Function to refresh place categories from Google
async function refreshPlaceCategories(tripData: Trip) {
  console.log("🔄 Starting category refresh for", tripData.places.length, "places");
  
  const updatedPlaces = await Promise.all(
    tripData.places.map(async (place) => {
      // Skip if already has a good category (not "other" or empty)
      const currentCategory = place.category || "";
      if (currentCategory && currentCategory !== "other" && currentCategory.trim() !== "") {
        console.log(`⏭️ Skipping ${place.name} - already has category: "${currentCategory}"`);
        return place;
      }

      // Fetch fresh details from Google
      if (place.placeId) {
        try {
          console.log(`🔍 Fetching details for ${place.name} (placeId: ${place.placeId})`);
          const response = await fetch(`/api/places/details?placeId=${place.placeId}`);
          if (response.ok) {
            const details = await response.json();
            console.log(`📋 Google types for ${place.name}:`, details.types);
            const freshCategory = inferCategory(details.types || []);
            console.log(`✅ Refreshed ${place.name}: "${currentCategory || "(empty)"}" → "${freshCategory || "(none)"}"`);
            return {
              ...place,
              category: freshCategory || undefined, // Use undefined instead of empty string
              types: details.types,
            };
          } else {
            const errorText = await response.text();
            console.warn(`⚠️ Failed to fetch details for ${place.name}:`, response.status, errorText);
          }
        } catch (error) {
          console.error(`❌ Failed to refresh ${place.name}:`, error);
        }
      } else {
        console.warn(`⚠️ ${place.name} has no placeId - cannot refresh`);
      }
      return place;
    })
  );

  // Update trip with refreshed categories
  const updatedTrip = {
    ...tripData,
    places: updatedPlaces,
    updatedAt: new Date().toISOString(),
  };
  updateTrip(tripData.id, updatedTrip);
  console.log("✅ Category refresh complete");
  return updatedTrip;
}

export default function DaysPage() {
  const params = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [endDestinationSearch, setEndDestinationSearch] = useState("");
  const [showEndSearch, setShowEndSearch] = useState(false);
  const [placeSearch, setPlaceSearch] = useState("");
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [distanceWarnings, setDistanceWarnings] = useState<Map<string, { distance: number; time: string }>>(new Map());
  const [nearbyRecommendations, setNearbyRecommendations] = useState<Place[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [showOptimizedRouteDescription, setShowOptimizedRouteDescription] = useState(true);
  const [showAllPlaces, setShowAllPlaces] = useState(false);


  useEffect(() => {
    const tripId = params.id as string;
    const tripData = getTripById(tripId);
    
    if (!tripData) {
      router.push("/");
      return;
    }

    // Refresh categories for places with "other" or missing categories
    const needsRefresh = tripData.places.some(p => !p.category || p.category === "other");
    if (needsRefresh) {
      console.log("🔄 Refreshing place categories from Google...");
      refreshPlaceCategories(tripData).then(updatedTrip => {
        setTrip(updatedTrip);
        setLoading(false);
      });
    } else {
      setTrip(tripData);
      setLoading(false);
    }

    // Auto-suggest day groupings if no days exist (works with or without routes)
    if (tripData.days.length === 0 && tripData.places.filter(p => p.confirmed).length > 0) {
      suggestDayGroupings(tripData);
    }

    // Select first day by default
    if (tripData.days.length > 0 && !selectedDay) {
      setSelectedDay(tripData.days[0].id);
    }
  }, [params.id, router, selectedDay]);

  // Reset search state when day changes (but keep warnings)
  useEffect(() => {
    setShowEndSearch(false);
    setEndDestinationSearch("");
    setPlaceSearch("");
    setShowAddPlace(false);
    // Don't reset distanceWarnings - they should persist
  }, [selectedDay]);

  // Helper function to filter places based on trip context using AI
  const filterPlacesByContext = async (places: Place[]) => {
    if (!trip || places.length === 0) return places;
    
    try {
      const response = await fetch('/api/places/filter-contextual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          places: places.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            types: p.types,
            address: p.address,
          })),
          tripContext: {
            travelerType: trip.travelerContext?.type,
            tags: trip.travelerContext?.tags,
            destination: trip.destination,
          },
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🎯 AI filtered places:', data.filteredPlaces.length, 'out of', places.length);
        return data.filteredPlaces || places;
      }
    } catch (error) {
      console.error('Error filtering places by context:', error);
    }
    
    // Fail safe: return original places if filtering fails
    return places;
  };

  // Fetch nearby recommendations along the route (between starting point and end destination)
  useEffect(() => {
    if (!trip || !selectedDay) return;
    
    const fetchNearbyRecommendations = async () => {
      const currentDay = trip.days.find((d) => d.id === selectedDay);
      if (!currentDay) return;
      
      // Get starting point (hotel or first place in day)
      const placesInDay = trip.places.filter((p) => p.confirmed && currentDay.places.includes(p.id));
      const startLocation = trip.hotel.coordinates;
      
      // Get end destination (set end destination or hotel)
      const endLocation = currentDay.endDestination?.coordinates || trip.hotel.coordinates;
      
      if (!startLocation || startLocation.lat === 0 || startLocation.lng === 0) return;
      if (!endLocation || endLocation.lat === 0 || endLocation.lng === 0) return;
      
      // If start and end are the same (both hotel), search near last place or hotel
      if (startLocation.lat === endLocation.lat && startLocation.lng === endLocation.lng) {
        const lastPlace = placesInDay.length > 0 ? placesInDay[placesInDay.length - 1] : null;
        const searchLocation = lastPlace?.coordinates || trip.hotel.coordinates;
        
        setLoadingRecommendations(true);
        
        try {
          const response = await fetch('/api/places/nearby', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: searchLocation,
              radius: 2000,
              excludePlaceIds: trip.places.map(p => p.placeId).filter(Boolean),
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('📍 Nearby recommendations (circular route):', data.places);
            
            // Filter recommendations based on trip context using AI
            const rawPlaces = data.places || [];
            const filteredPlaces = await filterPlacesByContext(rawPlaces);
            setNearbyRecommendations(filteredPlaces);
          }
        } catch (error) {
          console.error('Error fetching nearby recommendations:', error);
        } finally {
          setLoadingRecommendations(false);
        }
        return;
      }
      
      // Fetch places along the route between start and end
      setLoadingRecommendations(true);
      
      try {
        const response = await fetch('/api/places/along-route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start: startLocation,
            end: endLocation,
            excludePlaceIds: trip.places.map(p => p.placeId).filter(Boolean),
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('📍 Recommendations along route:', data.places);
          
          // Filter recommendations based on trip context using AI
          const rawPlaces = data.places || [];
          const filteredPlaces = await filterPlacesByContext(rawPlaces);
          setNearbyRecommendations(filteredPlaces);
        }
      } catch (error) {
        console.error('Error fetching route recommendations:', error);
      } finally {
        setLoadingRecommendations(false);
      }
    };
    
    fetchNearbyRecommendations();
  }, [trip, selectedDay]);

  const suggestDayGroupings = (tripData: Trip) => {
    const confirmedPlaces = tripData.places.filter((p) => p.confirmed && p.coordinates);
    
    // Calculate target number of days from trip dates
    let targetDays = 3; // Default fallback
    if (tripData.startDate && tripData.endDate) {
      const start = new Date(tripData.startDate);
      const end = new Date(tripData.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      targetDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end day
    }
    
    // Use user's preferred placesPerDay if available, otherwise calculate
    const MAX_PLACES_PER_DAY = tripData.placesPerDay || Math.max(5, Math.min(Math.ceil(confirmedPlaces.length / targetDays), 8)); // Between 5-8 places per day as fallback
    
    // If we have routes, group by routes (one route per day, or combine nearby routes)
    if (tripData.routes.length > 0) {
      const suggestedDays: Day[] = [];
      
      // Group routes by proximity and place count
      const processedRoutes = new Set<string>();
      
      for (const route of tripData.routes) {
        if (processedRoutes.has(route.id)) continue;
        
        const routePlaces = route.places.map((rp) => rp.placeId);
        
        // Try to combine with nearby routes if current route has few places
        if (routePlaces.length < MAX_PLACES_PER_DAY) {
          const nearbyRoutes: string[] = [route.id];
          let totalPlaces = routePlaces.length;
          
          // Find nearby routes to combine
          for (const otherRoute of tripData.routes) {
            if (
              otherRoute.id === route.id ||
              processedRoutes.has(otherRoute.id) ||
              totalPlaces >= MAX_PLACES_PER_DAY
            ) {
              continue;
            }
            
            const otherPlaces = otherRoute.places.map((rp) => rp.placeId);
            if (totalPlaces + otherPlaces.length <= MAX_PLACES_PER_DAY) {
              nearbyRoutes.push(otherRoute.id);
              routePlaces.push(...otherPlaces);
              totalPlaces += otherPlaces.length;
              processedRoutes.add(otherRoute.id);
            }
          }
          
          suggestedDays.push({
            id: `day_${Date.now()}_${suggestedDays.length}`,
            routes: nearbyRoutes,
            places: Array.from(new Set(routePlaces)), // Remove duplicates
          });
        } else {
          // Route has many places, keep it separate
          suggestedDays.push({
            id: `day_${Date.now()}_${suggestedDays.length}`,
            routes: [route.id],
            places: routePlaces,
          });
        }
        
        processedRoutes.add(route.id);
      }
      
      // Add any unassigned confirmed places to the last day or create a new day
      const assignedPlaceIds = new Set(
        suggestedDays.flatMap((day) => day.places)
      );
      const unassignedPlaces = confirmedPlaces
        .filter((p) => !assignedPlaceIds.has(p.id))
        .map((p) => p.id);
      
      if (unassignedPlaces.length > 0) {
        if (suggestedDays.length > 0) {
          // Add to last day if it has space
          const lastDay = suggestedDays[suggestedDays.length - 1];
          if (lastDay.places.length + unassignedPlaces.length <= MAX_PLACES_PER_DAY) {
            lastDay.places.push(...unassignedPlaces);
          } else {
            // Create new day for unassigned places
            suggestedDays.push({
              id: `day_${Date.now()}_${suggestedDays.length}`,
              routes: [],
              places: unassignedPlaces,
            });
          }
        } else {
          // No routes, create days based on place count
          for (let i = 0; i < unassignedPlaces.length; i += MAX_PLACES_PER_DAY) {
            suggestedDays.push({
              id: `day_${Date.now()}_${suggestedDays.length}`,
              routes: [],
              places: unassignedPlaces.slice(i, i + MAX_PLACES_PER_DAY),
            });
          }
        }
      }
      
      // Ensure we create exactly targetDays number of days
      while (suggestedDays.length < targetDays) {
        suggestedDays.push({
          id: `day_${Date.now()}_${suggestedDays.length}`,
          routes: [],
          places: [],
        });
      }
      
      const updatedTrip = {
        ...tripData,
        days: suggestedDays,
        updatedAt: new Date().toISOString(),
      };
      updateTrip(tripData.id, updatedTrip);
      setTrip(updatedTrip);
      if (suggestedDays.length > 0) {
        setSelectedDay(suggestedDays[0].id);
      }
    } else if (confirmedPlaces.length > 0) {
      // No routes, distribute places evenly across target days
      const suggestedDays: Day[] = [];
      
      // Distribute places evenly across targetDays
      for (let dayIndex = 0; dayIndex < targetDays; dayIndex++) {
        const startIdx = Math.floor((confirmedPlaces.length / targetDays) * dayIndex);
        const endIdx = Math.floor((confirmedPlaces.length / targetDays) * (dayIndex + 1));
        const dayPlaces = confirmedPlaces.slice(startIdx, endIdx);
        
        suggestedDays.push({
          id: `day_${Date.now()}_${dayIndex}`,
          routes: [],
          places: dayPlaces.map((p) => p.id),
        });
      }
      
      const updatedTrip = {
        ...tripData,
        days: suggestedDays,
        updatedAt: new Date().toISOString(),
      };
      updateTrip(tripData.id, updatedTrip);
      setTrip(updatedTrip);
      if (suggestedDays.length > 0) {
        setSelectedDay(suggestedDays[0].id);
      }
    }
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
    if (!coord1 || !coord2 || coord1.lat === 0 || coord1.lng === 0 || coord2.lat === 0 || coord2.lng === 0) {
      return Infinity;
    }
    const R = 6371000; // Earth radius in meters
    const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
    const dLon = ((coord2.lng - coord1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coord1.lat * Math.PI) / 180) *
        Math.cos((coord2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  };

  const handleAddPlaceToDay = (dayId: string, placeId: string) => {
    if (!trip) return;
    
    // Check if place exists in trip.places
    const placeExists = trip.places.some(p => p.id === placeId);
    
    if (!placeExists) {
      // Place is from nearby recommendations, need to add it to trip.places first
      const nearbyPlace = nearbyRecommendations.find(p => p.id === placeId);
      if (nearbyPlace) {
        // Add place to trip.places
        const updatedTrip = {
          ...trip,
          places: [...trip.places, { ...nearbyPlace, confirmed: true }],
          days: trip.days.map((day) => {
            if (day.id === dayId && !day.places.includes(placeId)) {
              return { ...day, places: [...day.places, placeId] };
            }
            return day;
          }),
          updatedAt: new Date().toISOString(),
        };
        updateTrip(trip.id, updatedTrip);
        setTrip(updatedTrip);
        return;
      }
    }
    
    // Place already exists in trip.places, just add to day
    const updatedDays = trip.days.map((day) => {
      if (day.id === dayId && !day.places.includes(placeId)) {
        return { ...day, places: [...day.places, placeId] };
      }
      return day;
    });
    const updatedTrip = { ...trip, days: updatedDays, updatedAt: new Date().toISOString() };
    updateTrip(trip.id, updatedTrip);
    setTrip(updatedTrip);
  };

  const handleRemovePlaceFromDay = (dayId: string, placeId: string) => {
    if (!trip) return;
    const updatedDays = trip.days.map((day) => {
      if (day.id === dayId) {
        return { ...day, places: day.places.filter((p) => p !== placeId) };
      }
      return day;
    });
    const updatedTrip = { ...trip, days: updatedDays, updatedAt: new Date().toISOString() };
    updateTrip(trip.id, updatedTrip);
    setTrip(updatedTrip);
  };

  const handleCreateDay = () => {
    if (!trip) return;
    const newDay: Day = {
      id: `day_${Date.now()}`,
      routes: [],
      places: [],
    };
    const updatedDays = [...trip.days, newDay];
    const updatedTrip = { ...trip, days: updatedDays, updatedAt: new Date().toISOString() };
    updateTrip(trip.id, updatedTrip);
    setTrip(updatedTrip);
    setSelectedDay(newDay.id);
  };

  const handleSetEndDestination = (dayId: string, destination: { type: 'hotel' | 'place'; placeId?: string; name: string; address?: string; coordinates?: { lat: number; lng: number } }) => {
    if (!trip) return;
    const updatedDays = trip.days.map((day) => {
      if (day.id === dayId) {
        return { ...day, endDestination: destination };
      }
      return day;
    });
    const updatedTrip = { ...trip, days: updatedDays, updatedAt: new Date().toISOString() };
    updateTrip(trip.id, updatedTrip);
    setTrip(updatedTrip);
    setShowEndSearch(false);
    setEndDestinationSearch("");
  };

  const handleSetHotelAsEnd = (dayId: string) => {
    if (!trip) return;
    handleSetEndDestination(dayId, {
      type: 'hotel',
      name: trip.hotel.name,
      address: trip.hotel.address,
      coordinates: trip.hotel.coordinates,
    });
  };

  const handleSetHotelAsEndForAllDays = () => {
    if (!trip) return;
    const updatedDays = trip.days.map((day) => ({
      ...day,
      endDestination: {
        type: 'hotel' as const,
        name: trip.hotel.name,
        address: trip.hotel.address,
        coordinates: trip.hotel.coordinates,
      },
    }));
    const updatedTrip = { ...trip, days: updatedDays, updatedAt: new Date().toISOString() };
    updateTrip(trip.id, updatedTrip);
    setTrip(updatedTrip);
  };

  const handleRemoveEndDestination = (dayId: string) => {
    if (!trip) return;
    const updatedDays = trip.days.map((day) => {
      if (day.id === dayId) {
        const { endDestination, ...rest } = day;
        return rest;
      }
      return day;
    });
    const updatedTrip = { ...trip, days: updatedDays, updatedAt: new Date().toISOString() };
    updateTrip(trip.id, updatedTrip);
    setTrip(updatedTrip);
  };

  const handleAddPlaceFromSearch = async (dayId: string, place: { name: string; address: string; placeId?: string; coordinates?: { lat: number; lng: number }; types?: string[] }) => {
    console.log("🔍 handleAddPlaceFromSearch called:", { dayId, place });
    if (!trip) {
      console.error("❌ No trip found");
      return;
    }
    
    try {
      // Check distance if coordinates are available - calculate BEFORE adding place
      let shouldShowWarning = false;
      let warningData: { distance: number; time: string } | null = null;
      
      if (place.coordinates && place.coordinates.lat !== 0 && place.coordinates.lng !== 0) {
        const currentDay = trip.days.find((d) => d.id === dayId);
        const placesInDay = currentDay
          ? trip.places.filter((p) => p.confirmed && currentDay.places.includes(p.id))
          : [];
        
        const lastPlace = placesInDay.length > 0
          ? placesInDay[placesInDay.length - 1]
          : null;
        const lastPlaceCoords = lastPlace?.coordinates || trip.hotel.coordinates;
        const endDestinationCoords = currentDay?.endDestination?.coordinates || trip.hotel.coordinates;
        
        const distanceFromLast = calculateDistance(lastPlaceCoords, place.coordinates);
        const distanceToEnd = calculateDistance(place.coordinates, endDestinationCoords);
        const minDistance = Math.min(distanceFromLast, distanceToEnd);
        
        // If place is more than 2km away, prepare warning
        if (minDistance > 2000) {
          shouldShowWarning = true;
          // Calculate estimated travel time using Google Directions API
          const fromCoords = distanceFromLast < distanceToEnd ? lastPlaceCoords : place.coordinates;
          const toCoords = distanceFromLast < distanceToEnd ? place.coordinates : endDestinationCoords;
          
          // Calculate estimated time synchronously (with fallback)
          try {
            const routeResponse = await fetch("/api/routes/calculate", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                start: fromCoords,
                end: toCoords,
              }),
            });
            
            if (routeResponse.ok) {
              const routeData = await routeResponse.json();
              const estimatedTime = routeData 
                ? `${Math.round(routeData.duration / 60)} min`
                : `~${Math.round((minDistance / 1000) * 2)} min`;
              warningData = { distance: minDistance, time: estimatedTime };
            } else {
              warningData = { 
                distance: minDistance, 
                time: `~${Math.round((minDistance / 1000) * 2)} min` 
              };
            }
          } catch (error) {
            warningData = { 
              distance: minDistance, 
              time: `~${Math.round((minDistance / 1000) * 2)} min` 
            };
          }
        }
      }
    
      // Check if place already exists in trip
      const existingPlace = trip.places.find(p => p.placeId === place.placeId || p.name === place.name);
      
      let placeIdToAdd: string;
      
      let updatedTripForDay: Trip;
      
      if (existingPlace) {
        // Use existing place
        placeIdToAdd = existingPlace.id;
        updatedTripForDay = trip;
        console.log("✅ Using existing place:", placeIdToAdd);
      } else {
        // Create new place and add to trip
        // Always fetch place details for accurate categorization from Google
        console.log("🏷️ Place object received:", JSON.stringify(place, null, 2));
        console.log("🏷️ Place types from autocomplete:", place.types);
        console.log("🏷️ Place ID:", place.placeId);
        
        let category = "other";
        
        // Always fetch place details for accurate categorization
        if (place.placeId) {
          console.log("🔍 Fetching place details for placeId:", place.placeId);
          try {
            const detailsResponse = await fetch(`/api/places/details?placeId=${place.placeId}`);
            console.log("🔍 Details API response status:", detailsResponse.status);
            
            if (detailsResponse.ok) {
              const detailsData = await detailsResponse.json();
              console.log("🏷️ Full place details received:", JSON.stringify(detailsData, null, 2));
              console.log("🏷️ Place types from details API:", detailsData.types);
              console.log("🏷️ Types is array?", Array.isArray(detailsData.types));
              console.log("🏷️ Types length:", detailsData.types?.length);
              
              if (detailsData.types && detailsData.types.length > 0) {
                console.log("🏷️ Calling inferCategory with types:", detailsData.types);
                category = inferCategory(detailsData.types);
                console.log("🏷️ Final category result:", category);
                console.log("🏷️ Mapping:", detailsData.types, "→", category);
              } else {
                console.warn("⚠️ No types in details data!");
              }
            } else {
              const errorText = await detailsResponse.text();
              console.error("❌ Failed to fetch place details, status:", detailsResponse.status);
              console.error("❌ Error response:", errorText);
              // Fallback to autocomplete types
              if (place.types && place.types.length > 0) {
                category = inferCategory(place.types);
                console.log("🏷️ Fallback category from autocomplete:", category);
              }
            }
          } catch (error) {
            console.error("❌ Error fetching place details:", error);
            console.error("❌ Error stack:", error instanceof Error ? error.stack : "No stack");
            // Fallback to autocomplete types
            if (place.types && place.types.length > 0) {
              category = inferCategory(place.types);
              console.log("🏷️ Fallback category from autocomplete:", category);
            }
          }
        } else {
          console.warn("⚠️ No placeId provided!");
          if (place.types && place.types.length > 0) {
            category = inferCategory(place.types);
            console.log("🏷️ Category from autocomplete (no placeId):", category);
          }
        }
        
        const newPlace: Place = {
          id: `place_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: place.name,
          category: category,
          coordinates: place.coordinates || { lat: 0, lng: 0 },
          placeId: place.placeId,
          confidence: 1.0,
          source: "Manually added",
          confirmed: true,
          validated: !!place.placeId,
        };
        
        const updatedPlaces = [...trip.places, newPlace];
        placeIdToAdd = newPlace.id;
        
        console.log("✅ Creating new place:", placeIdToAdd, newPlace);
        
        // Update trip with new place
        updatedTripForDay = {
          ...trip,
          places: updatedPlaces,
          updatedAt: new Date().toISOString(),
        };
        updateTrip(trip.id, updatedTripForDay);
        setTrip(updatedTripForDay);
      }
      
      // Add place to day using the updated trip
      console.log("✅ Adding place to day:", dayId, placeIdToAdd);
      const updatedDays = updatedTripForDay.days.map((day) => {
        if (day.id === dayId && !day.places.includes(placeIdToAdd)) {
          return { ...day, places: [...day.places, placeIdToAdd] };
        }
        return day;
      });
      
      const finalUpdatedTrip = {
        ...updatedTripForDay,
        days: updatedDays,
        updatedAt: new Date().toISOString(),
      };
      
      updateTrip(trip.id, finalUpdatedTrip);
      setTrip(finalUpdatedTrip);
      setPlaceSearch("");
      console.log("✅ Place added successfully to day:", dayId);
      
      // Store distance warning if needed (after place is added)
      if (shouldShowWarning && warningData) {
        const placeKey = place.placeId || place.name;
        console.log("⚠️ Storing distance warning for:", placeKey, warningData);
        setDistanceWarnings((prev) => {
          const newMap = new Map(prev);
          newMap.set(placeKey, warningData!);
          console.log("⚠️ Warning stored. Total warnings:", newMap.size, "Keys:", Array.from(newMap.keys()));
          return newMap;
        });
      }
    } catch (error) {
      console.error("❌ Error adding place:", error);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!trip) {
    return null;
  }

  const confirmedPlaces = trip.places.filter((p) => p.confirmed);
  const currentDay = trip.days.find((d) => d.id === selectedDay);
  const placesInCurrentDay = currentDay
    ? confirmedPlaces.filter((p) => currentDay.places.includes(p.id))
    : [];
  
  // Get all place IDs that are assigned to any day
  const allAssignedPlaceIds = new Set(
    trip.days.flatMap((day) => day.places)
  );
  
  // Separate unallocated places (not in any day) and places in other days
  const unallocatedPlaces = confirmedPlaces.filter(
    (p) => !allAssignedPlaceIds.has(p.id)
  );
  const placesInOtherDays = currentDay
    ? confirmedPlaces.filter((p) => !currentDay.places.includes(p.id) && allAssignedPlaceIds.has(p.id))
    : [];
  
  // Combine: 1) Nearby Google recommendations, 2) Unallocated saved places, 3) Allocated places from other days
  // All sorted by proximity, limited to 3 total
  const availablePlaces = (() => {
    const MAX_TOTAL = 3;
    
    // Combine nearby recommendations with unallocated places
    const combined = [...nearbyRecommendations, ...unallocatedPlaces];
    
    // Remove duplicates by placeId
    const uniquePlaces = combined.filter((place, index, self) =>
      index === self.findIndex((p) => p.placeId === place.placeId)
    );
    
    // Get last place coordinates (or hotel if no places)
    const lastPlace = placesInCurrentDay.length > 0
      ? placesInCurrentDay[placesInCurrentDay.length - 1]
      : null;
    const lastPlaceCoords = lastPlace?.coordinates || trip.hotel.coordinates;
    
    // Get end destination coordinates (or hotel if not set)
    const endDestinationCoords = currentDay?.endDestination?.coordinates || trip.hotel.coordinates;

    const MAX_DISTANCE = 2000; // 2km in meters

    // Calculate scores and filter by distance
    const placesWithScores = uniquePlaces
      .filter((p) => p.coordinates && p.coordinates.lat !== 0 && p.coordinates.lng !== 0)
      .map((place) => {
        const distanceFromLast = calculateDistance(lastPlaceCoords, place.coordinates!);
        const distanceToEnd = calculateDistance(place.coordinates!, endDestinationCoords);
        const combinedScore = distanceFromLast + distanceToEnd;
        
        return {
          place,
          distanceFromLast,
          distanceToEnd,
          combinedScore,
        };
      })
      .filter((p) => p.distanceFromLast <= MAX_DISTANCE || p.distanceToEnd <= MAX_DISTANCE)
      .sort((a, b) => a.combinedScore - b.combinedScore);

    // Take top 3
    const results = placesWithScores.slice(0, MAX_TOTAL);
    
    // If still fewer than 3, fill with allocated places from other days
    if (results.length < MAX_TOTAL) {
      const remainingSlots = MAX_TOTAL - results.length;
      const allocatedWithScores = placesInOtherDays
        .filter((p) => p.coordinates && p.coordinates.lat !== 0 && p.coordinates.lng !== 0)
        .map((place) => {
          const distanceFromLast = calculateDistance(lastPlaceCoords, place.coordinates!);
          const distanceToEnd = calculateDistance(place.coordinates!, endDestinationCoords);
          const combinedScore = distanceFromLast + distanceToEnd;
          
          return { place, distanceFromLast, distanceToEnd, combinedScore };
        })
        .filter((p) => p.distanceFromLast <= MAX_DISTANCE || p.distanceToEnd <= MAX_DISTANCE)
        .sort((a, b) => a.combinedScore - b.combinedScore)
        .slice(0, remainingSlots);
      
      return [...results, ...allocatedWithScores].map((p) => p.place);
    }

    return results.map((p) => p.place);
  })();

  const getDayDate = (dayIndex: number) => {
    if (!trip.startDate) return null;
    const startDate = new Date(trip.startDate);
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + dayIndex);
    return dayDate;
  };

  const totalPlaces = confirmedPlaces.length;
  const totalDays = trip.days.length;
  const placesAssigned = trip.days.reduce((sum, day) => sum + day.places.length, 0);
  const placesUnassigned = totalPlaces - placesAssigned;

  return (
    <main className="min-h-screen bg-background">
      <div className="h-screen flex flex-col">
        {/* Fixed Header */}
        <div className="border-b bg-background z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Link href={`/trips/${trip.id}`}>
              <Button variant="ghost" size="sm" className="h-9 text-sm">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowAllPlaces(!showAllPlaces)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>{totalPlaces} places • {placesAssigned} assigned</span>
                  {showAllPlaces ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                
                {/* All Places Dropdown */}
                {showAllPlaces && (
                  <div className="absolute top-full right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-card border border-border rounded-lg shadow-lg z-50 p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b">
                        <h3 className="font-semibold text-sm">All Places ({totalPlaces})</h3>
                        <button
                          onClick={() => setShowAllPlaces(false)}
                          className="p-1 rounded-md hover:bg-accent transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {trip.days.map((day, dayIndex) => {
                        const dayPlaces = confirmedPlaces.filter((p) => day.places.includes(p.id));
                        if (dayPlaces.length === 0) return null;
                        
                        return (
                          <div key={day.id} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-primary">
                                Day {dayIndex + 1}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({dayPlaces.length} {dayPlaces.length === 1 ? 'place' : 'places'})
                              </span>
                            </div>
                            <div className="space-y-1.5 pl-4">
                              {dayPlaces.map((place) => {
                                const Icon = place.category ? getIconForGoogleCategory(place.category) : MapPin;
                                return (
                                  <div
                                    key={place.id}
                                    className="flex items-center gap-2 text-xs p-2 rounded-md hover:bg-accent/50 transition-colors"
                                  >
                                    <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <span className="flex-1 truncate">{place.name}</span>
                                    {place.category && place.category !== "other" && place.category.trim() !== "" && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground border border-border">
                                        {place.category}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Unassigned places */}
                      {unallocatedPlaces.length > 0 && (
                        <div className="space-y-2 pt-2 border-t">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">
                              Unassigned
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({unallocatedPlaces.length} {unallocatedPlaces.length === 1 ? 'place' : 'places'})
                            </span>
                          </div>
                          <div className="space-y-1.5 pl-4">
                            {unallocatedPlaces.map((place) => {
                              const Icon = place.category ? getIconForGoogleCategory(place.category) : MapPin;
                              return (
                                <div
                                  key={place.id}
                                  className="flex items-center gap-2 text-xs p-2 rounded-md hover:bg-accent/50 transition-colors"
                                >
                                  <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  <span className="flex-1 truncate">{place.name}</span>
                                  {place.category && place.category !== "other" && place.category.trim() !== "" && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground border border-border">
                                      {place.category}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
          <Link href={`/trips/${trip.id}/itinerary`}>
                <Button size="sm" className="h-9 text-sm">
                  Itinerary
                  <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
            </div>
          </div>

          {/* Title with Trip Info */}
          <div className="mb-4">
            <h1 className="text-xl font-bold">Organize Your Days</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
              <span>{totalPlaces} places across {totalDays} {totalDays === 1 ? 'day' : 'days'}</span>
              {trip.destination && (
                <>
                  <span>•</span>
                  <span>{trip.destination.split(',')[0]}</span>
                </>
              )}
              {trip.startDate && trip.endDate && (
                <>
                  <span>•</span>
                  <span>
                    {new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(trip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </>
              )}
              {trip.travelerContext?.type && (
                <>
                  <span>•</span>
                  <span className="capitalize">{trip.travelerContext.type} trip</span>
                </>
              )}
              {trip.travelerContext?.tags && trip.travelerContext.tags.length > 0 && (
                <>
                  <span>•</span>
                  <span className="capitalize">{trip.travelerContext.tags.slice(0, 2).join(', ')}</span>
                </>
              )}
              {trip.placesPerDay && (
                <>
                  <span>•</span>
                  <span>{trip.placesPerDay} places/day</span>
                </>
              )}
            </div>
          </div>

          {/* Horizontal Scrollable Days Strip */}
          <div className="mb-4">
          <div className="flex items-center gap-3 overflow-x-auto pb-3 scrollbar-thin">
            {trip.days.map((day, index) => {
              const dayDate = getDayDate(index);
              const isSelected = selectedDay === day.id;
              
              return (
                <button
                    key={day.id}
                  onClick={() => setSelectedDay(day.id)}
                  className={`flex-shrink-0 p-3 rounded-lg border-2 transition-all min-w-[110px] ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="text-center">
                    <div className={`text-xs font-medium mb-0.5 ${
                      isSelected ? "text-primary" : "text-muted-foreground"
                    }`}>
                      Day {index + 1}
                        </div>
                    {dayDate && (
                      <div className="text-[10px] text-muted-foreground mb-1">
                        {dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    )}
                    <div className={`text-lg font-bold ${
                      isSelected ? "text-primary" : "text-foreground"
                    }`}>
                      {day.places.length}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {day.places.length === 1 ? "place" : "places"}
                    </div>
                  </div>
                </button>
              );
            })}
            
            {/* Add Day Button */}
            <button
              onClick={handleCreateDay}
              className="flex-shrink-0 p-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-all min-w-[110px] flex items-center justify-center"
            >
              <div className="text-center">
                <Plus className="h-4 w-4 mx-auto mb-0.5 text-muted-foreground" />
                <div className="text-[10px] text-muted-foreground">Add Day</div>
              </div>
            </button>
              </div>
            </div>

        {/* Selected Day Content */}
              {currentDay ? (
          <div>
            {/* Day Header */}
            <div className="mb-4 pb-2 border-b">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-bold">
                    Day {trip.days.findIndex(d => d.id === currentDay.id) + 1}
                  </h2>
                  {getDayDate(trip.days.findIndex(d => d.id === currentDay.id)) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {getDayDate(trip.days.findIndex(d => d.id === currentDay.id))?.toLocaleDateString("en-US", { 
                        weekday: "short", 
                        month: "short", 
                        day: "numeric" 
                      })}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-primary">{placesInCurrentDay.length}</div>
                  <div className="text-xs text-muted-foreground">
                    {placesInCurrentDay.length === 1 ? 'place' : 'places'}
                  </div>
                </div>
              </div>
              
              {/* Route Visualization */}
              {placesInCurrentDay.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground overflow-x-auto pb-1">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent/50 border border-border">
                    <Hotel className="h-3 w-3" />
                    <span className="font-medium truncate max-w-[80px]">{trip.hotel.name}</span>
                  </div>
                  {placesInCurrentDay.map((place, idx) => (
                    <div key={place.id} className="flex items-center gap-1.5">
                      <ArrowRight className="h-3 w-3 flex-shrink-0 text-primary" />
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent/50 border border-border">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="font-medium truncate max-w-[100px]">{place.name}</span>
                      </div>
                    </div>
                  ))}
                  {currentDay.endDestination && currentDay.endDestination.type === 'place' && (
                    <>
                      <ArrowRight className="h-3 w-3 flex-shrink-0 text-primary" />
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent/50 border border-border">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="font-medium truncate max-w-[100px]">{currentDay.endDestination.name}</span>
                      </div>
                    </>
                  )}
                  {currentDay.endDestination && currentDay.endDestination.type === 'hotel' && (
                    <>
                      <ArrowRight className="h-3 w-3 flex-shrink-0 text-primary" />
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent/50 border border-border">
                        <Hotel className="h-3 w-3 flex-shrink-0" />
                        <span className="font-medium truncate max-w-[100px]">{trip.hotel.name}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="space-y-0">
              {/* Efficiency Description */}
              {placesInCurrentDay.length > 0 && showOptimizedRouteDescription && (
                <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20 relative">
                  <button
                    onClick={() => setShowOptimizedRouteDescription(false)}
                    className="absolute top-2 right-2 p-1 rounded-md hover:bg-primary/10 transition-colors text-muted-foreground hover:text-foreground"
                    aria-label="Close description"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <p className="text-sm text-foreground leading-relaxed pr-6">
                    <span className="font-semibold">Optimized Route:</span> Your places have been arranged in the most efficient travel order. Each location flows seamlessly to the next along your route, minimizing travel time and distance. You won't need to backtrack or make unnecessary detours — just follow the sequence for the smoothest journey. This optimized arrangement helps you <span className="font-medium">save money</span> on transportation costs, <span className="font-medium">save time</span> by avoiding backtracking, and <span className="font-medium">save energy</span> by eliminating unnecessary detours and extra travel.
                  </p>
                </div>
              )}

              {/* Hotel Starting Point - Compact */}
              <div className="relative flex gap-4 pb-8">
                <div className="relative flex flex-col items-center w-10 flex-shrink-0">
                  <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground">
                    <Hotel className="h-5 w-5" />
                  </div>
                  {/* Timeline connector - always show to connect to places or Add Place section */}
                  <div className="absolute top-12 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-border" />
                </div>
                <div className="flex-1">
                  <Card className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-semibold">{trip.hotel.name}</h4>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                          <Hotel className="h-3 w-3" />
                          <span>Hotel</span>
                        </div>
                        <span className="text-sm text-muted-foreground">• Starting point</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Places Timeline */}
              {placesInCurrentDay.length > 0 ? (
                <div className="space-y-0">
                  {placesInCurrentDay.map((place, index) => {
                    const previousPlace = index > 0 ? placesInCurrentDay[index - 1] : null;
                    const previousPlaceCoords = previousPlace?.coordinates;
                    const previousPlaceName = previousPlace?.name;
                    // Try both placeId and name as keys for more robust matching
                    const warning = distanceWarnings.get(place.placeId || "") || 
                                   distanceWarnings.get(place.name) || 
                                   null;
                    
                    return (
                      <PlaceItem
                        key={place.id}
                        place={place}
                        index={index}
                        totalPlaces={placesInCurrentDay.length}
                        previousPlaceCoords={previousPlaceCoords}
                        previousPlaceName={previousPlaceName}
                        hotelCoords={trip.hotel.coordinates}
                        hotelName={trip.hotel.name}
                        onRemove={(placeId) => handleRemovePlaceFromDay(currentDay.id, placeId)}
                        distanceWarning={warning}
                      />
                    );
                  })}
                </div>
              ) : (
                <Card className="border-dashed bg-muted/20 mb-3">
                  <CardContent className="p-4 text-center">
                    <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <h3 className="text-sm font-semibold mb-1">No places added yet</h3>
                    <p className="text-xs text-muted-foreground">
                      Use the search below to add places
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Add Place Section - Compact */}
              <div className="relative flex gap-4 pb-8">
                <div className="relative flex flex-col items-center w-10 flex-shrink-0">
                  <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 border-dashed border-primary/50 bg-primary/5">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  {/* Timeline line - show if there are places above */}
                  {placesInCurrentDay.length > 0 && (
                    <div className="absolute top-12 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-border" />
                  )}
                </div>
                <div className="flex-1">
                  <Card className="border-primary/30 bg-accent/20">
                    <CardContent className="p-3">
                      <button
                        onClick={() => setShowAddPlace(!showAddPlace)}
                        className="w-full flex items-center justify-between text-left mb-2"
                      >
                        <div>
                          <h3 className="text-base font-semibold">Add More Places</h3>
                          <p className="text-sm text-muted-foreground">
                            {availablePlaces.length > 0 ? `${availablePlaces.length} recommended places available` : "Search for new places"}
                          </p>
                        </div>
                        {showAddPlace ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      
                      {showAddPlace && (
                        <div className="space-y-2 pt-2 border-t">
                          {/* Search for new places */}
                          <div>
                            <PlacesAutocomplete
                              id="place-search-day"
                              value={placeSearch}
                              onChange={(value) => {
                                console.log("🔍 Search input changed:", value);
                                setPlaceSearch(value);
                              }}
                              onSelect={(place) => {
                                console.log("✅ Place selected in component:", place);
                                handleAddPlaceFromSearch(currentDay.id, place);
                              }}
                              clearOnSelect={true}
                              placeholder="Search for places in your destination..."
                              locationBias={trip.hotel.coordinates.lat !== 0 ? trip.hotel.coordinates : undefined}
                              types={[]}
                            />
                          </div>
                          
                          {/* Recommended places from trip */}
                          {availablePlaces.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between pt-2 border-t">
                                <div className="text-sm font-medium">Recommended Places (Route Efficiency)</div>
                                <div className="text-xs text-muted-foreground">
                                  {availablePlaces.length} available
                                </div>
                              </div>
                              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                                {availablePlaces.map((place) => {
                                  // Calculate distances for display
                                  const lastPlace = placesInCurrentDay.length > 0 
                                    ? placesInCurrentDay[placesInCurrentDay.length - 1] 
                                    : null;
                                  const lastPlaceCoords = lastPlace?.coordinates || trip.hotel.coordinates;
                                  const lastPlaceName = lastPlace?.name || trip.hotel.name;
                                  const endDestinationCoords = currentDay?.endDestination?.coordinates || trip.hotel.coordinates;
                                  const endDestinationName = currentDay?.endDestination?.name || trip.hotel.name;
                                  
                                  const distanceFromLast = place.coordinates && place.coordinates.lat !== 0 && place.coordinates.lng !== 0
                                    ? calculateDistance(lastPlaceCoords, place.coordinates)
                                    : null;
                                  const distanceToEnd = place.coordinates && place.coordinates.lat !== 0 && place.coordinates.lng !== 0
                                    ? calculateDistance(place.coordinates, endDestinationCoords)
                                    : null;

                                  // Check if place is allocated to other days (only show if it's in other days, not if unallocated)
                                  const isUnallocated = !allAssignedPlaceIds.has(place.id);
                                  const allocatedDays = !isUnallocated
                                    ? trip.days
                                        .filter((day) => day.id !== currentDay?.id && day.places.includes(place.id))
                                        .map((day) => {
                                          const dayIndex = trip.days.findIndex((d) => d.id === day.id);
                                          return `Day ${dayIndex + 1}`;
                                        })
                                    : [];

                                  const formatDistance = (meters: number): string => {
                                    if (meters < 1000) {
                                      return `${Math.round(meters)}m`;
                                    }
                                    return `${(meters / 1000).toFixed(1)}km`;
                                  };

                                  return (
                                    <button
                                      key={place.id}
                                      onClick={() => handleAddPlaceToDay(currentDay.id, place.id)}
                                      className="w-full flex items-center justify-between p-2.5 rounded border border-border bg-card hover:border-primary/40 hover:bg-accent/30 transition-colors text-left group"
                                    >
                                      <div className="flex-1 min-w-0 pr-2">
                                        <p className="text-sm font-medium truncate mb-1">{place.name}</p>
                                        <div className="space-y-1">
                                          {place.category && place.category !== "other" && place.category.trim() !== "" && (
                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground border border-border">
                                              {(() => {
                                                const Icon = getIconForGoogleCategory(place.category);
                                                return <Icon className="h-3 w-3" />;
                                              })()}
                                              <span>{place.category}</span>
                                            </div>
                                          )}
                                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                            {distanceFromLast !== null && (
                                              <div className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                <span>{formatDistance(distanceFromLast)} from {lastPlaceName}</span>
                                              </div>
                                            )}
                                            {distanceToEnd !== null && (
                                              <div className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                <span>{formatDistance(distanceToEnd)} to {endDestinationName}</span>
                                              </div>
                                            )}
                                            {allocatedDays.length > 0 && (
                                              <div className="text-xs text-muted-foreground">
                                                Allocated to {allocatedDays.join(", ")}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-2" />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      </CardContent>
                    </Card>
                </div>
              </div>

              {/* End Destination - Compact */}
              {placesInCurrentDay.length > 0 && (
                <div className="relative flex gap-4 pb-8">
                  <div className="relative flex flex-col items-center w-10 flex-shrink-0">
                    <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-muted border-2 border-border">
                      <Hotel className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex-1">
                    {currentDay?.endDestination ? (
                      <Card className="hover:border-primary/30 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-3">
                                <h4 className="text-base font-semibold">{currentDay.endDestination.name}</h4>
                                {currentDay.endDestination.type === 'hotel' && (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                                    <Hotel className="h-3 w-3" />
                                    <span>Hotel</span>
                                  </div>
                                )}
                              </div>
                              {currentDay.endDestination.address && (
                                <p className="text-sm text-muted-foreground mb-1">{currentDay.endDestination.address}</p>
                              )}
                              <span className="text-sm text-muted-foreground">• End destination</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveEndDestination(currentDay.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border-dashed border-primary/30 bg-accent/20">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div>
                              <h3 className="text-base font-semibold mb-1">Set End Destination</h3>
                              <p className="text-sm text-muted-foreground">
                                Choose where to end your day
                              </p>
                            </div>
                            {!showEndSearch ? (
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSetHotelAsEnd(currentDay.id)}
                                  className="flex-1"
                                >
                                  <Hotel className="h-4 w-4 mr-2" />
                                  Return to Hotel
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleSetHotelAsEndForAllDays}
                                  className="flex-1"
                                >
                                  <Hotel className="h-4 w-4 mr-2" />
                                  Return to Hotel for the Entire Trip
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowEndSearch(true)}
                                  className="flex-1"
                                >
                                  <Search className="h-4 w-4 mr-2" />
                                  Search Place
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium">Search for end destination</p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setShowEndSearch(false);
                                      setEndDestinationSearch("");
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                                <PlacesAutocomplete
                                  id="end-destination-search"
                                  value={endDestinationSearch}
                                  onChange={setEndDestinationSearch}
                                  onSelect={(place) => {
                                    handleSetEndDestination(currentDay.id, {
                                      type: 'place',
                                      placeId: place.placeId,
                                      name: place.name,
                                      address: place.address,
                                      coordinates: place.coordinates,
                                    });
                                  }}
                                  placeholder="Search for a place..."
                                  locationBias={trip.hotel.coordinates.lat !== 0 ? trip.hotel.coordinates : undefined}
                                  clearOnSelect={true}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSetHotelAsEnd(currentDay.id)}
                                  className="w-full"
                                >
                                  <Hotel className="h-4 w-4 mr-2" />
                                  Or return to hotel instead
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
              ) : (
                <Card>
            <CardContent className="p-4">
              <div className="text-center py-6">
                <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                        {trip.days.length === 0
                    ? "No days created yet. Click 'Add Day' to get started."
                    : "Select a day from the strip above to organize places"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
        </div>
      </div>
    </main>
  );
}

