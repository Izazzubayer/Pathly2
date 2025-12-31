"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getTripById, updateTrip } from "@/lib/storage";
import { Map } from "@/components/map";
import { ArrowLeft, ChevronDown, ChevronRight, GripVertical, X, MapPin, Hotel as HotelIcon, Save, Utensils, Coffee, ShoppingBag, Landmark, Moon, Trees, Theater, Sparkles, Church, Building2, Mountain, Waves, Navigation, type LucideIcon } from "lucide-react";
import type { Trip, Place } from "@/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

// Droppable Day Container Component
function DroppableDay({ 
  dayId, 
  children, 
  isOver 
}: { 
  dayId: string; 
  children: React.ReactNode;
  isOver: boolean;
}) {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: `day-${dayId}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`transition-all duration-200 rounded-lg ${
        isOver || isDroppableOver 
          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background bg-primary/10 border-primary/30 scale-[1.02]' 
          : ''
      }`}
    >
      {children}
    </div>
  );
}

// Sortable Place Item Component
function SortablePlaceItem({ 
  place, 
  index, 
  dayId, 
  onRemove,
  isSelected 
}: { 
  place: Place; 
  index: number; 
  dayId: string; 
  onRemove: (dayId: string, placeId: string) => void;
  isSelected: boolean;
}) {
  // Use unique ID that includes dayId to track which day the place belongs to
  const uniqueId = `${dayId}-${place.id}`;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: uniqueId, data: { dayId, placeId: place.id } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition, // Disable transition while dragging for smoother movement
    opacity: isDragging ? 0.3 : 1,
  };

  const Icon = place.category ? getIconForGoogleCategory(place.category) : MapPin;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-primary/30 transition-all ${
        isDragging ? 'opacity-30 scale-95' : ''
      } ${isSelected ? 'border-primary bg-primary/5' : ''}`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Number Badge */}
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
        {index + 1}
      </div>

      {/* Place Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{place.name}</h4>
        {place.category && place.category !== "other" && place.category.trim() !== "" && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Icon className="h-3 w-3" />
            <span>{place.category}</span>
          </div>
        )}
      </div>

      {/* Remove Button */}
      <button
        onClick={() => onRemove(dayId, place.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
        title="Remove from day"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ItineraryPage() {
  const params = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [activePlace, setActivePlace] = useState<{ place: Place; dayId: string; index: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
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
    } else if (tripData.days.length > 0) {
      // Select first day by default
      setSelectedDayId(tripData.days[0].id);
      // Expand first day by default
      setExpandedDays(new Set([tripData.days[0].id]));
    }
  }, [params.id, router]);

  const handleSaveChanges = () => {
    if (trip) {
      updateTrip(trip.id, trip);
      setHasChanges(false);
    }
  };

  const handleRemovePlace = (dayId: string, placeId: string) => {
    if (!trip) return;
    
    const updatedDays = trip.days.map(day => {
      if (day.id === dayId) {
        return {
          ...day,
          places: day.places.filter(id => id !== placeId)
        };
      }
      return day;
    });

    setTrip({ ...trip, days: updatedDays });
    setHasChanges(true);
  };

  // Track drag start to show overlay
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const sourceData = active.data.current as { dayId: string; placeId: string } | undefined;
    
    if (sourceData && trip) {
      const place = confirmedPlaces.find(p => p.id === sourceData.placeId);
      const day = trip.days.find(d => d.id === sourceData.dayId);
      
      if (place && day) {
        const index = day.places.indexOf(sourceData.placeId);
        setActivePlace({ place, dayId: sourceData.dayId, index });
      }
    }
  };

  // Global drag end handler that handles both same-day reordering and cross-day moves
  const handleDragEnd = (event: DragEndEvent) => {
    setActivePlace(null);
    const { active, over } = event;

    if (!trip || !over) {
      setActiveDayId(null);
      return;
    }

    // Get source data from active item
    const sourceData = active.data.current as { dayId: string; placeId: string } | undefined;
    if (!sourceData) {
      setActiveDayId(null);
      return;
    }

    const { dayId: sourceDayId, placeId: sourcePlaceId } = sourceData;

    // Determine target day and position
    const overId = over.id as string;
    let targetDayId: string;
    let targetIndex: number | null = null;

    // Check if dropped on a day container or on another place
    if (overId.startsWith('day-')) {
      // Dropped on a day container (empty area)
      targetDayId = overId.replace('day-', '');
      targetIndex = null; // Append to end
    } else {
      // Dropped on another place - get target data
      const targetData = over.data.current as { dayId: string; placeId: string } | undefined;
      if (!targetData) {
        setActiveDayId(null);
        return;
      }
      
      targetDayId = targetData.dayId;
      const targetPlaceId = targetData.placeId;
      
      const targetDay = trip.days.find(d => d.id === targetDayId);
      if (!targetDay) {
        setActiveDayId(null);
        return;
      }
      
      targetIndex = targetDay.places.indexOf(targetPlaceId);
      if (targetIndex === -1) {
        setActiveDayId(null);
        return;
      }
    }

    const sourceDay = trip.days.find(d => d.id === sourceDayId);
    const targetDay = trip.days.find(d => d.id === targetDayId);
    
    if (!sourceDay || !targetDay) {
      setActiveDayId(null);
      return;
    }

    // Same day - reorder
    if (sourceDayId === targetDayId) {
      const oldIndex = sourceDay.places.indexOf(sourcePlaceId);
      if (oldIndex === -1 || targetIndex === null) {
        setActiveDayId(null);
        return;
      }

      const updatedDays = trip.days.map(d => {
        if (d.id === sourceDayId) {
          return {
            ...d,
            places: arrayMove(d.places, oldIndex, targetIndex!)
          };
        }
        return d;
      });

      setTrip({ ...trip, days: updatedDays });
      setHasChanges(true);
    } else {
      // Different day - move place
      const updatedDays = trip.days.map(d => {
        if (d.id === sourceDayId) {
          // Remove from source day
          return {
            ...d,
            places: d.places.filter(id => id !== sourcePlaceId)
          };
        }
        if (d.id === targetDayId) {
          // Add to target day
          if (targetIndex === null) {
            // Append to end
            return {
              ...d,
              places: [...d.places, sourcePlaceId]
            };
          } else {
            // Insert at specific position
            const newPlaces = [...d.places];
            newPlaces.splice(targetIndex, 0, sourcePlaceId);
            return {
              ...d,
              places: newPlaces
            };
          }
        }
        return d;
      });

      setTrip({ ...trip, days: updatedDays });
      setHasChanges(true);
    }

    setActiveDayId(null);
  };

  const toggleDayExpanded = (dayId: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dayId)) {
      newExpanded.delete(dayId);
    } else {
      newExpanded.add(dayId);
    }
    setExpandedDays(newExpanded);
  };

  const handleDayClick = (dayId: string) => {
    setSelectedDayId(dayId);
    // Auto-expand when selected
    if (!expandedDays.has(dayId)) {
      setExpandedDays(new Set([...expandedDays, dayId]));
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
  
  // Get places for selected day
  const selectedDay = trip.days.find(d => d.id === selectedDayId);
  const selectedDayPlaces = selectedDay
    ? selectedDay.places
        .map(placeId => confirmedPlaces.find(p => p.id === placeId))
        .filter((p): p is Place => p !== undefined)
    : [];

  return (
    <main className="min-h-screen bg-background">
      <div className="h-screen flex flex-col">
        {/* Fixed Header */}
        <div className="border-b bg-background z-10 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/trips/${trip.id}/days`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-bold">{trip.destination}</h1>
                {trip.startDate && trip.endDate && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(trip.startDate).toLocaleDateString("en-US", { 
                      month: "short", 
                      day: "numeric" 
                    })}
                    {" – "}
                    {new Date(trip.endDate).toLocaleDateString("en-US", { 
                      month: "short", 
                      day: "numeric",
                      year: "numeric"
                    })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Button onClick={handleSaveChanges} size="sm">
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              )}
              <Link href={`/trips/${trip.id}/today`}>
                <Button size="sm">
                  <Navigation className="mr-2 h-4 w-4" />
                  Start Trip
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column - Days List */}
          <div className="w-[400px] border-r bg-background overflow-y-auto">
            <div className="p-4">
              <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
                Your Itinerary ({trip.days.length} {trip.days.length === 1 ? 'Day' : 'Days'})
              </h2>
              
              {trip.days.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    No days organized yet
                  </p>
                  <Link href={`/trips/${trip.id}/days`}>
                    <Button size="sm">Organize Days</Button>
                  </Link>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={(event) => {
                    const overId = event.over?.id as string;
                    if (overId && overId.startsWith('day-')) {
                      setActiveDayId(overId.replace('day-', ''));
                    } else {
                      setActiveDayId(null);
                    }
                  }}
                  onDragCancel={() => {
                    setActiveDayId(null);
                    setActivePlace(null);
                  }}
                >
                  <div className="space-y-2">
                    {trip.days.map((day, dayIndex) => {
                    const dayPlaces = day.places
                      .map(placeId => confirmedPlaces.find(p => p.id === placeId))
                      .filter((p): p is Place => p !== undefined);
                    const dayDate = trip.startDate 
                      ? new Date(new Date(trip.startDate).getTime() + dayIndex * 24 * 60 * 60 * 1000)
                      : null;
                    const isExpanded = expandedDays.has(day.id);
                    const isSelected = selectedDayId === day.id;

                    return (
                      <DroppableDay 
                        key={day.id}
                        dayId={day.id}
                        isOver={activeDayId === day.id}
                      >
                        <div 
                          className={`border rounded-lg overflow-hidden transition-all ${
                            isSelected ? 'border-primary shadow-sm' : 'border-border'
                          }`}
                        >
                          {/* Day Header - Clickable */}
                          <div className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors">
                            <button
                              onClick={() => handleDayClick(day.id)}
                              className="flex-1 min-w-0 text-left"
                            >
                              <h3 className="font-semibold">Day {dayIndex + 1}</h3>
                              {dayDate && (
                                <p className="text-xs text-muted-foreground">
                                  {dayDate.toLocaleDateString("en-US", { 
                                    weekday: "short",
                                    month: "short", 
                                    day: "numeric" 
                                  })}
                                </p>
                              )}
                            </button>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {dayPlaces.length} {dayPlaces.length === 1 ? 'place' : 'places'}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleDayExpanded(day.id);
                                }}
                                className="p-1 hover:bg-accent rounded transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Day Places - Expandable & Draggable */}
                          {isExpanded && (
                            <div className="border-t bg-accent/20 p-3">
                              {dayPlaces.length > 0 ? (
                                <SortableContext
                                  items={dayPlaces.map(p => `${day.id}-${p.id}`)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  <div className="space-y-2">
                                    {dayPlaces.map((place, placeIndex) => (
                                      <SortablePlaceItem
                                        key={place.id}
                                        place={place}
                                        index={placeIndex}
                                        dayId={day.id}
                                        onRemove={handleRemovePlace}
                                        isSelected={isSelected}
                                      />
                                    ))}
                                  </div>
                                </SortableContext>
                              ) : (
                                <div className={`text-center py-6 text-xs transition-all duration-200 ${
                                  activeDayId === day.id 
                                    ? 'text-primary font-medium bg-primary/5 border-2 border-dashed border-primary rounded-lg' 
                                    : 'text-muted-foreground'
                                }`}>
                                  {activeDayId === day.id 
                                    ? 'Drop here to add place' 
                                    : 'No places assigned yet. Drag places here from other days.'}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </DroppableDay>
                    );
                  })}
                  </div>
                  
                  {/* Drag Overlay - Shows preview while dragging */}
                  <DragOverlay>
                    {activePlace ? (
                      <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-primary bg-card shadow-2xl shadow-primary/20 bg-background opacity-95 rotate-2 scale-105">
                        <div className="cursor-grabbing text-muted-foreground">
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                          {activePlace.index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{activePlace.place.name}</h4>
                          {activePlace.place.category && activePlace.place.category !== "other" && activePlace.place.category.trim() !== "" && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              {(() => {
                                const Icon = getIconForGoogleCategory(activePlace.place.category);
                                return <Icon className="h-3 w-3" />;
                              })()}
                              <span>{activePlace.place.category}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          </div>

          {/* Right Column - Map */}
          <div className="flex-1 relative">
            {trip.hotel.coordinates.lat !== 0 ? (
              <div className="absolute inset-0">
                <Map
                  center={trip.hotel.coordinates}
                  hotel={{
                    name: trip.hotel.name,
                    coordinates: trip.hotel.coordinates,
                  }}
                  routes={[]}
                  places={selectedDayPlaces}
                  height="100%"
                  showNumberedMarkers={true}
                  selectedDayIndex={selectedDayId ? trip.days.findIndex(d => d.id === selectedDayId) : undefined}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Map not available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
