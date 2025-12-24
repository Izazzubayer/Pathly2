import { NextRequest, NextResponse } from "next/server";

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

export async function POST(request: NextRequest) {
  if (!GOOGLE_PLACES_API_KEY) {
    return NextResponse.json(
      { error: "Google Places API key not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { start, end } = body;

    if (!start || !end || !start.lat || !start.lng || !end.lat || !end.lng) {
      return NextResponse.json(
        { error: "Invalid start or end coordinates" },
        { status: 400 }
      );
    }

    console.log(`📍 Calculating route from (${start.lat}, ${start.lng}) to (${end.lat}, ${end.lng})`);

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${start.lat},${start.lng}&destination=${end.lat},${end.lng}&key=${GOOGLE_PLACES_API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Directions API HTTP error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Directions API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    console.log("Directions API response status:", data.status);

    if (data.status !== "OK") {
      console.error(`❌ Directions API returned error status: ${data.status}`);
      console.error("Error message:", data.error_message || "No error message");

      let errorMessage = "Failed to calculate route";
      if (data.status === "REQUEST_DENIED") {
        errorMessage = "Directions API access denied. Make sure the API is enabled in Google Cloud Console.";
      } else if (data.status === "OVER_QUERY_LIMIT") {
        errorMessage = "API quota exceeded. Please try again later.";
      } else if (data.status === "ZERO_RESULTS") {
        errorMessage = "No route found between these locations.";
      }

      return NextResponse.json(
        { error: errorMessage, status: data.status },
        { status: 400 }
      );
    }

    if (!data.routes || data.routes.length === 0) {
      console.error("❌ No routes found in response");
      return NextResponse.json(
        { error: "No routes found" },
        { status: 404 }
      );
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    const result = {
      distance: leg.distance.value,
      duration: leg.duration.value,
      polyline: route.overview_polyline.points,
      steps: leg.steps.map((step: any) => ({
        start: {
          lat: step.start_location.lat,
          lng: step.start_location.lng,
        },
        end: {
          lat: step.end_location.lat,
          lng: step.end_location.lng,
        },
      })),
    };

    console.log("✅ Route calculated successfully");
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error calculating route:", error);
    return NextResponse.json(
      { error: "Failed to calculate route", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

