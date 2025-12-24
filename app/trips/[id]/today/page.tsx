"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTripById, updateTrip } from "@/lib/storage";
import { calculateRoute, findPlacesAlongRoute } from "@/lib/routes-api";
import { ArrowLeft, MapPin, CheckCircle2, Circle, Navigation, RefreshCw, X, Search } from "lucide-react";
import { getCategoryIcon, getCategoryLabel } from "@/lib/category-utils";
import type { Trip, Place, Coordinates } from "@/types";

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
      alert("Need at least 2 remaining places to re-optimize");
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
        alert("Need at least 2 places with coordinates to optimize");
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

      alert(`Route re-optimized! ${optimizedOrder.length} places reordered for efficiency.`);
    } catch (error) {
      console.error("Error re-optimizing:", error);
      alert("Failed to re-optimize route. Please try again.");
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

    // Find places of the same category that are nearby but not in current day
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
    
    // Filter by traveler context tags if available
    if (trip.travelerContext.tags && trip.travelerContext.tags.length > 0) {
      const tags = trip.travelerContext.tags;
      
      // Prioritize places that match traveler preferences
      sameCategoryPlaces = sameCategoryPlaces.filter((p) => {
        // If food-first tag, only show food places
        if (tags.includes("food-first") && place.category === "food") {
          return true;
        }
        // If nightlife tag, prioritize nightlife venues
        if (tags.includes("nightlife") && place.category === "nightlife") {
          return true;
        }
        // If culture tag, prioritize cultural places
        if (tags.includes("culture") && (place.category === "attraction" || place.category === "museum" || place.category === "religious")) {
          return true;
        }
        // If adventure tag, prioritize adventure activities
        if (tags.includes("adventure") && place.category === "adventure") {
          return true;
        }
        // If luxury tag, prioritize wellness and entertainment
        if (tags.includes("luxury") && (place.category === "wellness" || place.category === "entertainment")) {
          return true;
        }
        // If budget tag, prioritize shopping and food
        if (tags.includes("budget") && (place.category === "shopping" || place.category === "food")) {
          return true;
        }
        // If family-friendly tag, prioritize family activities
        if (tags.includes("family-friendly") && (place.category === "entertainment" || place.category === "nature" || place.category === "beach")) {
          return true;
        }
        // If educational tag, prioritize museums and religious sites
        if (tags.includes("educational") && (place.category === "museum" || place.category === "religious")) {
          return true;
        }
        // If nature tag, prioritize nature and beach
        if (tags.includes("nature") && (place.category === "nature" || place.category === "beach")) {
          return true;
        }
        // If romantic tag, prioritize romantic vibes
        if (tags.includes("romantic") && p.vibe === "romantic") {
          return true;
        }
        // If chill tag, prioritize chill spots
        if (tags.includes("chill") && (p.vibe === "chill" || place.category === "nature" || place.category === "beach" || place.category === "wellness")) {
          return true;
        }
        // Default: show all same-category places
        return true;
      });
    }

    // Calculate distances and sort
    const alternatives = sameCategoryPlaces
      .map((p) => ({
        place: p,
        distance: calculateDistance(place.coordinates!, p.coordinates!),
      }))
      .filter((a) => a.distance < 5000) // Within 5km
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3); // Top 3 alternatives

    return alternatives;
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

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <Link href={`/trips/${trip.id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Trip
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">In-Trip Navigation</h1>
              <p className="text-muted-foreground mt-1">
                Your active route for {trip.destination}
              </p>
            </div>
          </div>

          {/* Day Selector */}
          {trip.days.length > 1 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {trip.days.map((day, index) => (
                    <Button
                      key={day.id}
                      variant={currentDayIndex === index ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentDayIndex(index)}
                    >
                      Day {index + 1}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Today's Progress */}
          {currentDay && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      Day {currentDayIndex + 1} Progress
                    </CardTitle>
                    <CardDescription>
                      {completedCount} completed • {skippedCount} skipped • {remainingPlaces.length} remaining
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleReoptimize}
                    disabled={isReoptimizing || remainingPlaces.length < 2}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isReoptimizing ? "animate-spin" : ""}`} />
                    Re-optimize
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-secondary rounded-full h-2 mb-4">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: `${(completedCount / todayPlaces.length) * 100}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Today's Route */}
          {currentDay ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Today's Route</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Navigation className="h-4 w-4" />
                  <span>{remainingPlaces.length} remaining</span>
                </div>
              </div>

              {todayPlaces.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        No places assigned to this day yet.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {todayPlaces.map((place, index) => {
                    const isCompleted = completedPlaces.has(place.id);
                    const isSkipped = skippedPlaces.has(place.id);
                    const isNext = !isCompleted && !isSkipped && remainingPlaces[0]?.id === place.id;

                    return (
                      <Card
                        key={place.id}
                        className={`transition-all ${
                          isNext ? "border-primary ring-2 ring-primary/20" : ""
                        } ${isCompleted ? "opacity-60" : ""} ${isSkipped ? "opacity-40 line-through" : ""}`}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="flex flex-col items-center gap-2">
                              <div
                                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                                  isCompleted
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : isSkipped
                                    ? "bg-muted border-muted-foreground text-muted-foreground"
                                    : isNext
                                    ? "border-primary text-primary"
                                    : "border-muted-foreground text-muted-foreground"
                                }`}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : isSkipped ? (
                                  <X className="h-4 w-4" />
                                ) : (
                                  <span className="text-xs font-medium">{index + 1}</span>
                                )}
                              </div>
                              {index < todayPlaces.length - 1 && (
                                <div
                                  className={`w-0.5 h-8 ${
                                    isCompleted ? "bg-primary" : "bg-border"
                                  }`}
                                />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-semibold">{place.name}</h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      {(() => {
                                        const Icon = getCategoryIcon(place.category);
                                        return <Icon className="h-3 w-3" />;
                                      })()}
                                      <span>{getCategoryLabel(place.category)}</span>
                                    </div>
                                    {place.vibe && (
                                      <>
                                        <span className="text-xs text-muted-foreground">•</span>
                                        <span className="text-xs text-muted-foreground capitalize">
                                          {place.vibe}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  {isNext && (
                                    <p className="text-xs text-primary mt-2 font-medium">
                                      Next stop
                                    </p>
                                  )}
                                  {isSkipped && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Skipped
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  {!isSkipped && (
                                    <Button
                                      variant={isCompleted ? "outline" : "default"}
                                      size="sm"
                                      onClick={() => handleTogglePlace(place.id)}
                                    >
                                      {isCompleted ? (
                                        <>
                                          <CheckCircle2 className="mr-2 h-4 w-4" />
                                          Visited
                                        </>
                                      ) : (
                                        <>
                                          <Circle className="mr-2 h-4 w-4" />
                                          Visited
                                        </>
                                      )}
                                    </Button>
                                  )}
                                  <Button
                                    variant={isSkipped ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleSkipPlace(place.id)}
                                  >
                                    {isSkipped ? (
                                      <>
                                        <X className="mr-2 h-4 w-4" />
                                        Unskip
                                      </>
                                    ) : (
                                      <>
                                        <X className="mr-2 h-4 w-4" />
                                        Skip
                                      </>
                                    )}
                                  </Button>
                                  {!isSkipped && place.coordinates && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={async () => {
                                        setLoadingAlternatives(true);
                                        const alts = await findNearbyAlternatives(place);
                                        setAlternatives(alts);
                                        setLoadingAlternatives(false);
                                        if (alts.length > 0) {
                                          setShowAlternatives(place.id);
                                        } else {
                                          alert("No nearby alternatives found");
                                        }
                                      }}
                                      disabled={loadingAlternatives}
                                    >
                                      <Search className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Nearby Alternatives Modal */}
              {showAlternatives && (
                <Card className="border-primary">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Nearby Alternatives</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowAlternatives(null);
                          setAlternatives([]);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardDescription>
                      Similar places nearby that you could visit instead
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingAlternatives ? (
                      <p className="text-sm text-muted-foreground">Loading alternatives...</p>
                    ) : alternatives.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No nearby alternatives found
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {alternatives.map((alt) => (
                          <div
                            key={alt.place.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div>
                              <p className="font-medium">{alt.place.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                              onClick={() => {
                                // Add to current day
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
                                }
                              }}
                            >
                              Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Navigation className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No days organized yet. Organize your itinerary first.
                  </p>
                  <Link href={`/trips/${trip.id}/days`}>
                    <Button variant="outline">Organize Days</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hotel Reference */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Hotel (Anchor)</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{trip.hotel.name}</p>
              <p className="text-sm text-muted-foreground mt-1">{trip.hotel.address}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

