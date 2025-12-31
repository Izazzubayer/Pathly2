import type { ExtractedPlace, PlaceCategory, PlaceVibe, TravelerContext } from "@/types";
import { extractPlacesFromStructuredText } from "./structured-extract";
import { HfInference } from "@huggingface/inference";

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Initialize Hugging Face client
const hf = HF_API_KEY ? new HfInference(HF_API_KEY) : null;

/**
 * Extract places using AI - tries multiple approaches
 * @param text - The text to extract places from
 * @param travelerContext - Optional traveler context to prioritize certain categories
 */
export async function extractPlacesWithHF(
  text: string,
  travelerContext?: TravelerContext
): Promise<ExtractedPlace[]> {
  console.log(`\n=== EXTRACTION START ===`);
  console.log(`Text length: ${text.length} chars`);
  
  // Step 1: Try structured extraction first (works great for lists)
  const structuredPlaces = extractPlacesFromStructuredText(text);
  console.log(`✅ Structured extraction found: ${structuredPlaces.length} places`);
  
  if (structuredPlaces.length > 0) {
    console.log("Structured places:", structuredPlaces.map(p => `${p.name} (${p.category})`).slice(0, 10));
  }
  
  // Step 2: Try OpenAI if available (best for understanding context)
  if (OPENAI_API_KEY && structuredPlaces.length < 5) {
    try {
      const openAIPlaces = await extractPlacesWithOpenAI(text);
      if (openAIPlaces.length > structuredPlaces.length) {
        console.log(`✅ OpenAI found ${openAIPlaces.length} places (using OpenAI results)`);
        return openAIPlaces;
      }
    } catch (error) {
      console.warn("OpenAI extraction failed:", error);
    }
  }
  
  // If we got good results from structured extraction, use those
  if (structuredPlaces.length >= 3) {
    console.log(`✅ Using structured extraction results (${structuredPlaces.length} places)`);
    return structuredPlaces;
  }
  
  // Step 3: Use Hugging Face AI if available
  if (!hf) {
    console.warn("No HF API key, using structured + fallback extraction");
    return structuredPlaces.length > 0 ? structuredPlaces : extractPlacesFallback(text);
  }

  try {
    // Limit text length for API
    const textToProcess = text.substring(0, 5000);
    console.log(`Trying HF AI extraction for remaining places...`);

    // Step 1: Named Entity Recognition (NER) to find place names
    const nerModel = "dslim/bert-base-NER";
    let nerEntities: any[] = [];
    
    try {
      console.log(`Calling NER model: ${nerModel}`);
      const nerResponse = await hf.tokenClassification({
        model: nerModel,
        inputs: textToProcess,
      });
      
      // Handle response format (can be array or object)
      if (Array.isArray(nerResponse)) {
        nerEntities = nerResponse;
      } else if (nerResponse && Array.isArray((nerResponse as any).entities)) {
        nerEntities = (nerResponse as any).entities;
      } else {
        console.warn("⚠️ Unexpected NER response format");
        return structuredPlaces.length > 0 ? structuredPlaces : extractPlacesFallback(text);
      }
      
      console.log(`Found ${nerEntities.length} total entities from NER`);
    } catch (error) {
      console.error("NER API error:", error);
      // Fallback to regex if API fails
      return structuredPlaces.length > 0 ? structuredPlaces : extractPlacesFallback(text);
    }
    
    if (nerEntities.length === 0) {
      console.warn("⚠️ No entities found in NER response, using fallback");
      return structuredPlaces.length > 0 ? structuredPlaces : extractPlacesFallback(text);
    }
    
    // Group consecutive tokens that form the same entity
    const locationEntities: string[] = [];
    let currentEntity = "";
    let currentType = "";

    for (const entity of nerEntities) {
      const entityGroup = entity.entity_group || entity.label || "";
      const word = (entity.word || entity.token || "").replace(/^##/, ""); // Remove BERT subword prefix
      
      // Check if it's a location entity (LOC, GPE - geopolitical entity)
      if (entityGroup === "LOC" || entityGroup === "GPE" || entityGroup === "MISC") {
        // If same entity type, continue building
        if (entityGroup === currentType || currentType === "") {
          currentEntity += (currentEntity ? " " : "") + word;
          currentType = entityGroup;
        } else {
          // New entity, save previous one
          if (currentEntity.trim().length > 2) {
            locationEntities.push(currentEntity.trim());
          }
          currentEntity = word;
          currentType = entityGroup;
        }
      } else {
        // Not a location, save current entity if exists
        if (currentEntity.trim().length > 2) {
          locationEntities.push(currentEntity.trim());
        }
        currentEntity = "";
        currentType = "";
      }
    }
    
    // Don't forget the last entity
    if (currentEntity.trim().length > 2) {
      locationEntities.push(currentEntity.trim());
    }
    
    console.log(`Found ${locationEntities.length} location entities:`, locationEntities.slice(0, 10));
    
    // Filter and deduplicate
    const uniqueEntities = Array.from(
      new Set(
        locationEntities
          .filter((word: string) => word.length > 2 && word.length < 50)
          .map((w) => w.trim())
      )
    );
    
    console.log(`Unique location entities: ${uniqueEntities.length}`);

    // Step 2: Extract places (categories will be determined by Google Places API during validation)
    const places: ExtractedPlace[] = [];
    
    // Process entities in batches to avoid rate limits
    for (const entity of uniqueEntities.slice(0, 30)) {
      let confidence = 0.7;
      
      // Step 3: Infer vibe (optional, can be slow for many places)
      let vibe: PlaceVibe | undefined;
      try {
        vibe = await inferVibe(entity, textToProcess);
      } catch (error) {
        // Vibe inference is optional, continue without it
        console.debug(`Vibe inference skipped for ${entity}`);
      }
      
      places.push({
        name: entity,
        category: "other" as PlaceCategory, // Category will be determined by Google Places API during validation
        vibe,
        confidence,
        context: "Extracted via Named Entity Recognition",
      });
    }

    // Remove duplicates
    const uniquePlaces = Array.from(
      new Map(places.map((p) => [p.name.toLowerCase(), p])).values()
    );

    // Combine HF results with structured results
    const combined = [...structuredPlaces];
    for (const hfPlace of uniquePlaces) {
      const exists = combined.some(p => p.name.toLowerCase() === hfPlace.name.toLowerCase());
      if (!exists) {
        combined.push(hfPlace);
      }
    }
    
    // Apply traveler context weighting
    const weighted = applyTravelerContextWeighting(combined, travelerContext);
    
    console.log(`✅ Combined extraction: ${weighted.length} total places`);
    return weighted;
  } catch (error) {
    console.error("Hugging Face extraction error:", error);
    // Return structured results if we have them, otherwise fallback
    return structuredPlaces.length > 0 ? structuredPlaces : extractPlacesFallback(text);
  }
}

/**
 * Apply traveler context weighting to boost confidence of relevant places
 */
function applyTravelerContextWeighting(
  places: ExtractedPlace[],
  travelerContext?: TravelerContext
): ExtractedPlace[] {
  if (!travelerContext || !travelerContext.tags || travelerContext.tags.length === 0) {
    return places;
  }

  const tags = travelerContext.tags;
  
  return places.map((place) => {
    let confidenceBoost = 0;
    
    // Boost confidence based on matching tags
    if (tags.includes("food-first") && place.category === "food") {
      confidenceBoost = 0.15;
    }
    if (tags.includes("nightlife") && place.category === "nightlife") {
      confidenceBoost = 0.15;
    }
    if (tags.includes("culture") && (place.category === "attraction" || place.category === "museum" || place.category === "religious")) {
      confidenceBoost = 0.1;
    }
    if (tags.includes("chill") && (place.category === "nature" || place.category === "beach" || place.category === "wellness" || place.vibe === "chill")) {
      confidenceBoost = 0.1;
    }
    if (tags.includes("romantic") && place.vibe === "romantic") {
      confidenceBoost = 0.15;
    }
    if (tags.includes("adventure") && place.category === "adventure") {
      confidenceBoost = 0.15;
    }
    if (tags.includes("luxury") && (place.category === "wellness" || place.category === "entertainment")) {
      confidenceBoost = 0.1;
    }
    if (tags.includes("budget") && (place.category === "shopping" || place.category === "food")) {
      confidenceBoost = 0.05;
    }
    if (tags.includes("family-friendly") && (place.category === "entertainment" || place.category === "nature" || place.category === "beach")) {
      confidenceBoost = 0.1;
    }
    if (tags.includes("educational") && (place.category === "museum" || place.category === "religious")) {
      confidenceBoost = 0.1;
    }
    if (tags.includes("nature") && (place.category === "nature" || place.category === "beach")) {
      confidenceBoost = 0.15;
    }
    
    return {
      ...place,
      confidence: Math.min(1.0, place.confidence + confidenceBoost),
    };
  });
}

/**
 * Extract places using OpenAI (better at understanding context and structure)
 */
async function extractPlacesWithOpenAI(text: string): Promise<ExtractedPlace[]> {
  const textToProcess = text.substring(0, 8000);
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a travel planning assistant. Extract ALL place names, restaurants, bars, clubs, attractions, and activities from the provided text.

The text may contain structured lists like:
- Bars/Clubs: list of bars and clubs
- Views/Attractions: places to visit
- Food: restaurants and food spots
- Activities: things to do

Extract EVERY place name you find. Return a JSON object with a "places" array. Each place should have:
- name: The exact place name (required)
- confidence: A number between 0.8 and 1.0 (required)

Note: Do NOT categorize places. Categories will be determined by Google Places API during validation.

Return format: {"places": [{"name": "...", "confidence": 0.9}, ...]}`
        },
        {
          role: "user",
          content: `Extract all places from this text:\n\n${textToProcess}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  let places: any[] = [];
  try {
    const parsed = JSON.parse(content);
    places = Array.isArray(parsed.places) ? parsed.places : [];
  } catch (e) {
    console.error("Failed to parse OpenAI response:", e);
    return [];
  }

  return places.map((p: any) => ({
    name: p.name || "",
    category: "other" as PlaceCategory, // Category will be determined by Google Places API during validation
    confidence: Math.min(1, Math.max(0.8, p.confidence || 0.9)),
    context: "Extracted via OpenAI",
  }));
}

/**
 * REMOVED: inferCategoryFromContext - Categories are now only determined by Google Places API
 * This function has been completely removed. All categories must come from Google Places API types.
 */

/**
 * Infer vibe using sentiment analysis (optional, can be slow)
 */
async function inferVibe(placeName: string, context: string): Promise<PlaceVibe | undefined> {
  if (!hf) return undefined;
  
  try {
    const vibeModel = "cardiffnlp/twitter-roberta-base-sentiment";
    const vibeLabels = ["romantic", "party", "chill", "cultural"];
    
    // Create a short context about the place
    const vibeText = `${placeName}. ${context.substring(0, 300)}`;
    
    // Use zero-shot classification for vibe
    const vibeResult = await hf.zeroShotClassification({
      model: "facebook/bart-large-mnli", // Use BART for zero-shot, sentiment model is for different task
      inputs: vibeText,
      parameters: {
        candidate_labels: vibeLabels,
      },
    });
    
    // Handle both array and object response formats
    let result: any;
    if (Array.isArray(vibeResult)) {
      result = vibeResult[0];
    } else {
      result = vibeResult;
    }
    
    if (result && result.labels && result.scores && Array.isArray(result.labels) && Array.isArray(result.scores)) {
      const maxIndex = result.scores.indexOf(Math.max(...result.scores));
      const vibeLabel = result.labels[maxIndex];
      const score = result.scores[maxIndex];
      
      // Only return vibe if confidence is high enough
      if (score > 0.5 && vibeLabel) {
        return vibeLabel as PlaceVibe;
      }
    }
  } catch (error) {
    // Vibe inference is optional, fail silently
    console.debug(`Vibe inference failed for ${placeName}:`, error);
  }
  
  return undefined;
}

/**
 * Fallback extraction using regex patterns
 */
function extractPlacesFallback(text: string): ExtractedPlace[] {
  const places: ExtractedPlace[] = [];
  const found = new Set<string>();

  // Enhanced patterns for place extraction
  const patterns = [
    // "Visit X", "Go to X", "See X"
    /(?:visit|go to|see|check out|try|eat at|stay at|explore|tour)\s+([A-Z][a-zA-Z\s]{2,}?)(?:[.,!?]|$)/gi,
    // "X Temple", "X Market", etc.
    /([A-Z][a-zA-Z\s]{2,})(?:\s+(?:Temple|Market|Mall|Hotel|Restaurant|Cafe|Bar|Beach|Park|Museum|Palace|Shrine|Tower|Bridge|Square|Plaza|Garden|Zoo|Aquarium))/gi,
    // Capitalized place names (common pattern)
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
  ];

  patterns.forEach((pattern) => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const name = match[1]?.trim();
      if (
        name &&
        name.length > 2 &&
        name.length < 50 &&
        !found.has(name.toLowerCase()) &&
        !isCommonWord(name)
      ) {
        found.add(name.toLowerCase());
        places.push({
          name,
          category: "other" as PlaceCategory,
          confidence: 0.6,
          context: "Extracted from text pattern",
        });
      }
    }
  });

  return places.slice(0, 20); // Limit to 20 places
}

/**
 * Check if a word is a common word (not a place name)
 */
function isCommonWord(word: string): boolean {
  const commonWords = [
    "the",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "from",
    "by",
    "about",
    "into",
    "through",
    "during",
    "including",
    "Bangkok",
    "Thailand",
    "City",
    "Street",
    "Avenue",
    "Road",
  ];

  return commonWords.some((w) => word.toLowerCase().includes(w.toLowerCase()));
}

