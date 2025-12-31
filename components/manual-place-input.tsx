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
  destination?: string;
  destinationCoords: { lat: number; lng: number } | null;
  onPlacesChange: (places: ManualPlace[]) => void;
}

// Helper function to extract country code from destination string
// e.g., "Bangkok, Thailand" -> "TH"
function getCountryCodeFromDestination(destination: string): string | undefined {
  if (!destination) return undefined;
  
  // Split by comma and get the last part (usually the country)
  const parts = destination.split(',').map(p => p.trim());
  const countryName = parts[parts.length - 1];
  
  // Map common country names to ISO country codes
  const countryMap: Record<string, string> = {
    // Major countries
    'thailand': 'th',
    'united states': 'us',
    'usa': 'us',
    'united kingdom': 'gb',
    'uk': 'gb',
    'france': 'fr',
    'germany': 'de',
    'italy': 'it',
    'spain': 'es',
    'japan': 'jp',
    'china': 'cn',
    'india': 'in',
    'australia': 'au',
    'canada': 'ca',
    'brazil': 'br',
    'mexico': 'mx',
    'south korea': 'kr',
    'indonesia': 'id',
    'vietnam': 'vn',
    'philippines': 'ph',
    'malaysia': 'my',
    'singapore': 'sg',
    'cambodia': 'kh',
    'laos': 'la',
    'myanmar': 'mm',
    'bangladesh': 'bd',
    'sri lanka': 'lk',
    'nepal': 'np',
    'portugal': 'pt',
    'greece': 'gr',
    'turkey': 'tr',
    'egypt': 'eg',
    'south africa': 'za',
    'new zealand': 'nz',
    'argentina': 'ar',
    'chile': 'cl',
    'peru': 'pe',
    'colombia': 'co',
    'netherlands': 'nl',
    'belgium': 'be',
    'switzerland': 'ch',
    'austria': 'at',
    'sweden': 'se',
    'norway': 'no',
    'denmark': 'dk',
    'finland': 'fi',
    'poland': 'pl',
    'czech republic': 'cz',
    'hungary': 'hu',
    'romania': 'ro',
    'russia': 'ru',
    'uae': 'ae',
    'united arab emirates': 'ae',
    'saudi arabia': 'sa',
    'israel': 'il',
    'jordan': 'jo',
    'lebanon': 'lb',
  };
  
  const normalizedCountry = countryName.toLowerCase();
  return countryMap[normalizedCountry];
}

export function ManualPlaceInput({ destination, destinationCoords, onPlacesChange }: ManualPlaceInputProps) {
  const [places, setPlaces] = useState<ManualPlace[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  
  // Extract country code from destination for country-wide search
  const countryCode = destination ? getCountryCodeFromDestination(destination) : undefined;

  const handleAddPlace = async (place: { name: string; address: string; placeId?: string; coordinates?: { lat: number; lng: number }; types?: string[] }) => {
    // Check for duplicates
    const isDuplicate = places.some((p) => p.placeId === place.placeId || p.name === place.name);
    if (isDuplicate) {
      console.log("Place already added:", place.name);
      setCurrentInput("");
      return;
    }

    // ALWAYS fetch place details for accurate types from Google
    let types = place.types || [];
    
    if (place.placeId) {
      console.log("🔍 ManualPlaceInput: Fetching Place Details for accurate categorization:", place.name);
      try {
        const response = await fetch(`/api/places/details?placeId=${place.placeId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.types && data.types.length > 0) {
            types = data.types;
            console.log("✅ ManualPlaceInput: Got specific types from Place Details API:", types);
          } else {
            console.warn("⚠️ ManualPlaceInput: Place Details returned no types, using autocomplete types:", types);
          }
        } else {
          console.warn("⚠️ ManualPlaceInput: Place Details API failed, using autocomplete types:", types);
        }
      } catch (error) {
        console.error("❌ ManualPlaceInput: Error fetching place details:", error);
        console.warn("⚠️ ManualPlaceInput: Falling back to autocomplete types:", types);
      }
    } else {
      console.warn("⚠️ ManualPlaceInput: No placeId provided, using autocomplete types:", types);
    }

    const newPlace: ManualPlace = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: place.name,
      address: place.address,
      placeId: place.placeId,
      coordinates: place.coordinates,
      types: types,
    };
    
    console.log("Adding place:", newPlace.name, "with types:", types);
    console.log("Current places:", places.length);
    
    // Update state first
    const updatedPlaces = [...places, newPlace];
    setPlaces(updatedPlaces);
    
    // Call callback after state update (use setTimeout to avoid render phase update)
    setTimeout(() => {
      onPlacesChange(updatedPlaces);
    }, 0);
  };

  const handleRemovePlace = (id: string) => {
    const updatedPlaces = places.filter((p) => p.id !== id);
    setPlaces(updatedPlaces);
    // Call callback after state update (use setTimeout to avoid render phase update)
    setTimeout(() => {
      onPlacesChange(updatedPlaces);
    }, 0);
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
            destination
              ? `Search for places in ${countryCode ? destination.split(',').pop()?.trim() || destination.split(',')[0] : destination.split(',')[0]}...`
              : destinationCoords
              ? "Search for places in your destination..."
              : "Select a destination first"
          }
          types={[]} // All types of places
          countryRestriction={countryCode} // Restrict to country instead of city
          clearOnSelect={true}
        />
        <p className="text-xs text-muted-foreground">
          {destination
            ? countryCode
              ? `Search for restaurants, attractions, or any place in ${destination.split(',').pop()?.trim() || destination.split(',')[0]} (country-wide)`
              : `Search for restaurants, attractions, or any place in ${destination.split(',')[0]}`
            : destinationCoords
            ? "Search for restaurants, attractions, or any place you want to visit"
            : "Please select a destination first to add places"}
        </p>
      </div>

    </div>
  );
}

