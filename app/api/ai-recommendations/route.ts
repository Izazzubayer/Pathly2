import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const SERPER_API_KEY = process.env.SERPER_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ GOOGLE_GEMINI_API_KEY not found in environment variables");
}

if (!SERPER_API_KEY) {
  console.error("❌ SERPER_API_KEY not found in environment variables");
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

interface AIRecommendation {
  name: string;
  reasoning: string;
  category: string;
  estimatedRating: number;
  sources: string[];
}

/**
 * Search the web using Serper API
 */
async function searchWeb(query: string, numResults: number = 10): Promise<SearchResult[]> {
  if (!SERPER_API_KEY) {
    console.error("⚠️ Serper API key not configured");
    return [];
  }

  try {
    console.log(`🔍 Searching web: "${query}" (requesting ${numResults} results)`);
    
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: numResults, // Get requested number of results
      }),
    });

    if (!response.ok) {
      console.error(`❌ Serper API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    if (data.organic) {
      console.log(`✅ Found ${data.organic.length} web results`);
      return data.organic.map((result: any, index: number) => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet || "",
        position: index + 1,
      }));
    }

    return [];
  } catch (error) {
    console.error("❌ Error searching web:", error);
    return [];
  }
}

/**
 * Use Gemini AI to analyze web results and extract recommendations
 */
async function analyzeWithAI(
  destination: string,
  travelerType: string,
  preferences: string[],
  searchResults: SearchResult[],
  numberOfRecommendations: number = 6
): Promise<AIRecommendation[]> {
  if (!genAI) {
    console.error("⚠️ Gemini AI not configured");
    return [];
  }

  try {
    console.log("🤖 Analyzing results with Gemini AI...");
    
    // Use gemini-flash-latest (fast and free model)
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `You are a travel expert analyzing web search results to recommend the BEST places in ${destination}.

TRAVELER CONTEXT:
- Type: ${travelerType}
- Preferences: ${preferences.join(", ")}

WEB SEARCH RESULTS:
${searchResults.map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}\n   Source: ${r.link}`).join("\n\n")}

TASK:
Extract the TOP ${numberOfRecommendations} SPECIFIC PLACES mentioned in these results that are:
1. Actually located in ${destination}
2. Perfect for a ${travelerType} traveler interested in ${preferences.join(", ")}
3. Highly recommended/trending based on the sources
4. NOT sketchy, dangerous, or low-quality
5. Real places (not generic categories)

IMPORTANT: Return EXACTLY ${numberOfRecommendations} places (or as many as you can find in the search results, up to ${numberOfRecommendations}).

For each place, provide:
- Exact name (as it appears on Google Maps)
- Category (food, nightlife, attraction, shopping, nature)
- Why it's recommended (2-3 sentences with specific details from sources)
- Estimated rating (4.0-5.0 based on sentiment)
- Which sources mentioned it

CRITICAL RULES:
- ONLY include places explicitly mentioned by name in the search results
- NO generic suggestions like "any rooftop bar" or "local markets"
- Prioritize places with multiple mentions or strong positive sentiment
- Filter out office buildings, random cafes, or sketchy locations
- If a place sounds suspicious or low-quality, EXCLUDE it

Return ONLY valid JSON array (no markdown, no explanation):
[
  {
    "name": "Exact Place Name",
    "reasoning": "Why this place is perfect for this traveler based on sources",
    "category": "food|nightlife|attraction|shopping|nature",
    "estimatedRating": 4.5,
    "sources": ["source1.com", "source2.com"]
  }
]`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    console.log("🤖 AI Response:", text.substring(0, 200) + "...");

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "");
    }

    const recommendations: AIRecommendation[] = JSON.parse(jsonText);
    console.log(`✅ AI extracted ${recommendations.length} recommendations`);
    
    return recommendations;
  } catch (error) {
    console.error("❌ Error analyzing with AI:", error);
    return [];
  }
}

/**
 * Main API route for AI-powered recommendations
 */
export async function POST(request: NextRequest) {
  try {
    const { destination, travelerType, preferences, numberOfRecommendations = 6 } = await request.json();

    console.log("\n🚀 AI Recommendations Request:");
    console.log(`   Destination: ${destination}`);
    console.log(`   Traveler: ${travelerType}`);
    console.log(`   Preferences: ${preferences.join(", ")}`);
    console.log(`   Number of recommendations requested: ${numberOfRecommendations}`);

    if (!destination || !travelerType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Build search queries based on traveler context
    const searchQueries: string[] = [];
    
    if (preferences.includes("nightlife")) {
      searchQueries.push(`best nightlife ${destination} 2024 Reddit`);
      searchQueries.push(`top bars clubs ${destination} trending`);
    }
    
    if (preferences.includes("food-first")) {
      searchQueries.push(`best restaurants ${destination} 2024 must try`);
      searchQueries.push(`${destination} food guide Instagram trending`);
    }
    
    if (preferences.includes("culture")) {
      searchQueries.push(`best cultural attractions ${destination} 2024`);
      searchQueries.push(`${destination} hidden gems culture`);
    }

    if (preferences.includes("nature")) {
      searchQueries.push(`best nature spots ${destination} 2024`);
      searchQueries.push(`${destination} outdoor activities scenic`);
    }

    if (preferences.includes("shopping")) {
      searchQueries.push(`best shopping ${destination} 2024 local markets`);
    }

    // If no specific preferences, use general query
    if (searchQueries.length === 0) {
      searchQueries.push(`best things to do ${destination} 2024 ${travelerType}`);
    }

    // Calculate how many results per query we need
    // We want enough results to extract numberOfRecommendations places
    // Each result might mention multiple places, but we want to be safe
    const resultsPerQuery = Math.min(20, Math.max(10, Math.ceil(numberOfRecommendations / searchQueries.length) + 5));

    // Search the web for all queries
    console.log(`\n🔍 Running ${searchQueries.length} web searches (${resultsPerQuery} results each)...`);
    const allSearchResults: SearchResult[] = [];
    
    for (const query of searchQueries) {
      const results = await searchWeb(query, resultsPerQuery);
      allSearchResults.push(...results);
    }

    if (allSearchResults.length === 0) {
      console.error("❌ No search results found");
      return NextResponse.json(
        { error: "No search results found" },
        { status: 500 }
      );
    }

    console.log(`✅ Total search results: ${allSearchResults.length}`);

    // Use AI to analyze and extract recommendations
    const recommendations = await analyzeWithAI(
      destination,
      travelerType,
      preferences,
      allSearchResults,
      numberOfRecommendations
    );

    if (recommendations.length === 0) {
      console.error("❌ AI failed to extract recommendations");
      return NextResponse.json(
        { error: "Failed to generate recommendations" },
        { status: 500 }
      );
    }

    console.log(`\n✅ Returning ${recommendations.length} AI-powered recommendations\n`);

    return NextResponse.json({
      recommendations,
      searchQueries,
      totalSources: allSearchResults.length,
    });

  } catch (error) {
    console.error("❌ Error in AI recommendations:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

