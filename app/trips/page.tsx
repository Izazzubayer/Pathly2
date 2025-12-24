"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllTrips, deleteTrip } from "@/lib/storage";
import { Plus, MapPin, Calendar, Trash2 } from "lucide-react";
import type { Trip } from "@/types";

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const allTrips = getAllTrips();
    setTrips(allTrips);
    setLoading(false);
  }, []);

  const handleDeleteTrip = (tripId: string, tripDestination: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm(`Are you sure you want to delete "${tripDestination}"? This action cannot be undone.`)) {
      deleteTrip(tripId);
      const updatedTrips = getAllTrips();
      setTrips(updatedTrips);
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

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">My Trips</h1>
              <p className="text-muted-foreground mt-1">
                All your travel plans in one place
              </p>
            </div>
            <Link href="/trips/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Trip
              </Button>
            </Link>
          </div>

          {/* Trips List */}
          {trips.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">No trips yet</h2>
                  <p className="text-muted-foreground mb-6">
                    Create your first trip to start planning your journey
                  </p>
                  <Link href="/trips/new">
                    <Button size="lg">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Trip
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {trips.map((trip) => (
                <Card
                  key={trip.id}
                  className="hover:border-primary/50 transition-colors"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <Link href={`/trips/${trip.id}`} className="flex-1">
                        <CardTitle>{trip.destination}</CardTitle>
                        <CardDescription className="mt-1">
                          {trip.hotel.name}
                        </CardDescription>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDeleteTrip(trip.id, trip.destination, e)}
                        aria-label={`Delete trip to ${trip.destination}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <Link href={`/trips/${trip.id}`}>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Created {new Date(trip.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{trip.places.length} places</span>
                          <span>•</span>
                          <span>{trip.routes.length} routes</span>
                          <span>•</span>
                          <span>{trip.days.length} days</span>
                        </div>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

