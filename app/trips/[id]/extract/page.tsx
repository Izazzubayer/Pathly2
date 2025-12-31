"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ManualPlaceInput } from "@/components/manual-place-input";
import { getTripById, updateTrip } from "@/lib/storage";
import { validatePlace, inferCategory } from "@/lib/places-api";
import { getCategoryIcon, getCategoryLabel, getCategoryColor } from "@/lib/category-utils";

// Color mapping for place types - using shadcn theme colors
const getPlaceTypeColor = (type: string): string => {
  return 'bg-secondary text-secondary-foreground border-border';
};
import { ArrowLeft, ArrowRight, Edit2, Check, X, AlertCircle, Loader2, MapPin, CheckCircle2, Sparkles, Filter, Search, Star, RefreshCw, Clock, Navigation, CheckCheck } from "lucide-react";
import type { Trip, Place, PlaceCategory } from "@/types";

export default function ExtractPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [editingPlace, setEditingPlace] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<PlaceCategory>("other");
  const [validatingPlace, setValidatingPlace] = useState<string | null>(null);
  const [showAddInspiration, setShowAddInspiration] = useState(false);
  const [newInspiration, setNewInspiration] = useState("");
  const [suggestingPlaces, setSuggestingPlaces] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState<Set<string>>(new Set());
  const [suggestedPlaces, setSuggestedPlaces] = useState<Array<{
    name: string;
    placeId: string;
    coordinates: { lat: number; lng: number };
    types: string[];
    rating?: number;
    vicinity?: string;
    distance?: number; // meters
    duration?: number; // seconds
    aiReasoning?: string; // AI explanation
    sources?: string[]; // Web sources
  }>>([]);

  useEffect(() => {
    const tripId = params.id as string;
    const tripData = getTripById(tripId);
    setTrip(tripData);
    setLoading(false);

    if (!tripData) {
      router.push("/");
      return;
    }

    // Don't auto-suggest - let user trigger it manually
    // This prevents unwanted API calls on page load
    console.log('📍 Extract page loaded for trip:', tripData.destination);
  }, [params.id, router]);

  const handleSuggestPlaces = async (tripData: Trip) => {
    setSuggestingPlaces(true);
    
    try {
      const tags = tripData.travelerContext.tags || [];
      const type = tripData.travelerContext.type;
      
      // Calculate number of suggestions based on trip duration and places per day
      let numberOfSuggestions = 6; // Default fallback
      
      if (tripData.startDate && tripData.endDate) {
        const start = new Date(tripData.startDate);
        const end = new Date(tripData.endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end day
        const placesPerDay = tripData.placesPerDay || 5; // Default to 5 if not set
        numberOfSuggestions = days * placesPerDay;
        console.log(`📅 Trip duration: ${days} days, Places per day: ${placesPerDay}, Total suggestions: ${numberOfSuggestions}`);
      } else if (tripData.placesPerDay) {
        // If no dates but has placesPerDay preference, use a reasonable default (3 days)
        numberOfSuggestions = 3 * tripData.placesPerDay;
        console.log(`📅 No dates, using default 3 days × ${tripData.placesPerDay} places/day = ${numberOfSuggestions} suggestions`);
      }
      
      console.log('🤖 Using AI-powered suggestions!');
      console.log('🎯 Context:', { 
        destination: tripData.destination,
        travelerType: type, 
        preferences: tags,
        hotelLocation: tripData.hotel.coordinates,
        numberOfSuggestions
      });
      
      // Get placeIds to exclude (already suggested or already added)
      const excludePlaceIds = [
        ...suggestedPlaces.map(p => p.placeId),
        ...tripData.places.map(p => p.placeId).filter(Boolean),
      ];

      const response = await fetch('/api/places/suggest-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination: tripData.destination,
          travelerType: type,
          preferences: tags,
          hotelCoordinates: tripData.hotel.coordinates,
          excludePlaceIds,
          numberOfSuggestions,
        }),
      });
      
      console.log('📡 API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API returned data:', data);
        console.log(`✅ Found ${data.suggestions?.length || 0} suggestions`);
        
        if (data.suggestions && data.suggestions.length > 0) {
          // Log distance/duration data
          const placesWithDistance = data.suggestions.filter((p: any) => p.distance || p.duration);
          console.log(`📍 Places with distance/duration: ${placesWithDistance.length}/${data.suggestions.length}`);
          if (placesWithDistance.length > 0) {
            console.log('📍 Sample place with distance:', placesWithDistance[0]);
          }
          
          setSuggestedPlaces(data.suggestions);
        } else {
          console.warn('⚠️ No suggestions returned from API');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ API error:', errorText);
        alert(`Failed to get AI suggestions: ${errorText}`);
      }
      
    } catch (error) {
      console.error('Error suggesting places:', error);
    } finally {
      setSuggestingPlaces(false);
    }
  };

  const handleAddSuggestedPlace = (suggested: any) => {
    if (!trip) return;

    // Check for duplicates
    const isDuplicate = trip.places.some(p => p.placeId === suggested.placeId || p.name === suggested.name);
    if (isDuplicate) {
      console.log("Place already added:", suggested.name);
      // Still remove from suggestions even if duplicate
      setSuggestedPlaces(prev => prev.filter(p => p.placeId !== suggested.placeId));
      return;
    }

    // Infer category from Google Places types ONLY
    const category = suggested.types && suggested.types.length > 0
      ? inferCategory(suggested.types) as PlaceCategory
      : "other" as PlaceCategory;

    const newPlace: Place = {
      id: `place_${Date.now()}`,
      name: suggested.name,
      category,
      coordinates: suggested.coordinates,
      placeId: suggested.placeId,
      confidence: 1.0,
      source: "AI Suggested",
      confirmed: true, // Auto-confirm AI suggestions since they're validated
      validated: true,
    };

    const updatedTrip = {
      ...trip,
      places: [...trip.places, newPlace],
      updatedAt: new Date().toISOString(),
    };

    updateTrip(trip.id, updatedTrip);
    setTrip(updatedTrip);

    // Remove from suggestions
    setSuggestedPlaces(prev => prev.filter(p => p.placeId !== suggested.placeId));
  };

  const handleDismissSuggestion = (placeId: string) => {
    setSuggestedPlaces(prev => prev.filter(p => p.placeId !== placeId));
  };

  const handleClearAllSuggestions = async () => {
    setSuggestedPlaces([]);
    // Automatically fetch new suggestions after clearing
    if (trip && trip.hotel.coordinates.lat !== 0 && !suggestingPlaces) {
      // Small delay to ensure state is cleared, then fetch new suggestions
      setTimeout(() => {
        handleSuggestPlaces(trip);
      }, 300);
    }
  };

  const handleAddAllSuggestions = () => {
    if (!trip) return;
    
    const newPlaces: Place[] = suggestedPlaces
      .filter(suggested => !trip.places.some(p => p.placeId === suggested.placeId || p.name === suggested.name))
      .map((suggested) => {
        // Infer category from Google Places types ONLY
        const category = suggested.types && suggested.types.length > 0
          ? inferCategory(suggested.types) as PlaceCategory
          : "other" as PlaceCategory;
        
        return {
          id: `place_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: suggested.name,
          category,
          coordinates: suggested.coordinates,
          placeId: suggested.placeId,
          confidence: 1.0,
          source: "AI Suggested",
          confirmed: true,
          validated: true,
        };
      });

    if (newPlaces.length > 0) {
      const updatedTrip = {
        ...trip,
        places: [...trip.places, ...newPlaces],
        updatedAt: new Date().toISOString(),
      };

      updateTrip(trip.id, updatedTrip);
      setTrip(updatedTrip);
    }

    // Clear all suggestions after adding
    setSuggestedPlaces([]);
  };

  const handleRefreshSuggestions = async () => {
    if (!trip) return;
    await handleSuggestPlaces(trip);
  };

  const handleExtract = async (inspiration: string, files?: File[], manualPlaces?: any[]) => {
    setExtracting(true);
    
    try {
      // Get fresh trip data in case state is stale
      const tripId = params.id as string;
      const currentTrip = trip || getTripById(tripId);
      
      if (!currentTrip) {
        console.error("No trip found");
        setExtracting(false);
        return;
      }

      // If we have manual places, add them directly to the trip without AI extraction
      if (manualPlaces && manualPlaces.length > 0) {
        console.log("🔵 Processing manual places:", manualPlaces);
        console.log("🔵 Current trip places before:", currentTrip.places.length);
        
        // Infer category from Google Places types (no extra API call needed)
        const newPlaces: Place[] = manualPlaces.map((mp) => {
          // Infer category from place types
          let category: PlaceCategory = "other";
          if (mp.types && mp.types.length > 0) {
            const inferredCategory = inferCategory(mp.types);
            category = inferredCategory as PlaceCategory;
            console.log(`🔵 Inferred ${mp.name} as category: ${category} from types:`, mp.types);
          }
          
          return {
            id: mp.id,
            name: mp.name,
            category,
            coordinates: mp.coordinates,
            placeId: mp.placeId,
            confidence: 1.0, // Manual places have 100% confidence
            source: "Manually added",
            confirmed: false, // Let user review and confirm
            validated: !!mp.placeId, // Validated if we have a placeId from Google
          };
        });

        console.log("🔵 Created places:", newPlaces);
        console.log("🔵 New places count:", newPlaces.length);

        const updatedTrip = {
          ...currentTrip,
          places: [...currentTrip.places, ...newPlaces],
          updatedAt: new Date().toISOString(),
        };

        console.log("🔵 Updated trip places:", updatedTrip.places);
        console.log("🔵 Updated trip places count:", updatedTrip.places.length);
        
        updateTrip(currentTrip.id, updatedTrip);
        setTrip(updatedTrip);
        
        console.log("🔵 Trip state updated. Checking storage...");
        const savedTrip = getTripById(currentTrip.id);
        console.log("🔵 Saved trip places:", savedTrip?.places.length);
      }

      // If we have inspiration text or files, extract places using AI
      if (inspiration || (files && files.length > 0)) {
        // Prepare form data for file upload
        const formData = new FormData();
        if (inspiration) {
          formData.append("inspiration", inspiration);
        }
        
        if (files && files.length > 0) {
          files.forEach((file) => {
            formData.append("files", file);
          });
        }
        
        // Add traveler context for AI weighting
        if (currentTrip.travelerContext) {
          formData.append("travelerContext", JSON.stringify(currentTrip.travelerContext));
        }

        // Call AI extraction API
        const response = await fetch("/api/extract", {
          method: "POST",
          body: formData, // FormData, not JSON
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Extraction failed");
        }

        const data = await response.json();
        
        console.log("Extraction response:", data);
        
        if (!data.places || data.places.length === 0) {
          alert("No places found. Try adding more specific place names or check your input.");
          setExtracting(false);
          return;
        }
        
        // Convert extracted places to Place format
        // Categories will be determined by Google Places API during validation
        const extractedPlaces: Place[] = data.places.map((extracted: any, index: number) => ({
          id: `place_${Date.now()}_${index}`,
          name: extracted.name,
          category: "other" as PlaceCategory, // Category will be determined by Google Places API during validation
          vibe: extracted.vibe,
          confidence: extracted.confidence || 0.5,
          source: inspiration.substring(0, 100) + (inspiration.length > 100 ? "..." : "") || "Uploaded files",
          confirmed: false,
          validated: false,
        }));

        console.log("Converted places:", extractedPlaces);

        // Get current trip state (might have been updated with manual places)
        const freshTrip = getTripById(currentTrip.id) || currentTrip;

        const updatedTrip = {
          ...freshTrip,
          places: [...freshTrip.places, ...extractedPlaces], // Append to existing places
          updatedAt: new Date().toISOString(),
        };
        
        updateTrip(currentTrip.id, updatedTrip);
        setTrip(updatedTrip);
        
        console.log("Trip updated with places:", updatedTrip.places.length);
      }
    } catch (error) {
      console.error("Error extracting places:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to extract places: ${errorMessage}. Please try again or add places manually.`);
    } finally {
      setExtracting(false);
    }
  };

  const handleConfirm = async (placeId: string) => {
    if (!trip) return;
    
    const place = trip.places.find((p) => p.id === placeId);
    if (!place) return;

    // If not validated yet, validate it
    if (!place.validated) {
      setValidatingPlace(placeId);
      try {
        const validation = await validatePlace(place.name, trip.destination);
        
        if (validation.validated && validation.coordinates) {
          const updatedPlaces = trip.places.map((p) =>
            p.id === placeId
              ? {
                  ...p,
                  confirmed: true,
                  validated: true,
                  coordinates: validation.coordinates,
                  placeId: validation.placeId,
                  area: validation.area,
                  category: (validation.category as PlaceCategory) || p.category,
                }
              : p
          );
          const updatedTrip = { ...trip, places: updatedPlaces, updatedAt: new Date().toISOString() };
          updateTrip(trip.id, updatedTrip);
          setTrip(updatedTrip);
        } else {
          // Still confirm even if validation fails (user can edit)
          const updatedPlaces = trip.places.map((p) =>
            p.id === placeId ? { ...p, confirmed: true } : p
          );
          const updatedTrip = { ...trip, places: updatedPlaces, updatedAt: new Date().toISOString() };
          updateTrip(trip.id, updatedTrip);
          setTrip(updatedTrip);
        }
      } catch (error) {
        console.error("Validation error:", error);
        // Still confirm on error
        const updatedPlaces = trip.places.map((p) =>
          p.id === placeId ? { ...p, confirmed: true } : p
        );
        const updatedTrip = { ...trip, places: updatedPlaces, updatedAt: new Date().toISOString() };
        updateTrip(trip.id, updatedTrip);
        setTrip(updatedTrip);
      } finally {
        setValidatingPlace(null);
      }
    } else {
      // Already validated, just confirm
      const updatedPlaces = trip.places.map((p) =>
        p.id === placeId ? { ...p, confirmed: true } : p
      );
      const updatedTrip = { ...trip, places: updatedPlaces, updatedAt: new Date().toISOString() };
      updateTrip(trip.id, updatedTrip);
      setTrip(updatedTrip);
    }
  };

  const handleRemove = (placeId: string) => {
    if (!trip) return;
    const updatedPlaces = trip.places.filter((place) => place.id !== placeId);
    const updatedTrip = { ...trip, places: updatedPlaces, updatedAt: new Date().toISOString() };
    updateTrip(trip.id, updatedTrip);
    setTrip(updatedTrip);
  };

  const handleClearAll = () => {
    if (!trip) return;
    if (!confirm(`Remove all ${trip.places.length} places? This cannot be undone.`)) return;
    
    const updatedTrip = {
      ...trip,
      places: [],
      updatedAt: new Date().toISOString(),
    };
    
    updateTrip(trip.id, updatedTrip);
    setTrip(updatedTrip);
  };

  const handleEdit = (place: Place) => {
    setEditingPlace(place.id);
    setEditName(place.name);
    setEditCategory(place.category);
  };

  const handleSaveEdit = () => {
    if (!trip || !editingPlace) return;
    const updatedPlaces = trip.places.map((place) =>
      place.id === editingPlace
        ? { ...place, name: editName, category: editCategory }
        : place
    );
    const updatedTrip = { ...trip, places: updatedPlaces, updatedAt: new Date().toISOString() };
    updateTrip(trip.id, updatedTrip);
    setTrip(updatedTrip);
    setEditingPlace(null);
  };

  const handleCancelEdit = () => {
    setEditingPlace(null);
    setEditName("");
    setEditCategory("other");
  };

  if (loading || extracting) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">
                {extracting ? "Extracting places from your inspiration..." : "Loading..."}
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!trip) {
    return null;
  }

  const confirmedCount = trip.places.filter((p) => p.confirmed).length;
  const totalCount = trip.places.length;

  // Bulk actions
  const handleConfirmAll = async () => {
    if (!trip) return;
    
    const unconfirmedPlaces = trip.places.filter(p => !p.confirmed);
    
    for (const place of unconfirmedPlaces) {
      await handleConfirm(place.id);
    }
  };

  const handleRemoveUnconfirmed = () => {
    if (!trip) return;
    if (!confirm("Remove all unconfirmed places? This cannot be undone.")) return;

    const updatedTrip = {
      ...trip,
      places: trip.places.filter(p => p.confirmed),
      updatedAt: new Date().toISOString(),
    };

    updateTrip(trip.id, updatedTrip);
    setTrip(updatedTrip);
  };

  // Filter and search
  const filteredPlaces = trip.places;

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <Link href={`/trips/${trip.id}`}>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight">Your Places</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {totalCount} {totalCount === 1 ? 'place' : 'places'} added. Search to add more.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-semibold text-primary">{confirmedCount}</div>
                <div className="text-xs text-muted-foreground">Confirmed</div>
              </div>
              <div className="h-12 w-px bg-border" />
              <div className="text-right">
                <div className="text-2xl font-semibold">{totalCount - confirmedCount}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </div>
          </div>

          {/* Get AI Suggestions Button */}
          {!suggestingPlaces && suggestedPlaces.length === 0 && trip.places.length === 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-1 leading-tight">Get AI-Powered Suggestions</h3>
                    <p className="text-sm text-muted-foreground leading-tight">
                      Let AI find the best trending places in {trip.destination.split(',')[0]} based on your preferences
                    </p>
                  </div>
                  <Button 
                    size="lg"
                    onClick={() => handleSuggestPlaces(trip)}
                    className="ml-4"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Get Suggestions
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Place Search */}
          <Card className="border-primary/20">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="max-w-2xl">
                  <Label htmlFor="place-search" className="text-base font-semibold mb-3 block">
                    Search & Add Places in {trip.destination.split(',').pop()?.trim() || trip.destination.split(',')[0]}
                  </Label>
                  <ManualPlaceInput
                    destination={trip.destination}
                    destinationCoords={trip.hotel.coordinates.lat !== 0 ? trip.hotel.coordinates : null}
                    onPlacesChange={(manualPlaces) => {
                      // Always get fresh trip data from storage to avoid stale state
                      const tripId = params.id as string;
                      const currentTrip = getTripById(tripId);
                      
                      if (!currentTrip) {
                        console.error("Trip not found");
                        return;
                      }
                      
                      console.log(`📝 ManualPlaceInput callback: ${manualPlaces.length} places from component`);
                      console.log(`📝 Current trip has ${currentTrip.places.length} places`);
                      
                      // Convert manual places to trip places
                      // ManualPlaceInput only knows about places added through it, so we need to find NEW ones
                      const existingPlaceIds = new Set(currentTrip.places.map(p => p.placeId).filter(Boolean));
                      const existingPlaceNames = new Set(currentTrip.places.map(p => p.name.toLowerCase()));
                      
                      const newPlaces: Place[] = manualPlaces
                        .filter(mp => {
                          // Filter out places that already exist in trip
                          const hasPlaceId = mp.placeId && existingPlaceIds.has(mp.placeId);
                          const hasName = existingPlaceNames.has(mp.name.toLowerCase());
                          return !hasPlaceId && !hasName;
                        })
                        .map((mp) => {
                          // Infer category from Google Places types
                          const category = mp.types && mp.types.length > 0
                            ? inferCategory(mp.types) as PlaceCategory
                            : "other" as PlaceCategory;
                          
                          return {
                            id: mp.id,
                            name: mp.name,
                            category,
                            coordinates: mp.coordinates || { lat: 0, lng: 0 },
                            placeId: mp.placeId,
                            confidence: 1.0,
                            source: "Manually added",
                            confirmed: true, // Auto-confirm all added places
                            validated: true,
                          };
                        });
                      
                      console.log(`📝 Found ${newPlaces.length} new places to add`);
                      
                      if (newPlaces.length > 0) {
                        const updatedTrip = {
                          ...currentTrip,
                          places: [...currentTrip.places, ...newPlaces],
                          updatedAt: new Date().toISOString(),
                        };
                        updateTrip(currentTrip.id, updatedTrip);
                        setTrip(updatedTrip);
                        console.log(`✅ Added ${newPlaces.length} place(s). Total places: ${updatedTrip.places.length}`);
                      } else if (manualPlaces.length > 0) {
                        // Even if no new places, update state to ensure UI reflects current trip state
                        setTrip(currentTrip);
                      }
                    }}
                  />
                </div>

                {/* Added Places Chips */}
                {trip.places.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">
                        Added places ({trip.places.length}):
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAll}
                        className="text-xs text-muted-foreground"
                      >
                        <X className="h-3.5 w-3.5 mr-1.5" />
                        Clear All
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {trip.places.map((place) => (
                        <div
                          key={place.id}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 group/pill"
                        >
                          {place.placeId ? (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.placeId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium hover:text-primary transition-colors inline-flex items-center gap-1"
                            >
                              {place.name}
                              <MapPin className="h-3 w-3 opacity-0 group-hover/pill:opacity-100 transition-opacity" />
                            </a>
                          ) : place.coordinates ? (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${place.coordinates.lat},${place.coordinates.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium hover:text-primary transition-colors inline-flex items-center gap-1"
                            >
                              {place.name}
                              <MapPin className="h-3 w-3 opacity-0 group-hover/pill:opacity-100 transition-opacity" />
                            </a>
                          ) : (
                          <span className="font-medium">{place.name}</span>
                          )}
                          <button
                            onClick={() => handleRemove(place.id)}
                            className="hover:bg-accent rounded-full p-0.5 transition-colors"
                            aria-label={`Remove ${place.name}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>


          {/* Action Bar */}
          {totalCount > 0 && (
            <div className="flex justify-end">
              <Link href={`/trips/${trip.id}/days`}>
                <Button size="lg">
                  Organize Days
                  <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
            </div>
          )}

          {/* AI Suggestions */}
          {!extracting && (
            <>
              {suggestingPlaces ? (
            <Card>
                  <CardContent className="py-16">
                    <div className="text-center space-y-4">
                      <Loader2 className="h-16 w-16 mx-auto animate-spin text-primary" />
                      <div>
                        <h3 className="text-xl font-semibold">Finding perfect places for you...</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                          Based on your {trip.travelerContext.type} trip
                          {trip.travelerContext.tags && trip.travelerContext.tags.length > 0 && (
                            <> · {trip.travelerContext.tags.map(t => t.replace('-', ' ')).join(', ')}</>
                          )}
                        </p>
                      </div>
                </div>
              </CardContent>
            </Card>
              ) : suggestedPlaces.length > 0 ? (
                <div className="space-y-4">
                  {/* Header - Redesigned */}
                  <Card className="border-border/50 bg-accent/20">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="text-lg font-semibold">AI-Powered Suggestions</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
                              Web + AI
                            </span>
                      </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            <span className="font-semibold text-foreground">{suggestedPlaces.length}</span> trending places from Reddit, Instagram & travel blogs for your{" "}
                            <span className="font-medium text-foreground capitalize">
                              {trip.travelerContext.type === 'solo' ? 'solo traveler' : trip.travelerContext.type}
                            </span>
                            {trip.travelerContext.tags && trip.travelerContext.tags.length > 0 && (
                              <>
                                {" "}trip with{" "}
                                <span className="font-medium text-foreground">
                                  {trip.travelerContext.tags.map(tag => tag.replace("-", " ")).join(", ")}
                                </span>
                              </>
                            )}
                            {" "}near{" "}
                            <span className="font-medium text-foreground">
                              {trip.hotel.name}
                            </span>
                        </p>
                      </div>

                        {/* Right: Action Buttons - Compact */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefreshSuggestions}
                        disabled={suggestingPlaces}
                            className="h-8 px-2"
                            title="Refresh suggestions"
                      >
                            <RefreshCw className={`h-4 w-4 ${suggestingPlaces ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleAddAllSuggestions}
                            className="h-8 px-2"
                            title="Add all suggestions"
                      >
                            <CheckCheck className="h-4 w-4" />
                          </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                            onClick={handleClearAllSuggestions}
                            className="h-8 px-2"
                            title="Clear all suggestions"
                      >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Suggestions Grid */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {suggestedPlaces.map((place) => (
                      <Card
                        key={place.placeId}
                        className="group hover:border-primary/30 transition-all hover:shadow-md"
                      >
                        <CardContent className="p-4">
                      <div className="space-y-3">
                            {/* Place Name - Clickable to Google Maps */}
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.placeId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-base mb-2 hover:text-primary transition-colors inline-flex items-center gap-1 group/link"
                            >
                              {place.name}
                              <MapPin className="h-3.5 w-3.5 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                            </a>
                            
                            {/* Rating, Category, Distance & Duration - Grouped with Design Psychology */}
                            <div className="flex items-center gap-3 flex-wrap">
                              {/* Quality Indicators Group (Rating + Category) */}
                              <div className="flex items-center gap-2">
                                {place.rating && (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                    <span className="font-medium">{place.rating.toFixed(1)}</span>
                            </div>
                                )}
                                {(() => {
                                  const category = (place as any).category || inferCategory(place.types || []);
                                  return category ? (
                                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize border ${getPlaceTypeColor(category)}`}>
                                      {category}
                                    </span>
                                  ) : null;
                                })()}
                          </div>

                              {/* Visual Separator - Gestalt Principle */}
                              {trip.hotel.coordinates.lat !== 0 && trip.hotel.coordinates.lng !== 0 && place.coordinates && (place.distance !== undefined || place.duration !== undefined) && (
                                <div className="h-3 w-px bg-border/60" />
                              )}

                              {/* Practical Info Group (Distance + Duration) - Chunked Together */}
                              {trip.hotel.coordinates.lat !== 0 && trip.hotel.coordinates.lng !== 0 && place.coordinates && (
                                <div className="flex items-center gap-2.5">
                                  {place.distance !== undefined && place.distance !== null && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Navigation className="h-3.5 w-3.5" />
                                      <span className="font-medium text-foreground">
                                        {place.distance < 1000 
                                          ? `${Math.round(place.distance)}m` 
                                          : `${(place.distance / 1000).toFixed(1)}km`}
                                      </span>
                                    </div>
                                  )}
                                  {place.duration !== undefined && place.duration !== null && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="h-3.5 w-3.5" />
                                      <span className="font-medium text-foreground">
                                        {place.duration < 60 
                                          ? `${place.duration}s` 
                                          : `${Math.round(place.duration / 60)} min`}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Location */}
                            {place.vicinity && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {place.vicinity}
                              </p>
                            )}

                            {/* AI Reasoning - Why this place? */}
                            {place.aiReasoning && (
                              <div className="pt-2 border-t border-border/50">
                                <button
                                  onClick={() => {
                                    const newExpanded = new Set(expandedReasoning);
                                    if (newExpanded.has(place.placeId)) {
                                      newExpanded.delete(place.placeId);
                                    } else {
                                      newExpanded.add(place.placeId);
                                    }
                                    setExpandedReasoning(newExpanded);
                                  }}
                                  className="w-full text-left"
                                >
                                  <p className={`text-xs text-muted-foreground italic ${expandedReasoning.has(place.placeId) ? '' : 'line-clamp-2'} hover:text-foreground transition-colors`}>
                                    {place.aiReasoning}
                                  </p>
                                  <span className="text-xs text-primary mt-1 inline-block">
                                    {expandedReasoning.has(place.placeId) ? 'Show less' : 'Show more'}
                                  </span>
                                </button>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                className="flex-1"
                                onClick={() => handleAddSuggestedPlace(place)}
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Add to Trip
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDismissSuggestion(place.placeId)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                        </div>
                      </div>
                  </CardContent>
                </Card>
              ))}
                  </div>
                </div>
          ) : null}
            </>
          )}

        </div>
      </div>
    </main>
  );
}

