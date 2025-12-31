"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateRangePicker } from "@/components/date-picker";
import { PlacesAutocomplete } from "@/components/places-autocomplete";
import { getTripById, updateTrip } from "@/lib/storage";
import { ArrowRight, MapPin, Calendar, Edit2, Check, X } from "lucide-react";
import type { Trip, TravelerContext } from "@/types";

export default function TripDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit state
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editHotel, setEditHotel] = useState("");
  const [editHotelData, setEditHotelData] = useState<{
    name: string;
    address: string;
    placeId?: string;
    coordinates?: { lat: number; lng: number };
  } | null>(null);
  const [editTravelerType, setEditTravelerType] = useState<"couple" | "friends" | "family" | "solo">("couple");
  const [editTravelerTags, setEditTravelerTags] = useState<string[]>([]);

  useEffect(() => {
    const tripId = params.id as string;
    const tripData = getTripById(tripId);
    setTrip(tripData);
    setLoading(false);

    if (!tripData) {
      router.push("/");
    } else {
      // Initialize edit state
      setEditStartDate(tripData.startDate || "");
      setEditEndDate(tripData.endDate || "");
      setEditHotel(tripData.hotel.name);
      setEditHotelData({
        name: tripData.hotel.name,
        address: tripData.hotel.address,
        coordinates: tripData.hotel.coordinates,
      });
      setEditTravelerType(tripData.travelerContext.type);
      setEditTravelerTags(tripData.travelerContext.tags || []);
    }
  }, [params.id, router]);

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (trip) {
      setEditStartDate(trip.startDate || "");
      setEditEndDate(trip.endDate || "");
      setEditHotel(trip.hotel.name);
      setEditHotelData({
        name: trip.hotel.name,
        address: trip.hotel.address,
        coordinates: trip.hotel.coordinates,
      });
      setEditTravelerType(trip.travelerContext.type);
      setEditTravelerTags(trip.travelerContext.tags || []);
    }
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (!trip) return;

    const updatedTrip: Partial<Trip> = {
      startDate: editStartDate,
      endDate: editEndDate,
      hotel: editHotelData ? { 
        id: trip.hotel.id,
        name: editHotelData.name,
        address: editHotelData.address,
        placeId: editHotelData.placeId,
        coordinates: editHotelData.coordinates || trip.hotel.coordinates
      } : trip.hotel,
      travelerContext: {
        type: editTravelerType,
        tags: editTravelerTags.length > 0 ? (editTravelerTags as TravelerContext["tags"]) : undefined,
      },
      updatedAt: new Date().toISOString(),
    };

    updateTrip(trip.id, updatedTrip);
    setTrip({ ...trip, ...updatedTrip } as Trip);
    setIsEditing(false);
  };

  const toggleTag = (tag: string) => {
    setEditTravelerTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const getAvailableTags = (type: string) => {
    const tagsByType: Record<string, Array<{ tag: string; label: string; desc: string }>> = {
      solo: [
        { tag: "food-first", label: "Food First", desc: "Culinary adventures" },
        { tag: "nightlife", label: "Nightlife", desc: "Social scenes" },
        { tag: "chill", label: "Chill", desc: "Relaxed exploration" },
        { tag: "culture", label: "Culture", desc: "Museums & heritage" },
        { tag: "adventure", label: "Adventure", desc: "Thrilling activities" },
      ],
      couple: [
        { tag: "romantic", label: "Romantic", desc: "Intimate experiences" },
        { tag: "food-first", label: "Food First", desc: "Fine dining" },
        { tag: "chill", label: "Chill", desc: "Peaceful getaway" },
        { tag: "culture", label: "Culture", desc: "Shared discoveries" },
        { tag: "luxury", label: "Luxury", desc: "Premium experiences" },
      ],
      friends: [
        { tag: "nightlife", label: "Nightlife", desc: "Party & bars" },
        { tag: "food-first", label: "Food First", desc: "Food tours" },
        { tag: "adventure", label: "Adventure", desc: "Group activities" },
        { tag: "culture", label: "Culture", desc: "Explore together" },
        { tag: "budget", label: "Budget", desc: "Affordable fun" },
      ],
      family: [
        { tag: "family-friendly", label: "Family Friendly", desc: "Kid-safe activities" },
        { tag: "educational", label: "Educational", desc: "Learning experiences" },
        { tag: "chill", label: "Chill", desc: "Easy-paced" },
        { tag: "nature", label: "Nature", desc: "Outdoor spaces" },
        { tag: "culture", label: "Culture", desc: "Family heritage" },
      ],
    };
    return tagsByType[type] || [];
  };

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

  const duration = trip.startDate && trip.endDate 
    ? Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  // Determine current step (1 or 2) - Routes removed, auto-organized
  const currentStep = trip.places.length === 0 
    ? 1 // Step 1: Add Places
    : 2; // Step 2: Organize Days (routes are auto-generated in background)

  const steps = [
    { 
      number: 1, 
      label: "Add Places", 
      description: "Search and add places you want to visit",
      href: `/trips/${trip.id}/extract`,
      completed: trip.places.length > 0,
      count: trip.places.length
    },
    { 
      number: 2, 
      label: "Organize Days", 
      description: "Organize your places into days - automatically optimized",
      href: `/trips/${trip.id}/days`,
      completed: trip.days.length > 0,
      count: trip.days.length
    },
  ];

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="w-full max-w-2xl mx-auto">
        {/* Compact Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            {trip.destination}
          </h1>
            {!isEditing ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStartEdit}
                className="flex-shrink-0"
              >
                <Edit2 className="h-4 w-4 mr-1.5" />
                Edit
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  Save
                </Button>
              </div>
            )}
          </div>
          
          {!isEditing ? (
            /* Display Mode */
            <div className="space-y-2 text-sm">
            {trip.startDate && trip.endDate && (
              <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Trip dates:</span>
                  <span className="font-medium">
                  {new Date(trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  {" – "}
                    {new Date(trip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {duration > 0 && (
                      <span className="text-muted-foreground font-normal ml-1">
                        ({duration} {duration === 1 ? 'day' : 'days'})
                      </span>
                    )}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Staying at:</span>
                <span className="font-medium truncate">{trip.hotel.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-muted-foreground">Traveling as:</span>
                <span className="font-medium capitalize">{trip.travelerContext.type === 'solo' ? 'Solo traveler' : trip.travelerContext.type === 'couple' ? 'Couple' : trip.travelerContext.type === 'friends' ? 'Friends' : 'Family'}</span>
                {trip.travelerContext.tags && trip.travelerContext.tags.length > 0 && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">Preference:</span>
                    <span className="font-medium capitalize">{trip.travelerContext.tags.map(tag => tag.replace("-", " ")).join(", ")}</span>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Edit Mode */
            <Card className="border-border/50">
              <CardContent className="p-4 space-y-4">
                {/* Trip Dates */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Trip dates</label>
                  <DateRangePicker
                    startDate={editStartDate}
                    endDate={editEndDate}
                    onStartDateChange={setEditStartDate}
                    onEndDateChange={setEditEndDate}
                    placeholder="Select your travel dates"
                    minDate={new Date()}
                  />
          </div>

                {/* Hotel */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Staying at</label>
                  <PlacesAutocomplete
                    value={editHotel}
                    onChange={setEditHotel}
                    onSelect={(place) => {
                      setEditHotel(place.name);
                      setEditHotelData({
                        name: place.name,
                        address: place.address,
                        placeId: place.placeId,
                        coordinates: place.coordinates,
                      });
                    }}
                    placeholder="Search for hotel"
                    types={["lodging"]}
                    locationBias={trip.hotel.coordinates.lat !== 0 ? trip.hotel.coordinates : undefined}
                  />
                </div>

                {/* Traveler Type */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Traveling as</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(["solo", "couple", "friends", "family"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setEditTravelerType(type);
                          setEditTravelerTags([]); // Clear tags when type changes
                        }}
                        className={`p-3 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                          editTravelerType === type
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background hover:border-accent"
                        }`}
                      >
                        <span className="capitalize">{type === 'solo' ? 'Solo' : type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Travel Preferences */}
                {editTravelerType && (
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Preferences (optional)</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {getAvailableTags(editTravelerType).map(({ tag, label }) => (
                        <button
                    key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                            editTravelerTags.includes(tag)
                              ? "border-primary bg-primary/10"
                              : "border-border bg-background hover:border-accent"
                          }`}
                  >
                          {label}
                        </button>
                      ))}
                    </div>
            </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 3-Step Progress */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isActive = step.number === currentStep;
            const isClickable = step.completed || isActive;
            
            return (
              <Link 
                key={step.number} 
                href={isClickable ? step.href : '#'}
                className={`block ${!isClickable && 'pointer-events-none'}`}
              >
                <div className={`p-4 rounded-lg border-2 transition-all ${
                  isActive 
                    ? 'border-primary bg-primary/5' 
                    : step.completed
                    ? 'border-border bg-card hover:border-primary/30'
                    : 'border-border bg-card opacity-50'
                }`}>
                  <div className="flex items-center gap-3">
                    {/* Step Number */}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full text-base font-bold flex-shrink-0 ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : step.completed
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {step.number}
                    </div>
                    
                    {/* Step Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold">{step.label}</h3>
                        {step.completed && step.count !== null && (
                          <span className="text-xs text-muted-foreground">
                            ({step.count})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {step.description}
                      </p>
                    </div>

                    {/* Arrow */}
                    {isClickable && (
                      <ArrowRight className={`h-4 w-4 flex-shrink-0 ${
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}

