"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTripById, updateTrip } from "@/lib/storage";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, ArrowRight, GripVertical, Plus, Calendar } from "lucide-react";
import { getCategoryIcon, getCategoryLabel } from "@/lib/category-utils";
import type { Trip, Day, Place } from "@/types";

function SortablePlaceItem({
  place,
  onRemove,
}: {
  place: Place;
  onRemove: (placeId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: place.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border rounded-lg bg-card"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="font-medium">{place.name}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
          {(() => {
            const Icon = getCategoryIcon(place.category);
            return <Icon className="h-3 w-3" />;
          })()}
          <span>{getCategoryLabel(place.category)}</span>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={() => onRemove(place.id)}>
        Remove
      </Button>
    </div>
  );
}

export default function DaysPage() {
  const params = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const tripId = params.id as string;
    const tripData = getTripById(tripId);
    setTrip(tripData);
    setLoading(false);

    if (!tripData) {
      router.push("/");
      return;
    }

    // Auto-suggest day groupings if no days exist
    if (tripData.days.length === 0 && tripData.routes.length > 0) {
      suggestDayGroupings(tripData);
    }

    // Select first day by default
    if (tripData.days.length > 0 && !selectedDay) {
      setSelectedDay(tripData.days[0].id);
    }
  }, [params.id, router, selectedDay]);

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

  const handleDragEnd = (event: DragEndEvent, dayId: string) => {
    if (!trip) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const day = trip.days.find((d) => d.id === dayId);
    if (!day) return;

    const oldIndex = day.places.indexOf(active.id as string);
    const newIndex = day.places.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newPlaces = arrayMove(day.places, oldIndex, newIndex);
      const updatedDays = trip.days.map((d) =>
        d.id === dayId ? { ...d, places: newPlaces } : d
      );
      const updatedTrip = { ...trip, days: updatedDays, updatedAt: new Date().toISOString() };
      updateTrip(trip.id, updatedTrip);
      setTrip(updatedTrip);
    }
  };

  const handleAddPlaceToDay = (dayId: string, placeId: string) => {
    if (!trip) return;
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
  const availablePlaces = currentDay
    ? confirmedPlaces.filter((p) => !currentDay.places.includes(p.id))
    : confirmedPlaces;

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <Link href={`/trips/${trip.id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Trip
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Organize Days</h1>
              <p className="text-muted-foreground mt-1">
                Group places and routes into days. Drag to reorder within a day.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Days Sidebar */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Days</h2>
                <Button onClick={handleCreateDay} size="sm" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {trip.days.map((day, index) => (
                  <Card
                    key={day.id}
                    className={`cursor-pointer transition-colors ${
                      selectedDay === day.id ? "border-primary" : ""
                    }`}
                    onClick={() => setSelectedDay(day.id)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">Day {index + 1}</p>
                          <p className="text-xs text-muted-foreground">
                            {day.places.length} places
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Current Day Content */}
            <div className="md:col-span-2 space-y-4">
              {currentDay ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        Day {trip.days.findIndex((d) => d.id === currentDay.id) + 1}
                      </CardTitle>
                      <CardDescription>
                        Drag to reorder places within this day
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {placesInCurrentDay.length > 0 ? (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(e) => handleDragEnd(e, currentDay.id)}
                        >
                          <SortableContext
                            items={placesInCurrentDay.map((p) => p.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-2">
                              {placesInCurrentDay.map((place) => (
                                <SortablePlaceItem
                                  key={place.id}
                                  place={place}
                                  onRemove={(placeId) =>
                                    handleRemovePlaceFromDay(currentDay.id, placeId)
                                  }
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No places in this day yet. Add places from the list below.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Available Places */}
                  {availablePlaces.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Available Places</CardTitle>
                        <CardDescription>
                          Add places to this day
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {availablePlaces.map((place) => (
                            <div
                              key={place.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div>
                                <p className="font-medium">{place.name}</p>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                  {(() => {
                                    const Icon = getCategoryIcon(place.category);
                                    return <Icon className="h-3 w-3" />;
                                  })()}
                                  <span>{getCategoryLabel(place.category)}</span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddPlaceToDay(currentDay.id, place.id)}
                              >
                                Add
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {trip.days.length === 0
                          ? "No days created yet. Days will be auto-suggested based on your routes."
                          : "Select a day to organize places"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Continue Button */}
          {trip.days.length > 0 && (
            <div className="flex justify-end">
              <Link href={`/trips/${trip.id}/itinerary`}>
                <Button>
                  View Complete Itinerary
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

