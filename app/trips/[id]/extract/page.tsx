"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTripById, updateTrip } from "@/lib/storage";
import { validatePlace, inferCategory } from "@/lib/places-api";
import { getCategoryIcon, getCategoryLabel, getCategoryColor } from "@/lib/category-utils";
import { ArrowLeft, ArrowRight, Edit2, Check, X, AlertCircle, Loader2, MapPin, CheckCircle2, Sparkles, Filter, Search } from "lucide-react";
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
  const [filterCategory, setFilterCategory] = useState<PlaceCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfirmedOnly, setShowConfirmedOnly] = useState(false);

  useEffect(() => {
    const tripId = params.id as string;
    const tripData = getTripById(tripId);
    setTrip(tripData);
    setLoading(false);

    if (!tripData) {
      router.push("/");
      return;
    }

    // Check if we have inspiration to process
    const inspiration = searchParams.get("inspiration");
    
    // Only auto-extract if we have places already (from previous extraction)
    // OR if we have new inspiration/files to process
    if (tripData.places.length === 0) {
      // Try to get files from sessionStorage
      const filesData = sessionStorage.getItem(`trip_${tripData.id}_files`);
      let files: File[] = [];
      
      if (filesData) {
        try {
          const parsed = JSON.parse(filesData);
          files = parsed.map((f: any) => {
            const blob = new Blob([new Uint8Array(f.data)], { type: f.type });
            return new File([blob], f.name, { type: f.type });
          });
          // Clear from sessionStorage after reading
          sessionStorage.removeItem(`trip_${tripData.id}_files`);
        } catch (e) {
          console.error("Error parsing stored files:", e);
        }
      }

      // Try to get manual places from sessionStorage
      const manualPlacesData = sessionStorage.getItem(`trip_${tripData.id}_manualPlaces`);
      let manualPlaces: any[] = [];
      
      if (manualPlacesData) {
        try {
          manualPlaces = JSON.parse(manualPlacesData);
          // Clear from sessionStorage after reading
          sessionStorage.removeItem(`trip_${tripData.id}_manualPlaces`);
        } catch (e) {
          console.error("Error parsing stored manual places:", e);
        }
      }
      
      // Only extract if we have inspiration text OR files OR manual places
      if ((inspiration && inspiration.trim()) || files.length > 0 || manualPlaces.length > 0) {
        handleExtract(inspiration || "", files.length > 0 ? files : undefined, manualPlaces.length > 0 ? manualPlaces : undefined);
      }
    }
  }, [params.id, router, searchParams]);

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
        const extractedPlaces: Place[] = data.places.map((extracted: any, index: number) => ({
          id: `place_${Date.now()}_${index}`,
          name: extracted.name,
          category: extracted.category || "other",
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
  const filteredPlaces = trip.places.filter(place => {
    // Category filter
    if (filterCategory !== "all" && place.category !== filterCategory) {
      return false;
    }

    // Search filter
    if (searchQuery && !place.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Confirmed filter
    if (showConfirmedOnly && !place.confirmed) {
      return false;
    }

    return true;
  });

  // Get unique categories from places
  const availableCategories = Array.from(new Set(trip.places.map(p => p.category)));

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
                  <h1 className="text-3xl font-semibold tracking-tight">Review Places</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    AI found {totalCount} places. Review and confirm to continue.
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

          {/* Progress Bar */}
          {totalCount > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {Math.round((confirmedCount / totalCount) * 100)}% Complete
                </span>
                {confirmedCount === totalCount && confirmedCount > 0 ? (
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    All places confirmed!
                  </div>
                ) : (
                  <span className="text-muted-foreground">
                    {totalCount - confirmedCount} remaining
                  </span>
                )}
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${(confirmedCount / totalCount) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Bar */}
          {totalCount > 0 && (
            <div className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search places..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as PlaceCategory | "all")}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">All Categories</option>
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
                  ))}
                </select>

                {/* Show Confirmed Toggle */}
                <Button
                  variant={showConfirmedOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowConfirmedOnly(!showConfirmedOnly)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmed Only
                </Button>
              </div>

              {/* Bulk Actions */}
              <div className="flex items-center gap-2">
                {confirmedCount < totalCount && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleConfirmAll}
                      disabled={extracting}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Confirm All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveUnconfirmed}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove Unconfirmed
                    </Button>
                  </>
                )}
                {confirmedCount === totalCount && confirmedCount > 0 && (
                  <Link href={`/trips/${trip.id}/routes`}>
                    <Button size="sm">
                      Continue to Routes
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {trip.places.length === 0 && !extracting && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 space-y-4">
                  <p className="text-muted-foreground">
                    No places extracted yet. Add inspiration or upload files to extract places.
                  </p>
                  <Link href={`/trips/${trip.id}`}>
                    <Button variant="outline">
                      Go Back to Add Inspiration
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Places List */}
          {filteredPlaces.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredPlaces.map((place) => (
                <Card 
                  key={place.id} 
                  className={`relative transition-all ${
                    place.confirmed 
                      ? "border-primary bg-accent/20" 
                      : "hover:border-primary/50 hover:shadow-md"
                  }`}
                >
                  {place.confirmed && (
                    <div className="absolute top-3 right-3">
                      <div className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                        <CheckCircle2 className="h-3 w-3" />
                        Confirmed
                      </div>
                    </div>
                  )}
                  <CardContent className="pt-6">
                    {editingPlace === place.id ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-name">Place Name</Label>
                          <Input
                            id="edit-name"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-category">Category</Label>
                          <select
                            id="edit-category"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value as PlaceCategory)}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          >
                            <option value="food">Food</option>
                            <option value="attraction">Attraction</option>
                            <option value="nightlife">Nightlife</option>
                            <option value="nature">Nature</option>
                            <option value="shopping">Shopping</option>
                            <option value="entertainment">Entertainment</option>
                            <option value="wellness">Wellness</option>
                            <option value="religious">Religious</option>
                            <option value="museum">Museum</option>
                            <option value="adventure">Adventure</option>
                            <option value="beach">Beach</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleSaveEdit} size="sm">
                            Save
                          </Button>
                          <Button onClick={handleCancelEdit} variant="outline" size="sm">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <h3 className="font-semibold text-lg pr-20">{place.name}</h3>
                          <div className="flex items-center gap-2 text-sm">
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${getCategoryColor(place.category)}`}>
                              {(() => {
                                const Icon = getCategoryIcon(place.category);
                                return <Icon className="h-3.5 w-3.5" />;
                              })()}
                              <span>{getCategoryLabel(place.category)}</span>
                            </div>
                            {place.vibe && (
                              <span className="text-xs text-muted-foreground capitalize">{place.vibe}</span>
                            )}
                          </div>
                          {place.confidence < 0.8 && (
                            <div className="flex items-center gap-1 text-xs text-amber-600">
                              <AlertCircle className="h-3 w-3" />
                              Low confidence ({Math.round(place.confidence * 100)}%)
                            </div>
                          )}
                          {place.validated && place.coordinates && (
                            <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                              <MapPin className="h-3 w-3" />
                              Validated • {place.area || "Location confirmed"}
                            </div>
                          )}
                          {place.validated && !place.coordinates && (
                            <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                              <AlertCircle className="h-3 w-3" />
                              Could not find exact location
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Source: {place.source}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {!place.confirmed && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(place)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleConfirm(place.id)}
                                disabled={validatingPlace === place.id}
                              >
                                {validatingPlace === place.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemove(place.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {place.confirmed && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemove(place.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : trip.places.length > 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center space-y-3">
                  <Filter className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <div>
                    <p className="font-medium">No places match your filters</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Try adjusting your search or category filter
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterCategory("all");
                      setShowConfirmedOnly(false);
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </main>
  );
}

