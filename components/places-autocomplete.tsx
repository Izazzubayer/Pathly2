"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: { 
    name: string; 
    address: string; 
    placeId?: string;
    coordinates?: { lat: number; lng: number };
    types?: string[];
  }) => void;
  placeholder?: string;
  id?: string;
  autoFocus?: boolean;
  types?: string[]; // Google Places types (e.g., ["(cities)"] or ["lodging"])
  locationBias?: { lat: number; lng: number }; // Bias results to a specific location
}

declare global {
  interface Window {
    google: any;
    initGooglePlaces: () => void;
  }
}

export function PlacesAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  id,
  autoFocus,
  types = ["(cities)"], // Default to cities
  locationBias,
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    // Check if Google Maps script is already loaded
    if (window.google?.maps?.places) {
      setIsScriptLoaded(true);
      initializeAutocomplete();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Wait for existing script to load
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkLoaded);
          setIsScriptLoaded(true);
          initializeAutocomplete();
        }
      }, 100);
      
      return () => clearInterval(checkLoaded);
    }

    // Load Google Maps script
    const script = document.createElement("script");
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || "";
    
    if (!apiKey) {
      console.warn("⚠️ Google Places API key not found. Add NEXT_PUBLIC_GOOGLE_PLACES_API_KEY to your .env.local file.");
      setIsScriptLoaded(false);
      return;
    }

    console.log("🔑 Loading Google Maps with API key:", apiKey.substring(0, 10) + "...");
    
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log("✅ Google Maps script loaded");
      
      // Sometimes the Places library takes a moment to initialize
      // Retry a few times before giving up
      let retries = 0;
      const maxRetries = 10;
      
      const checkPlacesLibrary = () => {
        if (window.google?.maps?.places) {
          console.log("✅ Places library ready");
          setIsScriptLoaded(true);
          initializeAutocomplete();
        } else if (retries < maxRetries) {
          retries++;
          console.log(`⏳ Waiting for Places library... (attempt ${retries}/${maxRetries})`);
          setTimeout(checkPlacesLibrary, 100);
        } else {
          console.error("❌ Google Maps loaded but Places library not available after 10 retries");
          console.error("Troubleshooting:");
          console.error("1. Go to: https://console.cloud.google.com/apis/library/places-backend.googleapis.com");
          console.error("2. Make sure 'Places API (New)' is ENABLED");
          console.error("3. Check your API key restrictions allow this domain");
          setIsScriptLoaded(false);
        }
      };
      
      checkPlacesLibrary();
    };

    script.onerror = (error) => {
      console.error("❌ Failed to load Google Maps script:", error);
      console.error("");
      console.error("🔧 TROUBLESHOOTING STEPS:");
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("1. Enable Places API:");
      console.error("   → https://console.cloud.google.com/apis/library/places-backend.googleapis.com");
      console.error("");
      console.error("2. Check API Key Restrictions:");
      console.error("   → https://console.cloud.google.com/apis/credentials");
      console.error("   → Make sure 'localhost:3000' is allowed");
      console.error("");
      console.error("3. Verify Billing (required even for free tier):");
      console.error("   → https://console.cloud.google.com/billing");
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      setIsScriptLoaded(false);
    };

    document.head.appendChild(script);

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google?.maps?.places) {
      console.warn("⚠️ Cannot initialize autocomplete: input or Places API not ready");
      return;
    }

    try {
      console.log("🔧 Initializing autocomplete with types:", types.length > 0 ? types : "all places");
      const autocompleteOptions: any = {
        fields: ["formatted_address", "name", "place_id", "geometry", "types"],
      };
      
      // Only add types if provided (empty array means no restriction)
      if (types.length > 0) {
        autocompleteOptions.types = types;
      }
      
      // Add location bias if provided (restricts results to a specific area)
      if (locationBias) {
        const circle = new window.google.maps.Circle({
          center: locationBias,
          radius: 50000, // 50km radius around the destination
        });
        autocompleteOptions.bounds = circle.getBounds();
        autocompleteOptions.strictBounds = true; // Strictly enforce the bounds
        console.log("🎯 Location bias applied:", locationBias);
      }
      
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, autocompleteOptions);

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        console.log("📍 Place selected:", place);
        
        if (place.formatted_address || place.name) {
          const coordinates = place.geometry?.location
            ? {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              }
            : undefined;

          const selectedPlace = {
            name: place.name || place.formatted_address || "",
            address: place.formatted_address || place.name || "",
            placeId: place.place_id,
            coordinates,
            types: place.types || [],
          };
          
          console.log("📍 Place types:", place.types);
          
          // Call onSelect first, then clear the input
          onSelect(selectedPlace);
          // Don't update the input value - let parent component handle it
          // onChange(selectedPlace.address);
        }
      });

      autocompleteRef.current = autocomplete;
      console.log("✅ Autocomplete initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing autocomplete:", error);
      console.error("This usually means Places API is not enabled or API key is invalid");
    }
  };

  // Re-initialize when script loads or location bias changes
  useEffect(() => {
    if (isScriptLoaded && inputRef.current) {
      initializeAutocomplete();
    }
  }, [isScriptLoaded, locationBias]);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      {!isScriptLoaded && process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY && (
        <p className="text-xs text-muted-foreground mt-1">
          Loading location suggestions...
        </p>
      )}
    </div>
  );
}

