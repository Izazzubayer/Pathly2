"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  showNumberedMarkers?: boolean; // Show numbered markers instead of green circles
  selectedDayIndex?: number; // Day index for display purposes
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
  showNumberedMarkers = false,
  selectedDayIndex,
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;

    try {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: center.lat, lng: center.lng },
        zoom,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: "transit.line",
            stylers: [{ visibility: "off" }],
          },
          {
            featureType: "transit.station",
            stylers: [{ visibility: "off" }],
          },
        ],
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
            scale: 14,
            fillColor: "#000000", // Gray color to differentiate from black numbered markers
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
          label: {
            text: "H",
            color: "#fff",
            fontSize: "12px",
            fontWeight: "bold",
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
      places.forEach((place, index) => {
        if (!place.coordinates || place.coordinates.lat === 0 || place.coordinates.lng === 0) {
          return;
        }

        // Create numbered marker if showNumberedMarkers is true
        const markerIcon = showNumberedMarkers
          ? {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: "#000000", // Black
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 2,
            }
          : {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: place.confirmed ? "#22c55e" : "#94a3b8",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 2,
            };

        const marker = new window.google.maps.Marker({
          position: place.coordinates,
          map,
          title: place.name,
          icon: markerIcon,
          label: showNumberedMarkers
            ? {
                text: (index + 1).toString(),
                color: "#fff",
                fontSize: "12px",
                fontWeight: "bold",
              }
            : undefined,
        });

        // Create info window with loading state
        const infoWindow = new window.google.maps.InfoWindow({
          maxWidth: 400,
          content: `
            <div style="padding: 12px; min-width: 300px;">
              <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">${place.name}</div>
              <div style="font-size: 13px; color: #666; margin-bottom: 8px; text-transform: capitalize;">${place.category}</div>
              ${place.area ? `<div style="font-size: 12px; color: #999; margin-bottom: 8px;">${place.area}</div>` : ""}
              <div style="font-size: 12px; color: #999;">Loading details...</div>
            </div>
          `,
        });

        marker.addListener("click", async () => {
          // Helper function to escape HTML
          const escapeHtml = (text: string) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
          };

          // Helper function to build basic info content with available data
          const buildBasicContent = (address?: string, phone?: string, foundPlaceId?: string) => {
            // Build the best possible Google Maps link
            let mapsUrl = "https://www.google.com/maps/search/?api=1";
            
            if (foundPlaceId || place.placeId) {
              // Best: Use placeId for exact place
              mapsUrl += `&query=${encodeURIComponent(place.name)}&query_place_id=${foundPlaceId || place.placeId}`;
            } else if (place.coordinates && place.coordinates.lat !== 0 && place.coordinates.lng !== 0) {
              // Good: Use name + coordinates for better results than just coordinates
              mapsUrl += `&query=${encodeURIComponent(place.name)}+${place.coordinates.lat},${place.coordinates.lng}`;
            } else {
              // Fallback: Just search by name
              mapsUrl += `&query=${encodeURIComponent(place.name)}`;
            }
            
            return `
              <div style="padding: 0; min-width: 300px; max-width: 400px;">
                <div style="padding: 12px;">
                  <div style="font-weight: 600; font-size: 18px; margin-bottom: 6px; line-height: 1.3; color: hsl(var(--foreground));">${escapeHtml(place.name)}</div>
                  ${place.category && place.category !== "other" && place.category.trim() !== "" ? `<div style="font-size: 13px; color: hsl(var(--muted-foreground)); margin-bottom: 8px; text-transform: capitalize;">${escapeHtml(place.category)}</div>` : ""}
                  ${address ? `<div style="font-size: 12px; color: hsl(var(--muted-foreground)); margin-bottom: 8px; line-height: 1.4;">${escapeHtml(address)}</div>` : ""}
                  ${place.area ? `<div style="font-size: 12px; color: hsl(var(--muted-foreground)); margin-bottom: 8px;">${escapeHtml(place.area)}</div>` : ""}
                  ${phone ? `<div style="font-size: 12px; color: hsl(var(--muted-foreground)); margin-bottom: 8px;">
                    <a href="tel:${phone.replace(/\s/g, '')}" style="color: hsl(var(--primary)); text-decoration: none;">${escapeHtml(phone)}</a>
                  </div>` : ""}
                </div>
              </div>
            `;
          };

          // Open info window immediately with basic info
          infoWindow.setContent(buildBasicContent());
          infoWindow.open(map, marker);

          // Fetch detailed information - try placeId first, then search by name
          const fetchPlaceDetails = async () => {
            console.log(`🔍 Fetching details for: ${place.name}`);
            
            // Try placeId if available
            if (place.placeId) {
                  console.log(`Trying with placeId: ${place.placeId}`);
              try {
                const response = await fetch(`/api/places/details?placeId=${place.placeId}`);
                if (response.ok) {
                  const details = await response.json();
                  console.log(`✅ Got details via placeId:`, details);
                  return { ...details, foundPlaceId: place.placeId };
                } else {
                  console.log(`❌ placeId fetch failed: ${response.status}`);
                }
              } catch (error) {
                console.warn(`Failed to fetch details by placeId for ${place.name}:`, error);
              }
            }

            // Fallback: Search by name and location using our API endpoint
            if (place.name) {
              console.log(`🔎 Searching by name: ${place.name}`);
              try {
                let searchUrl = `/api/places/search?query=${encodeURIComponent(place.name)}`;
                
                // Add location bias if we have coordinates
                if (place.coordinates && place.coordinates.lat !== 0 && place.coordinates.lng !== 0) {
                  searchUrl += `&lat=${place.coordinates.lat}&lng=${place.coordinates.lng}`;
                  console.log(`With coordinates: ${place.coordinates.lat}, ${place.coordinates.lng}`);
                }
                
                console.log(`Calling: ${searchUrl}`);
                const searchResponse = await fetch(searchUrl);
                
                if (searchResponse.ok) {
                  const details = await searchResponse.json();
                  console.log(`✅ Got details via search:`, details);
                  // Include the found placeId for the Maps link
                  return { ...details, foundPlaceId: details.placeId };
                } else {
                  console.log(`❌ Search failed: ${searchResponse.status}`, await searchResponse.text());
                }
              } catch (error) {
                console.warn(`Failed to search for place ${place.name}:`, error);
              }
            }
            
            console.log(`❌ No details found for ${place.name}`);
            return null;
          };

          // Fetch and display details
          (async () => {
            try {
              const details = await fetchPlaceDetails();
            
            if (details) {

              // Build photo gallery HTML - grid layout
              let photosHtml = "";
              if (details.photos && details.photos.length > 0) {
                // Create a unique ID for this gallery to avoid conflicts
                const galleryId = `gallery-${place.id}-${Date.now()}`;
                photosHtml = `
                  <div style="margin: 0 -12px 12px -12px; position: relative; z-index: 1;">
                    <div id="${galleryId}" style="display: grid; grid-template-columns: repeat(5, 1fr); grid-template-rows: repeat(2, 1fr); gap: 4px; padding: 8px 12px 12px 12px;">
                      <style>
                        #${galleryId} img {
                          transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
                          position: relative;
                        }
                        #${galleryId} img:hover {
                          transform: scale(1.05);
                          box-shadow: 0 8px 16px rgba(0,0,0,0.25);
                          z-index: 10;
                        }
                      </style>
                      ${details.photos.slice(0, 10).map((photoUrl: string, idx: number) => {
                        const photosJson = JSON.stringify(details.photos.slice(0, 10));
                        const placeNameJson = JSON.stringify(escapeHtml(place.name));
                        return `
                        <div style="position: relative; aspect-ratio: 1; overflow: hidden; border-radius: 6px;">
                          <img 
                            src="${photoUrl}" 
                            alt="${escapeHtml(place.name)} - Photo ${idx + 1}"
                            style="width: 100%; height: 100%; object-fit: cover; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.1); user-select: none; -webkit-user-drag: none; pointer-events: auto; display: block;"
                            data-photos='${photosJson.replace(/'/g, "&apos;")}'
                            data-index="${idx}"
                            data-place-name='${placeNameJson.replace(/'/g, "&apos;")}'
                            onclick="(function() {
                              const clickedImg = event.target;
                              const allPhotos = JSON.parse(clickedImg.getAttribute('data-photos'));
                              let currentIndex = parseInt(clickedImg.getAttribute('data-index'));
                              let zoomLevel = 1;
                              const placeName = JSON.parse(clickedImg.getAttribute('data-place-name'));
                              
                              const modal = document.createElement('div');
                              modal.setAttribute('role', 'dialog');
                              modal.setAttribute('aria-label', 'Image viewer');
                              modal.setAttribute('aria-modal', 'true');
                              modal.tabIndex = 0;
                              modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; align-items: center; justify-content: center; cursor: zoom-out; outline: none;';
                              
                              const fullImg = document.createElement('img');
                              fullImg.setAttribute('role', 'img');
                              fullImg.setAttribute('aria-label', placeName + ' - Photo ' + (currentIndex + 1));
                              fullImg.setAttribute('tabIndex', '0');
                              fullImg.src = clickedImg.src.replace('maxwidth=800', 'maxwidth=2000');
                              fullImg.style.cssText = 'max-width: 90%; max-height: 90%; object-fit: contain; border-radius: 8px; cursor: zoom-in; transition: transform 0.2s; transform: scale(1); outline: none;';
                              
                              const updateImage = (index) => {
                                if (index < 0 || index >= allPhotos.length) return;
                                currentIndex = index;
                                const newUrl = allPhotos[index].replace('maxwidth=800', 'maxwidth=2000');
                                fullImg.src = newUrl;
                                fullImg.setAttribute('aria-label', placeName + ' - Photo ' + (index + 1));
                                zoomLevel = 1;
                                fullImg.style.transform = 'scale(1)';
                              };
                              
                              const closeModal = () => {
                                if (modal.parentNode) {
                                  document.body.removeChild(modal);
                                }
                                document.body.style.overflow = '';
                                if (clickedImg && clickedImg.focus) {
                                  clickedImg.focus();
                                }
                              };
                              
                              const handleKeyDown = (e) => {
                                if (e.key === 'Escape' || e.key === 'Esc') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  closeModal();
                                  return false;
                                } else if (e.key === 'ArrowLeft') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const newIndex = currentIndex > 0 ? currentIndex - 1 : allPhotos.length - 1;
                                  updateImage(newIndex);
                                  return false;
                                } else if (e.key === 'ArrowRight') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const newIndex = currentIndex < allPhotos.length - 1 ? currentIndex + 1 : 0;
                                  updateImage(newIndex);
                                  return false;
                                } else if (e.key === '+' || e.key === '=') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  zoomLevel = Math.min(zoomLevel + 0.25, 3);
                                  fullImg.style.transform = 'scale(' + zoomLevel + ')';
                                  return false;
                                } else if (e.key === '-' || e.key === '_') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  zoomLevel = Math.max(zoomLevel - 0.25, 0.5);
                                  fullImg.style.transform = 'scale(' + zoomLevel + ')';
                                  return false;
                                } else if (e.key === '0') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  zoomLevel = 1;
                                  fullImg.style.transform = 'scale(1)';
                                  return false;
                                }
                              };
                              
                              fullImg.onclick = function(e) { 
                                e.stopPropagation();
                                if (zoomLevel === 1) {
                                  zoomLevel = 2;
                                  fullImg.style.transform = 'scale(2)';
                                } else {
                                  zoomLevel = 1;
                                  fullImg.style.transform = 'scale(1)';
                                }
                              };
                              
                              fullImg.onkeydown = function(e) {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (zoomLevel === 1) {
                                    zoomLevel = 2;
                                    fullImg.style.transform = 'scale(2)';
                                  } else {
                                    zoomLevel = 1;
                                    fullImg.style.transform = 'scale(1)';
                                  }
                                }
                              };
                              
                              modal.onclick = function(e) {
                                if (e.target === modal) {
                                  closeModal();
                                }
                              };
                              
                              document.addEventListener('keydown', handleKeyDown, true);
                              modal.addEventListener('keydown', handleKeyDown, true);
                              fullImg.addEventListener('keydown', handleKeyDown, true);
                              
                              modal.appendChild(fullImg);
                              document.body.appendChild(modal);
                              document.body.style.overflow = 'hidden';
                              
                              setTimeout(() => {
                                modal.focus();
                                fullImg.focus();
                              }, 50);
                            })();"
                            onerror="this.style.display='none'"
                            draggable="false"
                            loading="lazy"
                          />
                        </div>
                      `;
                      }).join("")}
                    </div>
                  </div>
                `;
              }

              // Build rating HTML - inline with category
              let ratingHtml = "";
              if (details.rating) {
                const fullStars = Math.floor(details.rating);
                const hasHalfStar = details.rating % 1 >= 0.5;
                const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
                const stars = "★".repeat(fullStars) + (hasHalfStar ? "½" : "") + "☆".repeat(emptyStars);
                ratingHtml = `
                  <span style="display: inline-flex; align-items: center; gap: 6px;">
                    <span style="color: hsl(var(--chart-4)); font-size: 14px; letter-spacing: 1px;">${stars.substring(0, 5)}</span>
                    <span style="font-size: 13px; color: hsl(var(--foreground)); font-weight: 600;">${details.rating.toFixed(1)}</span>
                    ${details.userRatingsTotal ? `<span style="font-size: 12px; color: hsl(var(--muted-foreground));">(${details.userRatingsTotal.toLocaleString()} reviews)</span>` : ""}
                  </span>
                `;
              }

              // Build address HTML
              let addressHtml = "";
              if (details.address) {
                addressHtml = `
                  <div style="font-size: 12px; color: hsl(var(--muted-foreground)); margin-bottom: 8px; line-height: 1.5; word-wrap: break-word; overflow-wrap: break-word;">
                    ${escapeHtml(details.address)}
                  </div>
                `;
              }

              // Build phone HTML - removed, phone is only accessible via Call button
              let phoneHtml = "";

              // Build price level HTML
              let priceHtml = "";
              if (details.priceLevel !== undefined && details.priceLevel !== null) {
                const priceSymbols = "$".repeat(details.priceLevel);
                priceHtml = `
                  <div style="font-size: 12px; color: hsl(var(--muted-foreground)); margin-bottom: 8px;">
                    <span style="color: hsl(var(--primary)); font-weight: 500;">${priceSymbols}</span>
                    <span style="margin-left: 6px;">${priceSymbols.length === 1 ? "Inexpensive" : priceSymbols.length === 2 ? "Moderate" : priceSymbols.length === 3 ? "Expensive" : "Very Expensive"}</span>
                  </div>
                `;
              }

              // Build opening hours HTML - inline chip for title
              let openStatusChip = "";
              if (details.openingHours && details.openingHours.length > 0) {
                // Simple check: if we have hours data, assume it's open (can be enhanced later)
                // For now, just show "Open" if hours exist
                const isOpen = true; // Could be enhanced to check current time
                openStatusChip = `
                  <div style="display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: ${isOpen ? 'hsl(142 76% 36%)' : 'hsl(var(--destructive))'}; color: hsl(0 0% 100%); margin-left: 8px;">
                    ${isOpen ? 'Open' : 'Closed'}
                  </div>
                `;
              }

              // Build action buttons HTML
              let actionsHtml = "";
              // Use foundPlaceId if available (from search), otherwise use place.placeId
              const effectivePlaceId = details.foundPlaceId || place.placeId;
              
              if (details.website || effectivePlaceId || details.phone) {
                // Build the best possible Google Maps link
                let mapsUrl = "https://www.google.com/maps/search/?api=1";
                if (effectivePlaceId) {
                  mapsUrl += `&query=${encodeURIComponent(place.name)}&query_place_id=${effectivePlaceId}`;
                } else if (place.coordinates && place.coordinates.lat !== 0 && place.coordinates.lng !== 0) {
                  mapsUrl += `&query=${encodeURIComponent(place.name)}+${place.coordinates.lat},${place.coordinates.lng}`;
                } else {
                  mapsUrl += `&query=${encodeURIComponent(place.name)}`;
                }
                
                actionsHtml = `
                  <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid hsl(var(--border));">
                    <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                      ${details.website ? `
                        <a 
                          href="${details.website}" 
                          target="_blank"
                          style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 0 12px; height: 32px; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); text-decoration: none; border-radius: 9999px; font-size: 12px; font-weight: 600; transition: all 0.2s; white-space: nowrap;"
                          onmouseover="this.style.background='hsl(var(--primary) / 0.9)'"
                          onmouseout="this.style.background='hsl(var(--primary))'"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                          <span>Website</span>
                        </a>
                      ` : ""}
                      ${details.phone ? `
                        <a 
                          href="tel:${details.phone.replace(/\s/g, '')}" 
                          style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 0 12px; height: 32px; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); text-decoration: none; border-radius: 9999px; font-size: 12px; font-weight: 600; transition: all 0.2s; white-space: nowrap;"
                          onmouseover="this.style.background='hsl(var(--primary) / 0.9)'"
                          onmouseout="this.style.background='hsl(var(--primary))'"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                          <span>Call</span>
                        </a>
                      ` : ""}
                      <a 
                        href="${mapsUrl}"
                        target="_blank"
                        style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 0 12px; height: 32px; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); text-decoration: none; border-radius: 9999px; font-size: 12px; font-weight: 600; transition: all 0.2s; white-space: nowrap;"
                        onmouseover="this.style.background='hsl(var(--primary) / 0.9)'"
                        onmouseout="this.style.background='hsl(var(--primary))'"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
                        <span>Maps</span>
                      </a>
                    </div>
                  </div>
                `;
              }

              // Update info window with detailed content
              infoWindow.setContent(`
                <div style="padding: 0; min-width: 350px; max-width: 400px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; overflow-x: hidden; overflow-y: visible; box-sizing: border-box;">
                  ${photosHtml}
                  <div style="padding: 12px; position: relative; z-index: 0; overflow-x: hidden; word-wrap: break-word; overflow-wrap: break-word;">
                    <div style="display: flex; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 8px;">
                      <div style="font-weight: 600; font-size: 18px; line-height: 1.3; color: hsl(var(--foreground)); flex: 1; min-width: 0; word-break: break-word;">${escapeHtml(place.name)}</div>
                      ${openStatusChip}
                    </div>
                    ${place.category && place.category !== "other" && place.category.trim() !== "" ? `
                      <div style="margin-bottom: 8px; display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <div style="font-size: 13px; color: hsl(var(--muted-foreground)); text-transform: capitalize;">${escapeHtml(place.category)}</div>
                        ${ratingHtml ? `<span style="color: hsl(var(--muted-foreground));">•</span>${ratingHtml}` : ""}
                      </div>
                    ` : ratingHtml ? `<div style="margin-bottom: 8px;">${ratingHtml}</div>` : ""}
                    ${priceHtml}
                    ${addressHtml}
                    ${phoneHtml}
                    ${actionsHtml}
                  </div>
                </div>
              `);
            } else {
              // No details found, show basic info with foundPlaceId if we have it
              console.log(`ℹ️ No details found, showing basic info`);
              infoWindow.setContent(buildBasicContent(undefined, undefined, details?.foundPlaceId));
            }
            } catch (error) {
              // Network errors or other unexpected issues - log as warning
              console.warn(`Error fetching place details for ${place.name}:`, error);
              // Show basic info if fetch fails
              infoWindow.setContent(buildBasicContent());
            }
          })();
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
  }, [center, zoom, hotel, places, routes]);

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google?.maps) {
      initializeMap();
      return;
    }

    // Check if script is already in the DOM
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );

    if (existingScript) {
      // Script is loading, wait for it
      const checkInterval = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkInterval);
          initializeMap();
        }
      }, 100);

      // Cleanup interval after 10 seconds
      setTimeout(() => clearInterval(checkInterval), 10000);
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
  }, [initializeMap]);

  // Re-initialize map when places, hotel, routes, center, or zoom change
  useEffect(() => {
    if (window.google?.maps && mapInstanceRef.current) {
      // Clear existing markers and polylines
      markersRef.current.forEach((marker) => marker?.setMap?.(null));
      polylinesRef.current.forEach((renderer) => renderer?.setMap?.(null));
      markersRef.current = [];
      polylinesRef.current = [];

      // Re-initialize with new data
      initializeMap();
    }
  }, [initializeMap]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-secondary ${className}`}
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary z-10">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: height }} />
    </div>
  );
}

