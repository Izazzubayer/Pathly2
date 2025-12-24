"use client";

import { useEffect, useRef, useState } from "react";
import type { Coordinates, Place, Route as RouteType } from "@/types";
import { Loader2 } from "lucide-react";

interface MapProps {
  center: Coordinates;
  zoom?: number;
  hotel?: { name: string; coordinates: Coordinates };
  routes?: RouteType[];
  places?: Place[];
  className?: string;
  height?: string;
}

declare global {
  interface Window {
    google: any;
    initGoogleMap: () => void;
  }
}

export function Map({
  center,
  zoom = 13,
  hotel,
  routes = [],
  places = [],
  className = "",
  height = "400px",
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google?.maps) {
      initializeMap();
      return;
    }

    // Load Google Maps script
    const script = document.createElement("script");
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || "";

    if (!apiKey) {
      setError("Google Maps API key not found");
      setIsLoading(false);
      return;
    }

    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      initializeMap();
    };

    script.onerror = () => {
      setError("Failed to load Google Maps");
      setIsLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup
      markersRef.current.forEach((marker) => marker?.setMap?.(null));
      polylinesRef.current.forEach((renderer) => renderer?.setMap?.(null));
    };
  }, []);

  const initializeMap = () => {
    if (!mapRef.current || !window.google?.maps) return;

    try {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: center.lat, lng: center.lng },
        zoom,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      // Add hotel marker
      if (hotel && hotel.coordinates.lat !== 0 && hotel.coordinates.lng !== 0) {
        const hotelMarker = new window.google.maps.Marker({
          position: hotel.coordinates,
          map,
          title: hotel.name || "Hotel",
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#000",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
          label: {
            text: "🏨",
            fontSize: "16px",
          },
        });

        const hotelInfoWindow = new window.google.maps.InfoWindow({
          content: `<div class="p-2"><strong>${hotel.name}</strong><br/>Hotel (Anchor)</div>`,
        });

        hotelMarker.addListener("click", () => {
          hotelInfoWindow.open(map, hotelMarker);
        });

        markersRef.current.push(hotelMarker);
      }

      // Add place markers
      places.forEach((place) => {
        if (!place.coordinates || place.coordinates.lat === 0 || place.coordinates.lng === 0) {
          return;
        }

        const marker = new window.google.maps.Marker({
          position: place.coordinates,
          map,
          title: place.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: place.confirmed ? "#22c55e" : "#94a3b8",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div class="p-2">
              <strong>${place.name}</strong><br/>
              <span class="text-sm text-gray-600 capitalize">${place.category}</span>
              ${place.area ? `<br/><span class="text-xs text-gray-500">${place.area}</span>` : ""}
            </div>
          `,
        });

        marker.addListener("click", () => {
          infoWindow.open(map, marker);
        });

        markersRef.current.push(marker);
      });

      // Add route polylines
      routes.forEach((route) => {
        if (
          route.start.lat === 0 ||
          route.start.lng === 0 ||
          route.end.lat === 0 ||
          route.end.lng === 0
        ) {
          return;
        }

        // Use Directions Renderer for proper route visualization
        const directionsService = new window.google.maps.DirectionsService();
        const directionsRenderer = new window.google.maps.DirectionsRenderer({
          map,
          suppressMarkers: true, // We'll use our own markers
          polylineOptions: {
            strokeColor: "#2563eb", // Blue color
            strokeWeight: 5,
            strokeOpacity: 0.8,
          },
          preserveViewport: true, // Don't auto-zoom, we'll handle bounds
        });

        directionsService.route(
          {
            origin: route.start,
            destination: route.end,
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result: any, status: any) => {
            if (status === "OK") {
              directionsRenderer.setDirections(result);
            } else {
              console.warn("Directions request failed:", status);
            }
          }
        );

        polylinesRef.current.push(directionsRenderer);
      });

      // Fit bounds to show all markers and routes
      const bounds = new window.google.maps.LatLngBounds();
      
      if (hotel?.coordinates && hotel.coordinates.lat !== 0) {
        bounds.extend(hotel.coordinates);
      }
      
      places.forEach((place) => {
        if (place.coordinates && place.coordinates.lat !== 0) {
          bounds.extend(place.coordinates);
        }
      });

      routes.forEach((route) => {
        if (route.start.lat !== 0) bounds.extend(route.start);
        if (route.end.lat !== 0) bounds.extend(route.end);
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error initializing map:", error);
      setError("Failed to initialize map");
      setIsLoading(false);
    }
  };

  // Decode polyline (simplified implementation)
  const decodePolyline = (encoded: string): any[] => {
    const poly = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      poly.push({ lat: lat * 1e-5, lng: lng * 1e-5 });
    }

    return poly;
  };

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-secondary rounded-lg ${className}`}
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary rounded-lg z-10">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full rounded-lg" style={{ minHeight: height }} />
    </div>
  );
}

