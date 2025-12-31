import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const placeId = searchParams.get("placeId");
  const placeName = searchParams.get("placeName");
  const category = searchParams.get("category");

  if (!placeId || !placeName) {
    return NextResponse.json({ error: "placeId and placeName are required" }, { status: 400 });
  }

  try {
    // First, get reviews from Google Places API
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,types&key=${GOOGLE_PLACES_API_KEY}`;
    
    const detailsResponse = await fetch(detailsUrl);
    if (!detailsResponse.ok) {
      throw new Error(`Places API error: ${detailsResponse.statusText}`);
    }

    const detailsData = await detailsResponse.json();
    const reviews = detailsData.result?.reviews || [];
    const types = detailsData.result?.types || [];

    // Extract activities from reviews using AI
    let activities: string[] = [];

    if (genAI && reviews.length > 0) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        
        // Get top reviews (most helpful/rated)
        const topReviews = reviews
          .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 5)
          .map((r: any) => r.text)
          .join("\n\n");

        const prompt = `You are analyzing reviews for "${placeName}" (Category: ${category || "attraction"}).

REVIEWS:
${topReviews}

TASK:
Extract 3-5 specific things visitors can DO or EXPERIENCE at this place. Focus on:
- Specific activities mentioned in reviews
- Unique experiences or highlights
- What makes this place special
- Practical things to do (not generic descriptions)

Return ONLY a JSON array of activity strings, each 5-15 words:
["Activity 1", "Activity 2", "Activity 3", ...]

Example format:
["Enjoy panoramic city views from the observation deck", "Take photos at the iconic landmark", "Explore the interactive exhibits", "Attend live cultural performances"]

Return ONLY the JSON array, no markdown, no explanation:`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text().trim();

        // Extract JSON from response
        let jsonText = text;
        if (jsonText.startsWith("```json")) {
          jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
        } else if (jsonText.startsWith("```")) {
          jsonText = jsonText.replace(/```\n?/g, "");
        }

        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed)) {
          activities = parsed.slice(0, 5); // Limit to 5 activities
        }
      } catch (error) {
        console.error("Error extracting activities with AI:", error);
        // Fallback: extract from reviews manually
        activities = extractActivitiesFromReviews(reviews, placeName, category);
      }
    } else {
      // Fallback: extract from reviews manually
      activities = extractActivitiesFromReviews(reviews, placeName, category);
    }

    // If no activities found, provide category-based defaults
    if (activities.length === 0) {
      activities = getDefaultActivities(category || "attraction", placeName);
    }

    return NextResponse.json({
      activities: activities.slice(0, 5), // Max 5 activities
    });

  } catch (error) {
    console.error("Error fetching activities:", error);
    // Return default activities based on category
    return NextResponse.json({
      activities: getDefaultActivities(category || "attraction", placeName || "this place"),
    });
  }
}

function extractActivitiesFromReviews(reviews: any[], placeName: string, category?: string | null): string[] {
  // Simple keyword extraction from reviews
  const activities: string[] = [];
  const reviewText = reviews.slice(0, 5).map((r: any) => r.text).join(" ").toLowerCase();

  // Category-specific activity patterns
  const patterns: Record<string, string[]> = {
    food: ["try the", "order the", "taste the", "enjoy the", "sample"],
    nightlife: ["dance", "drink", "enjoy live music", "watch", "experience"],
    attraction: ["visit", "explore", "see", "view", "tour", "discover"],
    nature: ["walk", "hike", "relax", "enjoy the view", "photograph"],
    museum: ["view the", "see the", "explore the", "learn about", "discover"],
    shopping: ["shop for", "browse", "find", "purchase", "explore"],
  };

  // This is a simple fallback - AI extraction is preferred
  return getDefaultActivities(category || "attraction", placeName);
}

function getDefaultActivities(category: string, placeName: string): string[] {
  const defaults: Record<string, string[]> = {
    food: [
      `Try signature dishes at ${placeName}`,
      "Experience local flavors",
      "Enjoy the dining atmosphere",
    ],
    nightlife: [
      "Enjoy drinks and music",
      "Experience the nightlife scene",
      "Dance and socialize",
    ],
    attraction: [
      `Explore ${placeName}`,
      "Take photos and enjoy the views",
      "Learn about the history and culture",
    ],
    nature: [
      "Take a peaceful walk",
      "Enjoy the natural scenery",
      "Relax in the outdoor space",
    ],
    museum: [
      "View the exhibits and collections",
      "Learn about the history",
      "Explore the galleries",
    ],
    shopping: [
      "Browse the shops and stores",
      "Find unique items and souvenirs",
      "Explore the shopping area",
    ],
    entertainment: [
      "Watch shows or performances",
      "Enjoy entertainment activities",
      "Experience the venue",
    ],
    religious: [
      "Visit and explore the site",
      "Experience the spiritual atmosphere",
      "Learn about the religious significance",
    ],
    beach: [
      "Relax on the beach",
      "Enjoy water activities",
      "Take in the coastal views",
    ],
  };

  return defaults[category] || defaults.attraction;
}

