"use client";

import { useState } from "react";
import { PlacesAutocomplete } from "./places-autocomplete";
import { Button } from "./ui/button";
import { X } from "lucide-react";

interface ManualPlace {
  id: string;
  name: string;
  address: string;
  coordinates?: { lat: number; lng: number };
  placeId?: string;
  types?: string[];
}

interface ManualPlaceInputProps {
  destinationCoords: { lat: number; lng: number } | null;
  onPlacesChange: (places: ManualPlace[]) => void;
}

export function ManualPlaceInput({ destinationCoords, onPlacesChange }: ManualPlaceInputProps) {
  const [places, setPlaces] = useState<ManualPlace[]>([]);
  const [currentInput, setCurrentInput] = useState("");

  const handleAddPlace = (place: { name: string; address: string; placeId?: string; coordinates?: { lat: number; lng: number }; types?: string[] }) => {
    // Check for duplicates
    const isDuplicate = places.some((p) => p.placeId === place.placeId || p.name === place.name);
    if (isDuplicate) {
      console.log("Place already added:", place.name);
      setCurrentInput("");
      return;
    }

    const newPlace: ManualPlace = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: place.name,
      address: place.address,
      placeId: place.placeId,
      coordinates: place.coordinates,
      types: place.types || [],
    };
    
    console.log("Adding place:", newPlace.name);
    console.log("Current places:", places.length);
    
    setPlaces((prevPlaces) => {
      const updatedPlaces = [...prevPlaces, newPlace];
      console.log("Updated places:", updatedPlaces.length);
      onPlacesChange(updatedPlaces);
      return updatedPlaces;
    });
    
    // Clear input after a short delay to ensure state updates
    setTimeout(() => {
      setCurrentInput("");
    }, 0);
  };

  const handleRemovePlace = (id: string) => {
    const updatedPlaces = places.filter((p) => p.id !== id);
    setPlaces(updatedPlaces);
    onPlacesChange(updatedPlaces);
  };

  return (
    <div className="space-y-4">
      {/* Input Field */}
      <div className="space-y-2">
        <PlacesAutocomplete
          id="manual-place"
          value={currentInput}
          onChange={setCurrentInput}
          onSelect={handleAddPlace}
          placeholder={
            destinationCoords
              ? "Search for places in your destination..."
              : "Select a destination first"
          }
          types={[]} // All types of places
          locationBias={destinationCoords || undefined}
        />
        <p className="text-xs text-muted-foreground">
          {destinationCoords
            ? "Search for restaurants, attractions, or any place you want to visit"
            : "Please select a destination first to add places"}
        </p>
      </div>

      {/* Added Places List - Chip Style */}
      {places.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Added Places ({places.length})</p>
          <div className="flex flex-wrap gap-2">
            {places.map((place) => (
              <div
                key={place.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/60 border border-primary/20 text-sm group hover:bg-accent/80 transition-colors"
                title={place.address}
              >
                <span className="font-medium text-primary max-w-[200px] truncate">
                  {place.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemovePlace(place.id)}
                  className="flex-shrink-0 rounded-full hover:bg-primary/20 p-0.5 transition-colors"
                  aria-label={`Remove ${place.name}`}
                >
                  <X className="h-3.5 w-3.5 text-primary" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

