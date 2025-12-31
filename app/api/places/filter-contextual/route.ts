import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface Place {
  id: string;
  name: string;
  category?: string;
  types?: string[];
  address?: string;
}

interface TripContext {
  travelerType?: string;
  tags?: string[];
  destination?: string;
}

export async function POST(request: NextRequest) {
  const { places, tripContext } = await request.json();

  if (!places || !Array.isArray(places) || places.length === 0) {
    return NextResponse.json({ filteredPlaces: [] });
  }

  if (!GEMINI_API_KEY) {
    console.warn("Gemini API key not configured, returning all places");
    return NextResponse.json({ filteredPlaces: places });
  }

  try {
    // Build context string
    const contextParts = [];
    if (tripContext.travelerType) {
      contextParts.push(`Traveler type: ${tripContext.travelerType}`);
    }
    if (tripContext.tags && tripContext.tags.length > 0) {
      contextParts.push(`Preferences: ${tripContext.tags.join(", ")}`);
    }
    if (tripContext.destination) {
      contextParts.push(`Destination: ${tripContext.destination}`);
    }

    const contextString = contextParts.join("\n");

    // Build places list for AI
    const placesString = places
      .map((p: Place, idx: number) => {
        const category = p.category || (p.types && p.types[0]) || "unknown";
        return `${idx + 1}. ${p.name} (${category})`;
      })
      .join("\n");

    const prompt = `You are a travel recommendation filter. Given a trip context and a list of places, filter OUT places that are NOT relevant or appropriate for the traveler's preferences.

Trip Context:
${contextString}

Places to evaluate:
${placesString}

Return ONLY the numbers of places that ARE relevant and appropriate for this trip context. Exclude:
- Places that don't match the traveler type (e.g., schools/universities for romantic couples, nightclubs for family trips)
- Places that contradict the preferences (e.g., party venues for relaxation-focused trips)
- Generic or boring places that don't add value to the experience

Return your response as a JSON array of numbers representing the relevant places. For example: [1, 3, 5, 7]

If ALL places are irrelevant, return an empty array: []
If ALL places are relevant, return all numbers: [1, 2, 3, ...]`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    console.log("🤖 AI filtering response:", aiResponse);

    // Parse the AI response to extract numbers
    let relevantIndices: number[] = [];
    try {
      // Try to extract JSON array from response
      const jsonMatch = aiResponse.match(/\[[\d,\s]+\]/);
      if (jsonMatch) {
        relevantIndices = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      // If parsing fails, return all places (fail safe)
      return NextResponse.json({ filteredPlaces: places });
    }

    // Filter places based on AI response (convert 1-indexed to 0-indexed)
    const filteredPlaces = relevantIndices
      .map((idx) => places[idx - 1])
      .filter(Boolean);

    // Log what was filtered out
    const filteredOutPlaces = places.filter((p: Place) => !filteredPlaces.includes(p));
    if (filteredOutPlaces.length > 0) {
      console.log(
        `🚫 Filtered out ${filteredOutPlaces.length} irrelevant places:`,
        filteredOutPlaces.map((p: Place) => p.name)
      );
    }

    console.log(
      `✅ Kept ${filteredPlaces.length} contextually relevant places out of ${places.length}`
    );

    return NextResponse.json({ filteredPlaces });
  } catch (error) {
    console.error("Error filtering places with AI:", error);
    // Fail safe: return all places if AI filtering fails
    return NextResponse.json({ filteredPlaces: places });
  }
}

