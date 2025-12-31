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
  countryRestriction?: string; // ISO country code (e.g., "TH" for Thailand) - restricts to country
  clearOnSelect?: boolean; // Whether to clear the input after selection (default: false)
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
  types = [], // Default to all places (empty array = no restriction)
  locationBias,
  countryRestriction,
  clearOnSelect = false, // Default: keep the value visible
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  
  // Store callbacks in refs to avoid re-initializing autocomplete
  const onSelectRef = useRef(onSelect);
  const onChangeRef = useRef(onChange);
  
  // Update refs when callbacks change
  useEffect(() => {
    onSelectRef.current = onSelect;
    onChangeRef.current = onChange;
  }, [onSelect, onChange]);

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
      
      // Add country restriction if provided (restricts to entire country)
      if (countryRestriction) {
        autocompleteOptions.componentRestrictions = {
          country: countryRestriction.toLowerCase(),
        };
        console.log("🌍 Country restriction applied:", countryRestriction);
      } else if (locationBias) {
        // Add location bias if provided (restricts results to a specific area)
        // Only use location bias if no country restriction is set
        const circle = new window.google.maps.Circle({
          center: locationBias,
          radius: 50000, // 50km radius around the destination
        });
        autocompleteOptions.bounds = circle.getBounds();
        autocompleteOptions.strictBounds = true; // Strictly enforce the bounds
        console.log("🎯 Location bias applied:", locationBias);
      }
      
      // Clean up existing autocomplete if it exists
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
      
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, autocompleteOptions);
      autocompleteRef.current = autocomplete;

      autocomplete.addListener("place_changed", () => {
        console.log("🔔 place_changed event fired!");
        const place = autocomplete.getPlace();
        console.log("📍 Place selected from autocomplete:", place);
        console.log("📍 Place details:", {
          name: place.name,
          address: place.formatted_address,
          place_id: place.place_id,
          geometry: place.geometry,
          types: place.types,
        });
        
        // Check if place has valid data
        if (!place) {
          console.warn("⚠️ Place is null or undefined");
          return;
        }
        
        if (!place.formatted_address && !place.name) {
          console.warn("⚠️ Place selected but missing name/address");
          return;
        }
        
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
        
        console.log("📍 Prepared selectedPlace:", selectedPlace);
        console.log("📍 Calling onSelectRef.current with:", selectedPlace);
        
        // Call onSelect callback using ref to ensure we have the latest version
        try {
          onSelectRef.current(selectedPlace);
          console.log("✅ onSelect callback executed successfully");
        } catch (error) {
          console.error("❌ Error in onSelect callback:", error);
          console.error("❌ Error stack:", error instanceof Error ? error.stack : "No stack trace");
        }
        
        // Clear the input value after selection (only if clearOnSelect is true)
        if (clearOnSelect) {
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.value = "";
              onChangeRef.current(""); // Update controlled value
            }
          }, 100);
        }
      });
      
      console.log("✅ Autocomplete listener attached");

      autocompleteRef.current = autocomplete;
      console.log("✅ Autocomplete initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing autocomplete:", error);
      console.error("This usually means Places API is not enabled or API key is invalid");
    }
  };

  // Re-initialize when script loads or when countryRestriction changes
  useEffect(() => {
    if (isScriptLoaded && inputRef.current) {
      // Clean up existing autocomplete if it exists
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
      initializeAutocomplete();
    }
  }, [isScriptLoaded, countryRestriction]);
  
  // Update location bias if autocomplete already exists (only if no country restriction)
  useEffect(() => {
    if (autocompleteRef.current && locationBias && !countryRestriction && window.google?.maps) {
      const circle = new window.google.maps.Circle({
        center: locationBias,
        radius: 50000,
      });
      autocompleteRef.current.setBounds(circle.getBounds());
    }
  }, [locationBias, countryRestriction]);
  
  // Clean up autocomplete when component unmounts
  useEffect(() => {
    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, []);

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

