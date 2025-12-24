"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTripById } from "@/lib/storage";
import { ArrowRight, MapPin, Calendar, Route, Map, CheckCircle2, Circle } from "lucide-react";
import type { Trip } from "@/types";

export default function TripDashboardPage() {
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
            <p className="text-muted-foreground">Loading trip...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!trip) {
    return null;
  }

  const progressSteps = [
    { id: "extract", label: "Extract Places", completed: trip.places.length > 0 },
    { id: "routes", label: "Plan Routes", completed: trip.routes.length > 0 },
    { id: "days", label: "Organize Days", completed: trip.days.length > 0 },
    { id: "itinerary", label: "View Itinerary", completed: trip.days.length > 0 },
  ];

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">{trip.destination}</h1>
                <p className="text-muted-foreground mt-1">
                  Created {new Date(trip.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Link href="/trips/new">
                <Button variant="outline">New Trip</Button>
              </Link>
            </div>
          </div>

          {/* Hotel Info */}
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
              {trip.hotel.coordinates.lat !== 0 && trip.hotel.coordinates.lng !== 0 ? (
                <p className="text-xs text-muted-foreground mt-2">
                  📍 Located at {trip.hotel.coordinates.lat.toFixed(4)}, {trip.hotel.coordinates.lng.toFixed(4)}
                </p>
              ) : (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ Location not yet geocoded
                </p>
              )}
            </CardContent>
          </Card>

          {/* Trip Details */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Dates */}
            {trip.startDate && trip.endDate && (
              <Card>
                <CardHeader>
                  <CardTitle>Trip Dates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Start:</span>{" "}
                      <span className="font-medium">
                        {new Date(trip.startDate).toLocaleDateString("en-US", { 
                          weekday: "short", 
                          month: "short", 
                          day: "numeric", 
                          year: "numeric" 
                        })}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">End:</span>{" "}
                      <span className="font-medium">
                        {new Date(trip.endDate).toLocaleDateString("en-US", { 
                          weekday: "short", 
                          month: "short", 
                          day: "numeric", 
                          year: "numeric" 
                        })}
                      </span>
                    </p>
                    <p className="text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Duration:</span>{" "}
                      <span className="font-semibold text-primary">
                        {Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Traveler Context */}
            <Card>
              <CardHeader>
                <CardTitle>Traveler Context</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Type:</span>{" "}
                    <span className="capitalize font-medium">{trip.travelerContext.type}</span>
                  </p>
                  {trip.placesPerDay && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Daily Pace:</span>{" "}
                      <span className="font-semibold text-primary">{trip.placesPerDay} places/day</span>
                    </p>
                  )}
                  {trip.travelerContext.tags && trip.travelerContext.tags.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Travel Style:</p>
                      <div className="flex flex-wrap gap-2">
                        {trip.travelerContext.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-1 bg-secondary rounded-md capitalize"
                          >
                            {tag.replace("-", " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Planning Progress</CardTitle>
              <CardDescription>
                Track your progress through the planning journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {progressSteps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-3">
                    {step.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className={step.completed ? "text-foreground" : "text-muted-foreground"}>
                      {step.label}
                    </span>
                    {step.completed && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {step.id === "extract" && `${trip.places.length} places`}
                        {step.id === "routes" && `${trip.routes.length} routes`}
                        {step.id === "days" && `${trip.days.length} days`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <Link href={`/trips/${trip.id}/extract`}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Map className="h-5 w-5" />
                    <CardTitle>Extract Places</CardTitle>
                  </div>
                  <CardDescription>
                    Review and confirm AI-extracted places from your inspiration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {trip.places.length} places extracted
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <Link href={`/trips/${trip.id}/routes`}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Route className="h-5 w-5" />
                    <CardTitle>Plan Routes</CardTitle>
                  </div>
                  <CardDescription>
                    Define routes and discover places along the way
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {trip.routes.length} routes planned
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <Link href={`/trips/${trip.id}/days`}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    <CardTitle>Organize Days</CardTitle>
                  </div>
                  <CardDescription>
                    Group places and routes into days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {trip.days.length} days organized
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <Link href={`/trips/${trip.id}/itinerary`}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Map className="h-5 w-5" />
                    <CardTitle>View Itinerary</CardTitle>
                  </div>
                  <CardDescription>
                    See your complete route-optimized itinerary
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Complete overview
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

