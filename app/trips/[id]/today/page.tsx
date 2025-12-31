"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getTripById, updateTrip } from "@/lib/storage";
import { calculateRoute } from "@/lib/routes-api";
import { 
  ArrowLeft, MapPin, CheckCircle2, Circle, Navigation, RefreshCw, X, Search, 
  ExternalLink, Calendar, Clock, TrendingUp, Hotel, ChevronDown, ChevronUp,
  Map as MapIcon, Route, Compass
} from "lucide-react";
import { getCategoryIcon, getCategoryLabel } from "@/lib/category-utils";
import { Map } from "@/components/map";
import type { Trip, Place, Coordinates } from "@/types";

interface PlaceWithRoute extends Place {
  distanceFromPrevious?: number; // meters
  travelTimeFromPrevious?: number; // minutes
  estimatedArrival?: string; // HH:MM format
}

export default function TodayPage() {
  const params = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [completedPlaces, setCompletedPlaces] = useState<Set<string>>(new Set());
  const [skippedPlaces, setSkippedPlaces] = useState<Set<string>>(new Set());
  const [isReoptimizing, setIsReoptimizing] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<Array<{ place: Place; distance: number }>>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  const [expandedPlace, setExpandedPlace] = useState<string | null>(null);
  const [placesWithRoutes, setPlacesWithRoutes] = useState<PlaceWithRoute[]>([]);
  const [isCalculatingRoutes, setIsCalculatingRoutes] = useState(false);
  const [totalEstimatedTime, setTotalEstimatedTime] = useState<number>(0); // minutes

  useEffect(() => {
    const tripId = params.id as string;
    const tripData = getTripById(tripId);
    setTrip(tripData);
    setLoading(false);

    if (!tripData) {
      router.push("/");
      return;
    }

    // Load completed and skipped places from localStorage (in-trip state)
    const savedCompleted = localStorage.getItem(`trip_${tripId}_completed`);
    if (savedCompleted) {
      setCompletedPlaces(new Set(JSON.parse(savedCompleted)));
    }
    const savedSkipped = localStorage.getItem(`trip_${tripId}_skipped`);
    if (savedSkipped) {
      setSkippedPlaces(new Set(JSON.parse(savedSkipped)));
    }
  }, [params.id, router]);

  // Calculate routes and travel times
  const calculateRoutesForDay = useCallback(async (places: Place[], hotel: Coordinates) => {
    if (places.length === 0) {
      setPlacesWithRoutes([]);
      setTotalEstimatedTime(0);
      return;
    }

    setIsCalculatingRoutes(true);
    const placesWithRouteData: PlaceWithRoute[] = [];
    let cumulativeTime = 0; // minutes
    const visitTimePerPlace = 60; // Assume 60 minutes per place on average

    for (let i = 0; i < places.length; i++) {
      const place = places[i];
      const placeWithRoute: PlaceWithRoute = { ...place };

      if (!place.coordinates || place.coordinates.lat === 0) {
        placesWithRouteData.push(placeWithRoute);
        continue;
      }

      // Calculate route from previous location (hotel if first, previous place otherwise)
      const startLocation = i === 0 
        ? hotel 
        : (places[i - 1].coordinates || hotel);

      if (startLocation.lat !== 0) {
        try {
          const route = await calculateRoute(startLocation, place.coordinates);
          if (route) {
            placeWithRoute.distanceFromPrevious = route.distance;
            placeWithRoute.travelTimeFromPrevious = Math.round(route.duration / 60); // Convert to minutes
            cumulativeTime += placeWithRoute.travelTimeFromPrevious;
            
            // Calculate estimated arrival time (starting at 9 AM for the day)
            const startHour = 9;
            const arrivalHour = Math.floor(cumulativeTime / 60);
            const arrivalMinute = cumulativeTime % 60;
            placeWithRoute.estimatedArrival = 
              `${String(startHour + arrivalHour).padStart(2, '0')}:${String(arrivalMinute).padStart(2, '0')}`;
            
            cumulativeTime += visitTimePerPlace;
          }
        } catch (error) {
          console.error(`Error calculating route to ${place.name}:`, error);
        }
      }

      placesWithRouteData.push(placeWithRoute);
    }

    setPlacesWithRoutes(placesWithRouteData);
    setTotalEstimatedTime(cumulativeTime + (places.length * visitTimePerPlace));
    setIsCalculatingRoutes(false);
  }, []);

  // Recalculate routes when day changes
  useEffect(() => {
    if (!trip) return;
    
    const currentDay = trip.days[currentDayIndex];
    if (!currentDay) return;

    const confirmedPlaces = trip.places.filter((p) => p.confirmed);
    const todayPlaces = confirmedPlaces
      .filter((p) => currentDay.places.includes(p.id))
      .sort((a, b) => {
        const aIndex = currentDay.places.indexOf(a.id);
        const bIndex = currentDay.places.indexOf(b.id);
        return aIndex - bIndex;
      });

    // Only calculate for remaining places
    const remainingPlaces = todayPlaces.filter(
      (p) => !completedPlaces.has(p.id) && !skippedPlaces.has(p.id)
    );

    calculateRoutesForDay(remainingPlaces, trip.hotel.coordinates);
  }, [trip, currentDayIndex, completedPlaces, skippedPlaces, calculateRoutesForDay]);

  const handleTogglePlace = (placeId: string) => {
    const newCompleted = new Set(completedPlaces);
    if (newCompleted.has(placeId)) {
      newCompleted.delete(placeId);
    } else {
      newCompleted.add(placeId);
    }
    setCompletedPlaces(newCompleted);
    
    // Save to localStorage
    if (trip) {
      localStorage.setItem(
        `trip_${trip.id}_completed`,
        JSON.stringify(Array.from(newCompleted))
      );
    }
  };

  const handleSkipPlace = (placeId: string) => {
    const newSkipped = new Set(skippedPlaces);
    if (newSkipped.has(placeId)) {
      newSkipped.delete(placeId);
    } else {
      newSkipped.add(placeId);
      // Remove from completed if it was completed
      const newCompleted = new Set(completedPlaces);
      newCompleted.delete(placeId);
      setCompletedPlaces(newCompleted);
      if (trip) {
        localStorage.setItem(
          `trip_${trip.id}_completed`,
          JSON.stringify(Array.from(newCompleted))
        );
      }
    }
    setSkippedPlaces(newSkipped);
    
    // Save to localStorage
    if (trip) {
      localStorage.setItem(
        `trip_${trip.id}_skipped`,
        JSON.stringify(Array.from(newSkipped))
      );
    }
  };

  const handleReoptimize = async () => {
    if (!trip || !currentDay || remainingPlaces.length < 2) {
      return;
    }

    setIsReoptimizing(true);

    try {
      // Get current location (use hotel as starting point, or first remaining place)
      let startCoords: Coordinates = trip.hotel.coordinates;
      if (remainingPlaces[0]?.coordinates) {
        startCoords = remainingPlaces[0].coordinates;
      }

      // Get all remaining places with coordinates
      const placesToOptimize = remainingPlaces.filter(
        (p) => p.coordinates && p.coordinates.lat !== 0 && p.coordinates.lng !== 0
      );

      if (placesToOptimize.length < 2) {
        setIsReoptimizing(false);
        return;
      }

      // Calculate optimal order using nearest neighbor heuristic
      const optimizedOrder: Place[] = [];
      let currentLocation = startCoords;
      const remaining = [...placesToOptimize];

      while (remaining.length > 0) {
        // Find nearest place to current location
        let nearestIndex = 0;
        let nearestDistance = Infinity;

        for (let i = 0; i < remaining.length; i++) {
          const place = remaining[i];
          if (!place.coordinates) continue;

          const distance = calculateDistance(currentLocation, place.coordinates);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = i;
          }
        }

        const nearest = remaining.splice(nearestIndex, 1)[0];
        optimizedOrder.push(nearest);
        if (nearest.coordinates) {
          currentLocation = nearest.coordinates;
        }
      }

      // Update day with optimized order
      const optimizedPlaceIds = [
        ...todayPlaces.filter((p) => completedPlaces.has(p.id)).map((p) => p.id),
        ...optimizedOrder.map((p) => p.id),
      ];

      const updatedDays = trip.days.map((day) =>
        day.id === currentDay.id
          ? { ...day, places: optimizedPlaceIds }
          : day
      );

      const updatedTrip = {
        ...trip,
        days: updatedDays,
        updatedAt: new Date().toISOString(),
      };

      updateTrip(trip.id, updatedTrip);
      setTrip(updatedTrip);
    } catch (error) {
      console.error("Error re-optimizing:", error);
    } finally {
      setIsReoptimizing(false);
    }
  };

  const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
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
    return R * c;
  };

  const findNearbyAlternatives = async (place: Place) => {
    if (!place.coordinates || !trip) return [];

    let sameCategoryPlaces = trip.places.filter(
      (p) =>
        p.id !== place.id &&
        p.confirmed &&
        p.coordinates &&
        p.category === place.category &&
        !currentDay?.places.includes(p.id) &&
        !completedPlaces.has(p.id) &&
        !skippedPlaces.has(p.id)
    );
    
    if (trip.travelerContext.tags && trip.travelerContext.tags.length > 0) {
      const tags = trip.travelerContext.tags;
      sameCategoryPlaces = sameCategoryPlaces.filter((p) => {
        if (tags.includes("food-first") && place.category === "food") return true;
        if (tags.includes("nightlife") && place.category === "nightlife") return true;
        if (tags.includes("culture") && (place.category === "attraction" || place.category === "museum" || place.category === "religious")) return true;
        if (tags.includes("adventure") && place.category === "adventure") return true;
        if (tags.includes("luxury") && (place.category === "wellness" || place.category === "entertainment")) return true;
        if (tags.includes("budget") && (place.category === "shopping" || place.category === "food")) return true;
        if (tags.includes("family-friendly") && (place.category === "entertainment" || place.category === "nature" || place.category === "beach")) return true;
        if (tags.includes("educational") && (place.category === "museum" || place.category === "religious")) return true;
        if (tags.includes("nature") && (place.category === "nature" || place.category === "beach")) return true;
        if (tags.includes("romantic") && p.vibe === "romantic") return true;
        if (tags.includes("chill") && (p.vibe === "chill" || place.category === "nature" || place.category === "beach" || place.category === "wellness")) return true;
        return true;
      });
    }

    const alternatives = sameCategoryPlaces
      .map((p) => ({
        place: p,
        distance: calculateDistance(place.coordinates!, p.coordinates!),
      }))
      .filter((a) => a.distance < 5000)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    return alternatives;
  };

  const getGoogleMapsUrl = (place: Place, mode: 'place' | 'directions' = 'place') => {
    if (!place.coordinates) return '';
    
    if (mode === 'directions') {
      const destination = `${place.coordinates.lat},${place.coordinates.lng}`;
      return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    }
    
    if (place.placeId) {
      return `https://www.google.com/maps/place/?q=place_id:${place.placeId}`;
    }
    
    const query = encodeURIComponent(place.name);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  // Keyboard shortcuts - must be before conditional returns
  useEffect(() => {
    if (!trip || loading) return;

    // Compute nextPlace for keyboard shortcuts
    const confirmedPlaces = trip.places.filter((p) => p.confirmed);
    const currentDay = trip.days[currentDayIndex];
    const todayPlaces = currentDay
      ? confirmedPlaces
          .filter((p) => currentDay.places.includes(p.id))
          .sort((a, b) => {
            const aIndex = currentDay.places.indexOf(a.id);
            const bIndex = currentDay.places.indexOf(b.id);
            return aIndex - bIndex;
          })
      : [];
    const remainingPlaces = todayPlaces.filter(
      (p) => !completedPlaces.has(p.id) && !skippedPlaces.has(p.id)
    );
    const nextPlace = remainingPlaces[0];

    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      // Spacebar to toggle next place
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        if (nextPlace) {
          const newCompleted = new Set(completedPlaces);
          if (newCompleted.has(nextPlace.id)) {
            newCompleted.delete(nextPlace.id);
          } else {
            newCompleted.add(nextPlace.id);
          }
          setCompletedPlaces(newCompleted);
          localStorage.setItem(
            `trip_${trip.id}_completed`,
            JSON.stringify(Array.from(newCompleted))
          );
        }
      }

      // Arrow keys to navigate days
      if (e.key === 'ArrowLeft' && currentDayIndex > 0) {
        setCurrentDayIndex(currentDayIndex - 1);
      }
      if (e.key === 'ArrowRight' && currentDayIndex < trip.days.length - 1) {
        setCurrentDayIndex(currentDayIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [trip, loading, currentDayIndex, completedPlaces, skippedPlaces]);

  const getDayDate = (dayIndex: number): Date | null => {
    if (!trip?.startDate) return null;
    const startDate = new Date(trip.startDate);
    return new Date(startDate.getTime() + dayIndex * 24 * 60 * 60 * 1000);
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
  const currentDay = trip.days[currentDayIndex];
  const todayPlaces = currentDay
    ? confirmedPlaces
        .filter((p) => currentDay.places.includes(p.id))
        .sort((a, b) => {
          const aIndex = currentDay.places.indexOf(a.id);
          const bIndex = currentDay.places.indexOf(b.id);
          return aIndex - bIndex;
        })
    : [];

  const remainingPlaces = todayPlaces.filter(
    (p) => !completedPlaces.has(p.id) && !skippedPlaces.has(p.id)
  );
  const completedCount = todayPlaces.filter((p) => completedPlaces.has(p.id)).length;
  const skippedCount = todayPlaces.filter((p) => skippedPlaces.has(p.id)).length;
  const nextPlace = remainingPlaces[0];
  const dayDate = getDayDate(currentDayIndex);

  return (
    <main className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Fixed Header */}
      <div className="border-b bg-background z-20 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/trips/${trip.id}/itinerary`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold">{trip.destination.split(',')[0]}</h1>
              {dayDate && (
                <p className="text-xs text-muted-foreground">
                  Day {currentDayIndex + 1} • {dayDate.toLocaleDateString("en-US", { 
                    weekday: "long",
                    month: "short", 
                    day: "numeric" 
                  })}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Navigation */}
            <Link href={`/trips/${trip.id}/days`}>
              <Button variant="ghost" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Days
              </Button>
            </Link>
            <Link href={`/trips/${trip.id}/itinerary`}>
              <Button variant="ghost" size="sm">
                <MapIcon className="h-4 w-4 mr-2" />
                Map
              </Button>
            </Link>
          </div>
          </div>

        {/* Day Selector & Progress */}
          {trip.days.length > 1 && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {trip.days.map((day, index) => {
                const dayDate = getDayDate(index);
                const dayPlaces = confirmedPlaces.filter(p => day.places.includes(p.id));
                const dayCompleted = dayPlaces.filter(p => completedPlaces.has(p.id)).length;
                const isActive = currentDayIndex === index;
                
                return (
                  <button
                    key={day.id}
                    onClick={() => setCurrentDayIndex(index)}
                    className={`
                      relative flex flex-col items-start gap-1 px-4 py-2.5 rounded-lg border-2 transition-all
                      min-w-[140px] flex-shrink-0 text-left
                      ${isActive 
                        ? 'border-primary bg-primary/10 shadow-sm' 
                        : 'border-border bg-background hover:border-primary/30 hover:bg-accent/50'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-sm font-semibold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                        Day {index + 1}
                      </span>
                      {dayPlaces.length > 0 && (
                        <span className={`text-xs font-medium ${isActive ? 'text-primary/80' : 'text-muted-foreground'}`}>
                          {dayCompleted}/{dayPlaces.length}
                        </span>
                      )}
                    </div>
                    {dayDate && (
                      <span className={`text-xs ${isActive ? 'text-primary/70' : 'text-muted-foreground'}`}>
                        {dayDate.toLocaleDateString("en-US", { 
                          weekday: "short",
                          month: "short", 
                          day: "numeric" 
                        })}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            
            {remainingPlaces.length >= 2 && (
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleReoptimize}
                  disabled={isReoptimizing}
                >
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isReoptimizing ? "animate-spin" : ""}`} />
                  Re-optimize Route
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Progress Bar */}
        {currentDay && todayPlaces.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs font-medium">
                {completedCount} completed • {skippedCount} skipped • {remainingPlaces.length} remaining
                {totalEstimatedTime > 0 && (
                  <span className="ml-2 text-muted-foreground">
                    • ~{Math.round(totalEstimatedTime / 60)}h {totalEstimatedTime % 60}m estimated
                  </span>
                )}
              </div>
                </div>
            <div className="w-full bg-secondary rounded-full h-2">
                  <div
                className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: `${(completedCount / todayPlaces.length) * 100}%`,
                    }}
                  />
                </div>
            </div>
          )}
      </div>

      {/* Main Content - Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Map */}
        <div className="w-1/2 border-r relative">
          {trip.hotel.coordinates.lat !== 0 ? (
            <Map
              center={trip.hotel.coordinates}
              hotel={{
                name: trip.hotel.name,
                coordinates: trip.hotel.coordinates,
              }}
              routes={[]}
              places={remainingPlaces}
              height="100%"
              showNumberedMarkers={true}
              selectedDayIndex={currentDayIndex}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Map not available</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Places List */}
        <div className="w-1/2 overflow-y-auto bg-background">
          {!currentDay ? (
            <div className="p-8 text-center">
              <Navigation className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                No days organized yet. Organize your itinerary first.
              </p>
              <Link href={`/trips/${trip.id}/days`}>
                <Button variant="outline">Organize Days</Button>
              </Link>
            </div>
          ) : todayPlaces.length === 0 ? (
            <div className="p-8 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No places assigned to this day yet.</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Next Place Highlight Card */}
              {nextPlace && (
                <div>
                  <div className="mb-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Next Stop
                    </h2>
                  </div>
                  <Card className="border-primary/50 bg-primary/5 shadow-lg">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-3">
                            <Compass className="h-4 w-4 text-primary" />
                            <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                              Navigate Here
                            </span>
                          </div>
                          <h2 className="text-xl font-bold mb-2">{nextPlace.name}</h2>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                            {(() => {
                              const Icon = getCategoryIcon(nextPlace.category);
                              return <Icon className="h-4 w-4" />;
                            })()}
                            <span>{getCategoryLabel(nextPlace.category)}</span>
                          </div>
                          <div className="flex gap-2">
                            {nextPlace.coordinates && (
                              <>
                                <a
                                  href={getGoogleMapsUrl(nextPlace, 'directions')}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button size="sm">
                                    <Navigation className="h-4 w-4 mr-2" />
                                    Directions
                                  </Button>
                                </a>
                                <a
                                  href={getGoogleMapsUrl(nextPlace, 'place')}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button size="sm" variant="outline">
                                    <MapIcon className="h-4 w-4 mr-2" />
                                    View On Maps
                                  </Button>
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          size="lg"
                          className="h-auto px-6 py-3 rounded-lg flex-shrink-0 shadow-md hover:shadow-lg transition-all"
                          onClick={() => handleTogglePlace(nextPlace.id)}
                        >
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                          <span className="font-semibold">Mark Visited</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-border"></div>

              {/* Hotel Reference Section */}
              <div>
                <div className="mb-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Your Hotel
                  </h2>
                </div>
                <Card className="border-dashed border-2">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Hotel className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold truncate">{trip.hotel.name}</p>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">{trip.hotel.address}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Divider */}
              <div className="border-t border-border"></div>

              {/* Places List Section */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Today's Route
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {todayPlaces.length} {todayPlaces.length === 1 ? 'place' : 'places'}
                  </span>
                </div>

                {/* Places List */}
                <div className="space-y-3">
                  {todayPlaces.map((place, index) => {
                    const isCompleted = completedPlaces.has(place.id);
                    const isSkipped = skippedPlaces.has(place.id);
                const isNext = !isCompleted && !isSkipped && nextPlace?.id === place.id;
                const isExpanded = expandedPlace === place.id;
                const placeRouteData = placesWithRoutes.find(p => p.id === place.id);

                    return (
                      <Card
                        key={place.id}
                        className={`transition-all ${
                      isNext ? "border-primary/50 shadow-md" : ""
                    } ${isCompleted ? "opacity-60" : ""} ${isSkipped ? "opacity-40" : ""}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Number/Status Badge */}
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div
                            className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold text-sm ${
                                  isCompleted
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : isSkipped
                                    ? "bg-muted border-muted-foreground text-muted-foreground"
                                    : isNext
                                ? "border-primary text-primary bg-primary/10"
                                : "border-muted-foreground text-muted-foreground bg-background"
                                }`}
                              >
                                {isCompleted ? (
                              <CheckCircle2 className="h-5 w-5" />
                                ) : isSkipped ? (
                              <X className="h-5 w-5" />
                                ) : (
                              <span>{index + 1}</span>
                                )}
                              </div>
                              {index < todayPlaces.length - 1 && (
                                <div
                              className={`w-0.5 flex-1 min-h-[24px] mt-2 ${
                                    isCompleted ? "bg-primary" : "bg-border"
                                  }`}
                                />
                              )}
                            </div>

                        {/* Place Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className={`text-base font-semibold ${isSkipped ? "line-through" : ""}`}>
                                {place.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                      {(() => {
                                        const Icon = getCategoryIcon(place.category);
                                    return <Icon className="h-4 w-4" />;
                                      })()}
                                      <span>{getCategoryLabel(place.category)}</span>
                                </div>
                                {placeRouteData?.estimatedArrival && !isCompleted && !isSkipped && (
                                  <>
                                    <span className="text-muted-foreground">•</span>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      <span>~{placeRouteData.estimatedArrival}</span>
                                    </div>
                                      </>
                                    )}
                                {placeRouteData?.travelTimeFromPrevious !== undefined && index > 0 && !isCompleted && !isSkipped && (
                                  <>
                                    <span className="text-muted-foreground">•</span>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Route className="h-3 w-3" />
                                      <span>{placeRouteData.travelTimeFromPrevious} min</span>
                                      {placeRouteData.distanceFromPrevious && (
                                        <span className="ml-1">
                                          ({Math.round(placeRouteData.distanceFromPrevious / 1000)}km)
                                        </span>
                                      )}
                                    </div>
                                      </>
                                    )}
                                  </div>
                              {place.area && (
                                <p className="text-xs text-muted-foreground mt-1">{place.area}</p>
                              )}
                                </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              <div className="flex gap-1">
                                  {!isSkipped && (
                                    <Button
                                      variant={isCompleted ? "outline" : "default"}
                                      size="sm"
                                    className="h-8 w-8 p-0"
                                      onClick={() => handleTogglePlace(place.id)}
                                    title={isCompleted ? "Mark as not visited" : "Mark as visited"}
                                    >
                                      {isCompleted ? (
                                      <CheckCircle2 className="h-4 w-4" />
                                      ) : (
                                      <Circle className="h-4 w-4" />
                                      )}
                                    </Button>
                                  )}
                                  <Button
                                    variant={isSkipped ? "default" : "outline"}
                                    size="sm"
                                  className="h-8 w-8 p-0"
                                    onClick={() => handleSkipPlace(place.id)}
                                  title={isSkipped ? "Unskip" : "Skip"}
                                  >
                                  <X className="h-4 w-4" />
                                  </Button>
                                  {!isSkipped && place.coordinates && (
                                  <>
                                    <a
                                      href={getGoogleMapsUrl(place, 'directions')}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        title="Get directions"
                                      >
                                        <Navigation className="h-4 w-4" />
                                      </Button>
                                    </a>
                                    <a
                                      href={getGoogleMapsUrl(place, 'place')}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        title="Open in Google Maps"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </Button>
                                    </a>
                                  </>
                                )}
                                {!isSkipped && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => {
                                      if (isExpanded) {
                                        setExpandedPlace(null);
                                        } else {
                                        setExpandedPlace(place.id);
                                        if (showAlternatives !== place.id) {
                                          setShowAlternatives(null);
                                        }
                                      }
                                    }}
                                    title="More options"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                    </Button>
                                  )}
                              </div>
                            </div>
                          </div>

                          {/* Expanded Options */}
                          {isExpanded && !isSkipped && (
                            <div className="mt-3 pt-3 border-t space-y-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs"
                                onClick={async () => {
                                  setLoadingAlternatives(true);
                                  const alts = await findNearbyAlternatives(place);
                                  setAlternatives(alts);
                                  setLoadingAlternatives(false);
                                  setShowAlternatives(place.id);
                                }}
                                disabled={loadingAlternatives}
                              >
                                <Search className="h-3.5 w-3.5 mr-1.5" />
                                {loadingAlternatives ? "Finding..." : "Find Alternatives"}
                              </Button>

                              {/* Alternatives */}
                              {showAlternatives === place.id && alternatives.length > 0 && (
                                <div className="space-y-2 pt-2">
                                  <p className="text-xs font-semibold text-muted-foreground">Nearby Alternatives</p>
                                  {alternatives.map((alt) => (
                                    <div
                                      key={alt.place.id}
                                      className="flex items-center justify-between p-2 border rounded hover:border-primary/30 transition-colors"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium truncate">{alt.place.name}</p>
                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                                          <span>{Math.round(alt.distance / 1000)}km away</span>
                                          <span>•</span>
                                          <div className="flex items-center gap-1">
                                            {(() => {
                                              const Icon = getCategoryIcon(alt.place.category);
                                              return <Icon className="h-3 w-3" />;
                                            })()}
                                            <span>{getCategoryLabel(alt.place.category)}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 text-xs px-2 ml-2"
                                        onClick={() => {
                                          if (trip && currentDay) {
                                            const updatedDays = trip.days.map((day) =>
                                              day.id === currentDay.id
                                                ? { ...day, places: [...day.places, alt.place.id] }
                                                : day
                                            );
                                            const updatedTrip = {
                                              ...trip,
                                              days: updatedDays,
                                              updatedAt: new Date().toISOString(),
                                            };
                                            updateTrip(trip.id, updatedTrip);
                                            setTrip(updatedTrip);
                                            setShowAlternatives(null);
                                            setAlternatives([]);
                                            setExpandedPlace(null);
                                          }
                                        }}
                                      >
                                        Add
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}

                {/* Loading indicator for route calculation */}
                {isCalculatingRoutes && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin inline-block mr-2" />
                    Calculating routes...
                  </div>
                )}
              </div>
            </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
