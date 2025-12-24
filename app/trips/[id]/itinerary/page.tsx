"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTripById } from "@/lib/storage";
import { Map } from "@/components/map";
import { ArrowLeft, MapPin, Calendar, Route, CheckCircle2 } from "lucide-react";
import { getCategoryIcon, getCategoryLabel } from "@/lib/category-utils";
import type { Trip, Place } from "@/types";

export default function ItineraryPage() {
  const params = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tripId = params.id as string;
    const tripData = getTripById(tripId);
    setTrip(tripData);
    setLoading(false);

    if (!tripData) {
      router.push("/");
    }
  }, [params.id, router]);

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
              <h1 className="text-3xl font-semibold tracking-tight">Complete Itinerary</h1>
              <p className="text-muted-foreground mt-1">
                Your route-optimized travel plan for {trip.destination}
              </p>
            </div>
          </div>

          {/* Trip Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Trip Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Destination</p>
                  <p className="font-medium">{trip.destination}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hotel</p>
                  <p className="font-medium">{trip.hotel.name}</p>
                </div>
                {trip.startDate && trip.endDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Dates</p>
                    <p className="font-medium">
                      {new Date(trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date(trip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2 pt-2">
                <div>
                  <p className="text-sm text-muted-foreground">Traveler Type</p>
                  <p className="font-medium capitalize">{trip.travelerContext.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Places</p>
                  <p className="font-medium">{confirmedPlaces.length} places</p>
                </div>
              </div>
              
              {/* Map Overview */}
              {trip.hotel.coordinates.lat !== 0 && (
                <div className="mt-4">
                  <Map
                    center={trip.hotel.coordinates}
                    hotel={{
                      name: trip.hotel.name,
                      coordinates: trip.hotel.coordinates,
                    }}
                    routes={trip.routes}
                    places={confirmedPlaces}
                    height="300px"
                    className="rounded-lg border"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Days Itinerary */}
          {trip.days.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No days organized yet. Organize your places into days first.
                  </p>
                  <Link href={`/trips/${trip.id}/days`}>
                    <Button variant="outline">Organize Days</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {trip.days.map((day, dayIndex) => {
                const dayPlaces = confirmedPlaces.filter((p) => day.places.includes(p.id));
                const dayRoutes = trip.routes.filter((r) => day.routes.includes(r.id));

                return (
                  <Card key={day.id}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Day {dayIndex + 1}</CardTitle>
                      </div>
                      <CardDescription>
                        {dayPlaces.length} places • {dayRoutes.length} routes
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Routes */}
                      {dayRoutes.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Route className="h-4 w-4" />
                            Routes
                          </h4>
                          {dayRoutes.map((route) => (
                            <div
                              key={route.id}
                              className="p-3 border rounded-lg bg-secondary/50"
                            >
                              <p className="text-sm">
                                {trip.hotel.name} → End location
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {route.places.length} places along route
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Places */}
                      {dayPlaces.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Places
                          </h4>
                          <div className="space-y-2">
                            {dayPlaces.map((place, placeIndex) => (
                              <div
                                key={place.id}
                                className="flex items-center gap-3 p-3 border rounded-lg"
                              >
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                  {placeIndex + 1}
                                </div>
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
                                    {place.vibe && (
                                      <>
                                        <span className="text-xs text-muted-foreground">•</span>
                                        <span className="text-xs text-muted-foreground capitalize">
                                          {place.vibe}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {dayPlaces.length === 0 && dayRoutes.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No places or routes assigned to this day yet.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <Link href={`/trips/${trip.id}/today`}>
              <Button className="flex-1">
                Start Trip
                <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
              </Button>
            </Link>
            <Link href={`/trips/${trip.id}/days`}>
              <Button variant="outline" className="flex-1">
                Edit Days
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

