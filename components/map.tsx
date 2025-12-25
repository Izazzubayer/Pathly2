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

    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
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

      // Add route polylines using pre-fetched polyline data
      routes.forEach((route) => {
        if (
          route.start.lat === 0 ||
          route.start.lng === 0 ||
          route.end.lat === 0 ||
          route.end.lng === 0
        ) {
          return;
        }

        // If we have polyline data from server, use it directly
        if (route.polyline) {
          const decodedPath = window.google.maps.geometry.encoding.decodePath(route.polyline);
          
          const polyline = new window.google.maps.Polyline({
            path: decodedPath,
            geodesic: true,
            strokeColor: "#2563eb",
            strokeOpacity: 0.8,
            strokeWeight: 5,
            map,
          });

          polylinesRef.current.push(polyline);
        } else {
          // Fallback: draw a simple line if no polyline data
          const polyline = new window.google.maps.Polyline({
            path: [route.start, route.end],
            geodesic: true,
            strokeColor: "#94a3b8",
            strokeOpacity: 0.5,
            strokeWeight: 3,
            map,
          });

          polylinesRef.current.push(polyline);
        }
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

