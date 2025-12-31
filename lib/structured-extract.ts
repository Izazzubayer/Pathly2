import type { ExtractedPlace, PlaceCategory } from "@/types";

/**
 * Extract places from structured lists with context-aware categorization
 * This handles PDFs with section headers and bullet lists
 */
export function extractPlacesFromStructuredText(text: string): ExtractedPlace[] {
  const places: ExtractedPlace[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let currentSection = "";
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    // Detect section headers (for context only, not for categorization)
    if (lowerLine.includes("bar") || lowerLine.includes("club") || lowerLine.includes("nightlife") ||
        lowerLine.includes("food") || lowerLine.includes("restaurant") || lowerLine.includes("eat") || 
        lowerLine.includes("seafood") || lowerLine.includes("cafe") ||
        lowerLine.includes("view") || lowerLine.includes("visit") || lowerLine.includes("museum") || 
        lowerLine.includes("attraction") || lowerLine.includes("temple") ||
        lowerLine.includes("park") || lowerLine.includes("nature") || lowerLine.includes("beach")) {
      currentSection = line;
      continue;
    }
    
    // Extract place names from list items
    // Patterns: "- Place Name", "* Place Name", "1. Place Name", "• Place Name"
    const listPattern = /^[\s]*[-*•◦▪▫]\s*(.+?)(?:\s*@\w+)?(?:\s*–|—|-)?\s*$/i;
    const numberedPattern = /^\s*\d+[.)]\s*(.+?)(?:\s*@\w+)?(?:\s*–|—|-)?\s*$/i;
    const directPattern = /^([A-Z][a-zA-Z\s]{2,}?)(?:\s+–|—|-|@|\d|\.|,|$)/;
    
    let placeName = "";
    
    // Try list item patterns first
    const listMatch = line.match(listPattern);
    if (listMatch) {
      placeName = listMatch[1].trim();
    } else {
      const numberedMatch = line.match(numberedPattern);
      if (numberedMatch) {
        placeName = numberedMatch[1].trim();
      } else {
        // Try direct pattern for capitalized names
        const directMatch = line.match(directPattern);
        if (directMatch) {
          placeName = directMatch[1].trim();
        }
      }
    }
    
    // Clean up place name
    if (placeName) {
      // Remove emojis and special chars at the end
      placeName = placeName
        .replace(/[🦀🌶️🥢📍🎯]+\s*/g, '')
        .replace(/\s*@\w+/g, '') // Remove Instagram handles
        .replace(/\s*–.*$/, '') // Remove everything after em dash
        .replace(/\s*—.*$/, '') // Remove everything after en dash
        .trim();
      
      // Skip if too short or too long, or is a common word
      if (placeName.length >= 3 && placeName.length <= 100 && !isCommonWord(placeName)) {
        // Check if we already have this place
        const exists = places.some(p => p.name.toLowerCase() === placeName.toLowerCase());
        if (!exists) {
          places.push({
            name: placeName,
            category: "other", // Category will be determined by Google Places API during validation
            confidence: 0.85, // High confidence for structured lists
            context: currentSection || "Extracted from structured list",
          });
        }
      }
    }
  }
  
  return places;
}

function isCommonWord(word: string): boolean {
  const commonWords = [
    "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "from",
    "by", "about", "into", "through", "during", "including", "thailand", "bangkok",
    "city", "street", "avenue", "road", "all", "in", "sukhuvit", "khlong", "tan", "nuea",
    "river", "lawn", "carousel", "wheel", "shopping", "dinner", "riverside", "fireworks",
    "chao", "phraya", "road", "rd", "village", "japaness",
  ];
  
  return commonWords.some(w => word.toLowerCase() === w.toLowerCase() || 
                               word.toLowerCase().startsWith(w.toLowerCase() + " ") ||
                               word.toLowerCase().endsWith(" " + w.toLowerCase()));
}

