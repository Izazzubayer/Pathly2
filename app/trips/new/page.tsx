"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "@/components/file-upload";
import { DateRangePicker } from "@/components/date-picker";
import { ManualPlaceInput } from "@/components/manual-place-input";
import { ArrowRight, Loader2, Calendar as CalendarIcon, Users, MapPin, Hotel as HotelIcon, Sparkles } from "lucide-react";
import { createEmptyTrip } from "@/lib/trip-utils";
import { saveTrip } from "@/lib/storage";
import { PlacesAutocomplete } from "@/components/places-autocomplete";
import type { TravelerContext } from "@/types";

export default function NewTripPage() {
  const router = useRouter();
  
  // Form state
  const [destination, setDestination] = useState("");
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [hotel, setHotel] = useState("");
  const [hotelData, setHotelData] = useState<{
    name: string;
    address: string;
    placeId?: string;
    coordinates?: { lat: number; lng: number };
  } | null>(null);
  const [travelerType, setTravelerType] = useState<"couple" | "friends" | "family" | "solo" | "">("");
  const [travelerTags, setTravelerTags] = useState<string[]>([]);
  const [placesPerDay, setPlacesPerDay] = useState<number>(5);

  // Define available tags based on traveler type
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [inspiration, setInspiration] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [manualPlaces, setManualPlaces] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const toggleTag = (tag: string) => {
    setTravelerTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Get pace description based on number
  const getPaceDescription = (count: number): string => {
    const descriptions: Record<number, string> = {
      1: "Ultra Minimal - One signature experience",
      2: "Very Relaxed - Two key spots",
      3: "Leisurely - Three curated places",
      4: "Easy-Going - Four comfortable stops",
      5: "Balanced - Five well-paced visits",
      6: "Moderate - Six diverse locations",
      7: "Active - Seven engaging spots",
      8: "Energetic - Eight packed experiences",
      9: "Intensive - Nine action-filled stops",
      10: "Maximum - Ten non-stop adventures",
    };
    return descriptions[count] || "Balanced pace";
  };

  // Reset tags and set default places per day when traveler type changes
  const handleTravelerTypeChange = (type: "couple" | "friends" | "family" | "solo") => {
    setTravelerType(type);
    setTravelerTags([]); // Clear tags when type changes
    
    // Set default places per day based on traveler type
    const defaultPlacesPerDay: Record<string, number> = {
      family: 4,    // Easy-Going
      couple: 5,    // Balanced
      solo: 6,      // Moderate
      friends: 7,   // Active
    };
    setPlacesPerDay(defaultPlacesPerDay[type] || 5);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!destination.trim() || !hotel.trim() || !travelerType || !startDate || !endDate) {
      alert("Please fill in all required fields (destination, hotel, traveler type, and dates)");
      return;
    }

    // Check if user has provided at least one source of places
    if (!inspiration.trim() && uploadedFiles.length === 0 && manualPlaces.length === 0) {
      alert("Please provide inspiration: search places manually, paste text/URLs, or upload files");
      return;
    }

    setIsCreating(true);

    try {
      // Create traveler context
      const travelerContext: TravelerContext = {
        type: travelerType as "couple" | "friends" | "family" | "solo",
        tags: travelerTags.length > 0 ? (travelerTags as TravelerContext["tags"]) : undefined,
      };

      // Create trip with all data including placesPerDay
      const trip = createEmptyTrip(
        destination,
        hotelData || { name: hotel, address: hotel },
        travelerContext,
        startDate,
        endDate,
        placesPerDay
      );
      
      // Save trip
      saveTrip(trip);
      
      // Store files temporarily in sessionStorage for extraction
      if (uploadedFiles.length > 0) {
        const fileData = await Promise.all(
          uploadedFiles.map(async (file) => ({
            name: file.name,
            type: file.type,
            size: file.size,
            data: await file.arrayBuffer().then((buf) => 
              Array.from(new Uint8Array(buf))
            ),
          }))
        );
        sessionStorage.setItem(`trip_${trip.id}_files`, JSON.stringify(fileData));
      }

      // Store manual places temporarily in sessionStorage for extraction
      if (manualPlaces.length > 0) {
        console.log("🟢 Storing manual places in sessionStorage:", manualPlaces);
        console.log("🟢 Manual places count:", manualPlaces.length);
        sessionStorage.setItem(`trip_${trip.id}_manualPlaces`, JSON.stringify(manualPlaces));
        console.log("🟢 Stored in sessionStorage with key:", `trip_${trip.id}_manualPlaces`);
      } else {
        console.log("🔴 No manual places to store");
      }
      
      // Navigate to extraction page with inspiration
      const params = new URLSearchParams();
      if (inspiration.trim()) {
        params.set("inspiration", inspiration);
      }
      router.push(`/trips/${trip.id}/extract?${params.toString()}`);
    } catch (error) {
      console.error("Error creating trip:", error);
      setIsCreating(false);
    }
  };

  // Calculate number of days
  const calculateDays = () => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end day
    return diffDays;
  };

  const numberOfDays = calculateDays();

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center space-y-3 mb-12">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Create New Trip</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Transform your scattered inspiration into a route-optimized itinerary
            </p>
          </div>

          {/* Single Form Card */}
          <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="p-0">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Section 1: Trip Basics */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-2 border-b">
                    <MapPin className="h-6 w-6 text-primary" />
                    <div>
                      <h2 className="text-xl font-semibold">Trip Basics</h2>
                      <p className="text-sm text-muted-foreground">Where and when are you traveling?</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Destination */}
                  <div className="space-y-2">
                      <Label htmlFor="destination" className="text-base">
                        Destination <span className="text-destructive">*</span>
                      </Label>
                    <PlacesAutocomplete
                      id="destination"
                      value={destination}
                      onChange={setDestination}
                      onSelect={(place) => {
                        setDestination(place.address);
                          setDestinationCoords(place.coordinates || null);
                          // Clear hotel selection when destination changes
                          setHotel("");
                          setHotelData(null);
                      }}
                      placeholder="e.g., Bangkok, Thailand"
                    />
                    <p className="text-xs text-muted-foreground">
                      Start typing to see location suggestions
                    </p>
                  </div>

                    {/* Hotel */}
                  <div className="space-y-2">
                      <Label htmlFor="hotel" className="text-base">
                        Hotel (Anchor) <span className="text-destructive">*</span>
                      </Label>
                    <PlacesAutocomplete
                      id="hotel"
                      value={hotel}
                      onChange={setHotel}
                      onSelect={(place) => {
                          setHotel(place.name); // Show name instead of address
                        setHotelData({
                          name: place.name,
                          address: place.address,
                          placeId: place.placeId,
                          coordinates: place.coordinates,
                        });
                      }}
                        placeholder={
                          destinationCoords 
                            ? "e.g., Four Wings Hotel" 
                            : "Select destination first"
                        }
                        types={["lodging"]}
                        locationBias={destinationCoords || undefined}
                      />
                      <p className="text-xs text-muted-foreground">
                        {destinationCoords 
                          ? "Hotels will be filtered to your destination city" 
                          : "Select a destination first to see hotels"}
                      </p>
                    </div>

                    {/* Date Range */}
                    <div className="space-y-2">
                      <Label htmlFor="dateRange" className="text-base">
                        Trip Dates <span className="text-destructive">*</span>
                      </Label>
                      <DateRangePicker
                        id="dateRange"
                        startDate={startDate}
                        endDate={endDate}
                        onStartDateChange={setStartDate}
                        onEndDateChange={setEndDate}
                        placeholder="Select your travel dates"
                        minDate={new Date()}
                    />
                    <p className="text-xs text-muted-foreground">
                        Select your check-in and check-out dates
                    </p>
                    </div>
                  </div>

                  {/* Trip Summary */}
                  {destination && hotel && numberOfDays && numberOfDays > 0 && (
                    <div className="p-4 rounded-lg bg-accent/40 border border-accent">
                      <div className="flex items-start gap-3">
                        <CalendarIcon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {destination && hotel && numberOfDays ? (
                              <>
                                You will be staying in <span className="font-semibold text-primary">{destination.split(',')[0]}</span> at <span className="font-semibold text-primary">{hotel}</span> for <span className="font-semibold text-primary">{numberOfDays} {numberOfDays === 1 ? 'day' : 'days'}</span>
                              </>
                            ) : destination && numberOfDays ? (
                              <>
                                Your trip to <span className="font-semibold text-primary">{destination.split(',')[0]}</span> is <span className="font-semibold text-primary">{numberOfDays} {numberOfDays === 1 ? 'day' : 'days'}</span> long
                              </>
                            ) : numberOfDays ? (
                              <>
                                Your trip is <span className="font-semibold text-primary">{numberOfDays} {numberOfDays === 1 ? 'day' : 'days'}</span> long
                              </>
                            ) : null}
                          </p>
                          {startDate && endDate && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date(endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 2: Traveler Context */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-2 border-b">
                    <Users className="h-6 w-6 text-primary" />
                    <div>
                      <h2 className="text-xl font-semibold">Traveler Context</h2>
                      <p className="text-sm text-muted-foreground">Help AI understand your travel style for better recommendations</p>
                    </div>
                  </div>

                  {/* Traveler Type */}
                  <div className="space-y-4">
                    <Label className="text-base">
                      Traveler Type <span className="text-destructive">*</span>
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {(["solo", "couple", "friends", "family"] as const).map((type) => {
                        const descriptions = {
                          solo: "Independent explorer",
                          couple: "Two travelers",
                          friends: "Group adventure",
                          family: "Multi-generational"
                        };
                        return (
                          <button
                          key={type}
                          type="button"
                            onClick={() => handleTravelerTypeChange(type)}
                            className={`
                              relative p-5 rounded-xl border-2 transition-all text-left group
                              ${travelerType === type 
                                ? "border-primary bg-accent/50 shadow-md" 
                                : "border-border bg-background hover:border-accent hover:bg-accent/20"
                              }
                            `}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold capitalize text-base">{type}</p>
                                {travelerType === type && (
                                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                    <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{descriptions[type]}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Travel Style Tags - Dynamic based on traveler type */}
                  {travelerType && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base">Travel Style (Optional)</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Select styles that match your {travelerType} trip preferences
                        </p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {getAvailableTags(travelerType).map(({ tag, label, desc }) => (
                          <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                            className={`
                              p-4 rounded-lg border-2 transition-all text-left
                              ${travelerTags.includes(tag)
                                ? "border-primary bg-accent/50 shadow-sm"
                                : "border-border bg-background hover:border-accent hover:bg-accent/20"
                              }
                            `}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm">{label}</p>
                                {travelerTags.includes(tag) && (
                                  <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                    <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Places Per Day - After Travel Style */}
                  {travelerType && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base">Daily Pace</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          How many places do you want to visit per day?
                        </p>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-6">
                          <div className="flex-1 space-y-2">
                            <input
                              type="range"
                              min="1"
                              max="10"
                              step="1"
                              value={placesPerDay}
                              onChange={(e) => setPlacesPerDay(Number(e.target.value))}
                              className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                <span key={num} className="w-4 text-center">{num}</span>
                              ))}
                            </div>
                          </div>
                          <div className="w-16 text-center flex-shrink-0">
                            <span className="text-3xl font-semibold text-primary">{placesPerDay}</span>
                            <p className="text-xs text-muted-foreground mt-0.5">places</p>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-accent/40 border border-primary/20">
                          <p className="text-sm font-medium text-primary">
                            {getPaceDescription(placesPerDay)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 3: Inspiration */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-2 border-b">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <div>
                      <h2 className="text-xl font-semibold">Add Your Inspiration</h2>
                      <p className="text-sm text-muted-foreground">Choose how you want to add places to your trip</p>
                    </div>
                  </div>

                  {/* Tabs for different input methods */}
                  <Tabs defaultValue="manual" className="w-full">
                    <TabsList>
                      <TabsTrigger value="manual">
                        Search Places
                      </TabsTrigger>
                      <TabsTrigger value="text">
                        Paste Text/URLs
                      </TabsTrigger>
                      <TabsTrigger value="files">
                        Upload Files
                      </TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Manual Place Input */}
                    <TabsContent value="manual" className="space-y-4 mt-6">
                    <div className="space-y-2">
                        <Label className="text-base">Search and Add Places</Label>
                        <p className="text-sm text-muted-foreground">
                          Search for specific restaurants, attractions, or any place you want to visit
                        </p>
                      </div>
                      <ManualPlaceInput
                        destinationCoords={destinationCoords}
                        onPlacesChange={setManualPlaces}
                      />
                    </TabsContent>

                    {/* Tab 2: Text/URL Input */}
                    <TabsContent value="text" className="space-y-4 mt-6">
                      <div className="space-y-2">
                        <Label htmlFor="inspiration" className="text-base">
                          Paste Text or URLs
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          AI will automatically extract place names from your text, links, or notes
                      </p>
                    </div>
                      <Textarea
                        id="inspiration"
                        placeholder="Paste URLs or notes here...&#10;&#10;Example:&#10;https://www.instagram.com/reel/...&#10;https://www.youtube.com/watch?v=...&#10;ICONSIAM, Bangkok&#10;Chatuchak Weekend Market&#10;..."
                        value={inspiration}
                        onChange={(e) => setInspiration(e.target.value)}
                        rows={10}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Supports: Instagram reels/posts, YouTube videos, Google Maps links, plain text notes
                      </p>
                    </TabsContent>

                    {/* Tab 3: File Upload */}
                    <TabsContent value="files" className="space-y-4 mt-6">
                      <div className="space-y-2">
                        <Label className="text-base">Upload Your Files</Label>
                        <p className="text-sm text-muted-foreground">
                          Upload PDFs, Word documents, text files, or screenshots. AI will extract places from them.
                      </p>
                    </div>
                      <FileUpload
                        onFilesSelected={setUploadedFiles}
                        acceptedTypes=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
                        maxFiles={10}
                      />
                      <p className="text-xs text-muted-foreground">
                        Supported formats: PDF, DOC, DOCX, TXT, MD, PNG, JPG, JPEG, WEBP
                      </p>
                    </TabsContent>
                  </Tabs>
                  </div>

                {/* Submit Button */}
                <div className="pt-4 border-t">
                    <Button 
                      type="submit" 
                    size="lg"
                    className="w-full text-base py-6" 
                    disabled={
                      isCreating || 
                      !destination.trim() || 
                      !hotel.trim() || 
                      !travelerType || 
                      !startDate || 
                      !endDate || 
                      (manualPlaces.length === 0 && !inspiration.trim() && uploadedFiles.length === 0)
                    }
                    >
                      {isCreating ? (
                        <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Creating Trip & Extracting Places...
                        </>
                      ) : (
                        <>
                        Create Trip & Extract Places
                        <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  <p className="text-xs text-center text-muted-foreground mt-3">
                    All fields marked with <span className="text-destructive">*</span> are required
                  </p>
                  </div>
                </form>
              </CardContent>
            </Card>
        </div>
      </div>
    </main>
  );
}
