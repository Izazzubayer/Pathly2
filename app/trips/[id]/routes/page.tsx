"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTripById, updateTrip } from "@/lib/storage";
import { calculateRoute, findPlacesAlongRoute, geocodePlaceName, discoverPlacesAlongRoute } from "@/lib/routes-api";
import { getCategoryIcon, getCategoryLabel } from "@/lib/category-utils";
import { Map } from "@/components/map";
import { PlacesAutocomplete } from "@/components/places-autocomplete";
import { ArrowLeft, ArrowRight, Plus, MapPin, Route, Check, X, Clock, Loader2, Map as MapIcon, Sparkles, Star } from "lucide-react";
import type { Trip, Route as RouteType, Place, Coordinates } from "@/types";

// Color mapping for place types - using shadcn theme colors
const getPlaceTypeColor = (type: string): string => {
  return 'bg-secondary text-secondary-foreground border-border';
};

export default function RoutesPage() {
  const params = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewRoute, setShowNewRoute] = useState(false);
  const [routeStart, setRouteStart] = useState("");
  const [routeEnd, setRouteEnd] = useState("");
  const [routeStartCoords, setRouteStartCoords] = useState<Coordinates | null>(null);
  const [routeEndCoords, setRouteEndCoords] = useState<Coordinates | null>(null);
  const [routeStartName, setRouteStartName] = useState("");
  const [routeEndName, setRouteEndName] = useState("");
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  const [routePlacesLoading, setRoutePlacesLoading] = useState<Set<string>>(new Set());
  const [discoveringPlaces, setDiscoveringPlaces] = useState(false);
  const [discoveredPlaces, setDiscoveredPlaces] = useState<Array<{
    name: string;
    placeId: string;
    coordinates: { lat: number; lng: number };
    types: string[];
    rating?: number;
    detourCost: number;
  }>>([]);

  useEffect(() => {
    const tripId = params.id as string;
    const tripData = getTripById(tripId);
    setTrip(tripData);
    setLoading(false);

    if (!tripData) {
      router.push("/");
    }
  }, [params.id, router]);

  const handleCreateRoute = async () => {
    if (!trip || !routeEnd.trim()) return;

    setIsCreatingRoute(true);

    try {
      // Use coordinates from autocomplete if available, otherwise use hotel as start
      let startCoords: Coordinates;
      if (routeStartCoords) {
        startCoords = routeStartCoords;
      } else if (trip.hotel.coordinates) {
        startCoords = trip.hotel.coordinates;
      } else {
        alert("Hotel location is required. Please set hotel coordinates first.");
        setIsCreatingRoute(false);
        return;
      }
      
      // Use coordinates from autocomplete if available, otherwise geocode
      let endCoords: Coordinates;
      if (routeEndCoords) {
        endCoords = routeEndCoords;
      } else {
        const geocoded = await geocodePlaceName(routeEnd, trip.destination);
        if (!geocoded) {
          alert("Could not find the end location. Please try a more specific address.");
          setIsCreatingRoute(false);
          return;
        }
        endCoords = geocoded;
      }

      // Calculate route
      console.log("🔍 Starting route calculation...");
      console.log("Start coords:", startCoords);
      console.log("End coords:", endCoords);
      
      const routeData = await calculateRoute(startCoords, endCoords);
      
      if (!routeData) {
        console.error("❌ Route calculation failed");
        alert("Could not calculate route. Please check:\n1. Directions API is enabled in Google Cloud Console\n2. Your API key has Directions API access\n3. Check browser console for details");
        setIsCreatingRoute(false);
        return;
      }
      
      console.log("✅ Route calculated successfully:", routeData);

      // Create route
      const newRoute: RouteType = {
        id: `route_${Date.now()}`,
        start: startCoords,
        end: endCoords,
        startLabel: routeStartName || routeStart || trip.hotel.name,
        endLabel: routeEndName || routeEnd,
        places: [],
        baseDuration: Math.round(routeData.duration / 60), // Convert to minutes
        polyline: routeData.polyline, // Store polyline for map visualization
      };

      // Find places along route
      const confirmedPlaces = trip.places.filter((p) => p.confirmed && p.coordinates);
      const placesAlongRoute = await findPlacesAlongRoute(
        confirmedPlaces,
        startCoords,
        endCoords,
        routeData.steps
      );

      // Add places to route
      newRoute.places = placesAlongRoute.map((pa, index) => ({
        placeId: pa.place.id,
        order: index,
        detourCost: pa.detourCost,
      }));

      const updatedRoutes = [...trip.routes, newRoute];
      const updatedTrip = {
        ...trip,
        routes: updatedRoutes,
        updatedAt: new Date().toISOString(),
      };
      updateTrip(trip.id, updatedTrip);
      setTrip(updatedTrip);

      // Discover new places along this route
      console.log("🔍 Discovering places along route...");
      setDiscoveringPlaces(true);
      try {
        const discovered = await discoverPlacesAlongRoute(
          startCoords,
          endCoords,
          routeData.steps
        );
        console.log(`✅ Discovered ${discovered.length} places`);
        setDiscoveredPlaces(discovered);
      } catch (error) {
        console.error("Error discovering places:", error);
      } finally {
        setDiscoveringPlaces(false);
      }

      setShowNewRoute(false);
      setRouteStart("");
      setRouteEnd("");
      setRouteStartCoords(null);
      setRouteEndCoords(null);
      setRouteStartName("");
      setRouteEndName("");
    } catch (error) {
      console.error("Error creating route:", error);
      alert("Failed to create route. Please try again.");
    } finally {
      setIsCreatingRoute(false);
    }
  };

  const handleAcceptPlace = async (routeId: string, placeId: string) => {
    if (!trip) return;

    setRoutePlacesLoading((prev) => new Set(prev).add(placeId));

    try {
      const route = trip.routes.find((r) => r.id === routeId);
      if (!route) return;

      const place = trip.places.find((p) => p.id === placeId);
      if (!place || !place.coordinates) return;

      // Calculate detour cost for this place
      const placesAlongRoute = await findPlacesAlongRoute(
        [place],
        route.start,
        route.end
      );

      const detourCost = placesAlongRoute[0]?.detourCost || 5;

      const updatedRoutes = trip.routes.map((r) => {
        if (r.id === routeId) {
          const existingIndex = r.places.findIndex((p) => p.placeId === placeId);
          if (existingIndex === -1) {
            return {
              ...r,
              places: [
                ...r.places,
                {
                  placeId,
                  order: r.places.length,
                  detourCost,
                },
              ],
            };
          }
        }
        return r;
      });
      const updatedTrip = { ...trip, routes: updatedRoutes, updatedAt: new Date().toISOString() };
      updateTrip(trip.id, updatedTrip);
      setTrip(updatedTrip);
    } catch (error) {
      console.error("Error adding place to route:", error);
    } finally {
      setRoutePlacesLoading((prev) => {
        const next = new Set(prev);
        next.delete(placeId);
        return next;
      });
    }
  };

  const handleSkipPlace = (routeId: string, placeId: string) => {
    if (!trip) return;
    const updatedRoutes = trip.routes.map((route) => {
      if (route.id === routeId) {
        return {
          ...route,
          places: route.places.filter((p) => p.placeId !== placeId),
        };
      }
      return route;
    });
    const updatedTrip = { ...trip, routes: updatedRoutes, updatedAt: new Date().toISOString() };
    updateTrip(trip.id, updatedTrip);
    setTrip(updatedTrip);
  };

  const handleAddDiscoveredPlace = (discoveredPlace: any) => {
    if (!trip) return;

    // Add to trip places
    const newPlace: Place = {
      id: `place_${Date.now()}`,
      name: discoveredPlace.name,
      category: "other", // Will be inferred from types
      coordinates: discoveredPlace.coordinates,
      placeId: discoveredPlace.placeId,
      confidence: 1.0,
      source: "Discovered along route",
      confirmed: true, // Auto-confirm discovered places
      validated: true,
    };

    const updatedTrip = {
      ...trip,
      places: [...trip.places, newPlace],
      updatedAt: new Date().toISOString(),
    };

    updateTrip(trip.id, updatedTrip);
    setTrip(updatedTrip);

    // Remove from discovered list
    setDiscoveredPlaces(prev => prev.filter(p => p.placeId !== discoveredPlace.placeId));
  };

  const handleDismissDiscoveredPlace = (placeId: string) => {
    setDiscoveredPlaces(prev => prev.filter(p => p.placeId !== placeId));
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
              <h1 className="text-3xl font-semibold tracking-tight">Plan Routes</h1>
              <p className="text-muted-foreground mt-1">
                Define routes and discover places <strong>along the way</strong>, not just nearby.
              </p>
            </div>
          </div>

          {/* Hotel Anchor */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Hotel</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{trip.hotel.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                All routes start from here by default
              </p>
            </CardContent>
          </Card>

          {/* New Route Form */}
          {showNewRoute ? (
            <Card>
              <CardHeader>
                <CardTitle>Create New Route</CardTitle>
                <CardDescription>
                  Define a route from start to end. We'll find places along the way.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="route-start">Start Location</Label>
                    <PlacesAutocomplete
                      id="route-start"
                      value={routeStart}
                      onChange={setRouteStart}
                      onSelect={(place) => {
                        setRouteStart(place.name); // Display the name in the input
                        setRouteStartName(place.name);
                        if (place.coordinates) {
                          setRouteStartCoords(place.coordinates);
                        } else {
                          setRouteStartCoords(null);
                        }
                      }}
                      placeholder={`Search for location (e.g., ${trip.hotel.name})`}
                      types={[]} // No type restriction - allow all places (hotels, restaurants, attractions, etc.)
                    />
                    <p className="text-xs text-muted-foreground">
                      {routeStart ? (
                        routeStartCoords ? (
                          "Location selected with coordinates"
                        ) : (
                          "Location selected but coordinates not available"
                        )
                      ) : (
                        `Leave empty to use hotel as start (${trip.hotel.name})`
                      )}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="route-end">End Location</Label>
                    <PlacesAutocomplete
                      id="route-end"
                      value={routeEnd}
                      onChange={setRouteEnd}
                      onSelect={(place) => {
                        setRouteEnd(place.name); // Display the name in the input
                        setRouteEndName(place.name);
                        if (place.coordinates) {
                          setRouteEndCoords(place.coordinates);
                        } else {
                          setRouteEndCoords(null);
                        }
                      }}
                      placeholder="Search for location (e.g., ICONSIAM, Bangkok)"
                      types={[]} // No type restriction - allow all places
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      {routeEnd ? (
                        routeEndCoords ? (
                          "Location selected with coordinates"
                        ) : (
                          "Location selected but coordinates not available"
                        )
                      ) : (
                        "Search and select the end location for your route"
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowNewRoute(false);
                        setRouteStart("");
                        setRouteEnd("");
                        setRouteStartCoords(null);
                        setRouteEndCoords(null);
                        setRouteStartName("");
                        setRouteEndName("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateRoute} 
                      className="flex-1"
                      disabled={isCreatingRoute}
                    >
                      {isCreatingRoute ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Calculating Route...
                        </>
                      ) : (
                        "Create Route"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button onClick={() => setShowNewRoute(true)} variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Create New Route
            </Button>
          )}

          {/* Routes List */}
          {trip.routes.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Route className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No routes created yet. Create your first route to discover places along the way.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {trip.routes.map((route) => {
                const routePlaces = route.places
                  .map((rp) => {
                    const place = confirmedPlaces.find((p) => p.id === rp.placeId);
                    return place ? { ...place, detourCost: rp.detourCost, order: rp.order } : null;
                  })
                  .filter((p): p is Place & { detourCost: number; order: number } => p !== null)
                  .sort((a, b) => a.order - b.order);

                const suggestedPlaces = confirmedPlaces.filter(
                  (p) => !route.places.some((rp) => rp.placeId === p.id)
                );

                return (
                  <Card key={route.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Route className="h-5 w-5" />
                            Route
                          </CardTitle>
                          <CardDescription className="mt-1">
                            <span className="font-medium">{route.startLabel || trip.hotel.name}</span>
                            {" → "}
                            <span className="font-medium">{route.endLabel || "End location"}</span>
                            {route.baseDuration > 0 && (
                              <span className="ml-2">• {route.baseDuration} min</span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Route Map */}
                      {route.start.lat !== 0 && route.end.lat !== 0 && (
                        <div className="mb-4">
                          <Map
                            center={{
                              lat: (route.start.lat + route.end.lat) / 2,
                              lng: (route.start.lng + route.end.lng) / 2,
                            }}
                            hotel={trip.hotel.coordinates.lat !== 0 ? {
                              name: trip.hotel.name,
                              coordinates: trip.hotel.coordinates,
                            } : undefined}
                            routes={[route]}
                            places={routePlaces}
                            height="250px"
                            className="rounded-lg border"
                          />
                        </div>
                      )}

                      {/* Places along route */}
                      {routePlaces.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold">Places Along Route</h4>
                          {routePlaces.map((place) => (
                            <div
                              key={place.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex-1">
                                <p className="font-medium">{place.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    {(() => {
                                      const Icon = getCategoryIcon(place.category);
                                      return <Icon className="h-3 w-3" />;
                                    })()}
                                    <span>{getCategoryLabel(place.category)}</span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {place.detourCost === 0 ? "On route" : `+${place.detourCost} min`}
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSkipPlace(route.id, place.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Suggested places */}
                      {suggestedPlaces.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold">Suggested Places</h4>
                          <p className="text-xs text-muted-foreground">
                            Places that could fit along this route
                          </p>
                          {suggestedPlaces.slice(0, 3).map((place) => (
                            <div
                              key={place.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex-1">
                                <p className="font-medium">{place.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    {(() => {
                                      const Icon = getCategoryIcon(place.category);
                                      return <Icon className="h-3 w-3" />;
                                    })()}
                                    <span>{getCategoryLabel(place.category)}</span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    Click to calculate detour
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAcceptPlace(route.id, place.id)}
                                disabled={routePlacesLoading.has(place.id)}
                              >
                                {routePlacesLoading.has(place.id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {routePlaces.length === 0 && suggestedPlaces.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No places available for this route yet. Confirm places in the extraction step.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Discovered Places Along Route */}
          {discoveringPlaces && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                  <div>
                    <p className="font-semibold">Discovering places along your route...</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Finding restaurants, cafes, attractions, and more
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!discoveringPlaces && discoveredPlaces.length > 0 && (
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Discovered Places Along Your Route
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {discoveredPlaces.length} places found within 2km of your route
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDiscoveredPlaces([])}
                  >
                    Dismiss All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {discoveredPlaces.map((place) => (
                    <div
                      key={place.placeId}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:border-primary/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold">{place.name}</h4>
                        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                          {place.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span>{place.rating.toFixed(1)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>+{place.detourCost} min detour</span>
                          </div>
                          {place.types && place.types.length > 0 && (
                            <span className={`text-xs px-2 py-0.5 rounded capitalize border ${getPlaceTypeColor(place.types[0])}`}>
                              {place.types[0].replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddDiscoveredPlace(place)}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Add
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDismissDiscoveredPlace(place.placeId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Continue Button */}
          {trip.routes.length > 0 && (
            <div className="flex justify-end">
              <Link href={`/trips/${trip.id}/days`}>
                <Button>
                  Continue to Day Organization
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

