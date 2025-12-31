import type { PlaceCategory } from "@/types";
import { 
  Utensils, 
  Landmark, 
  Moon, 
  Trees, 
  ShoppingBag, 
  Theater, 
  Sparkles, 
  Church, 
  Building2, 
  Mountain, 
  Waves,
  MapPin,
  type LucideIcon
} from "lucide-react";

/**
 * Map Google Places category string to our PlaceCategory enum
 * Handles both Google Places API types (like "tourist_attraction") and formatted strings (like "Tourist Attraction")
 */
export function mapGoogleCategoryToPlaceCategory(googleCategory: string | undefined | null): PlaceCategory {
  if (!googleCategory) return "other";
  
  // Normalize: convert to lowercase and replace spaces/underscores
  const lower = googleCategory.toLowerCase().replace(/\s+/g, '_').replace(/_+/g, '_');
  
  // Food categories
  if (lower.includes('restaurant') || lower.includes('food') || lower.includes('dining') || 
      lower.includes('cafe') || lower.includes('coffee') || lower.includes('bakery') ||
      lower.includes('bistro') || lower.includes('eatery') || lower.includes('meal') ||
      lower.includes('cuisine') || lower.includes('eating')) {
    return "food";
  }
  
  // Attractions
  if (lower.includes('attraction') || lower.includes('tourist') || lower.includes('landmark') ||
      lower.includes('monument') || lower.includes('tower') || lower.includes('viewpoint') ||
      lower.includes('sightseeing') || lower.includes('site')) {
    return "attraction";
  }
  
  // Nightlife
  if (lower.includes('nightclub') || lower.includes('bar') || lower.includes('pub') ||
      lower.includes('lounge') || lower.includes('nightlife')) {
    return "nightlife";
  }
  
  // Nature
  if (lower.includes('park') || lower.includes('garden') || lower.includes('nature') ||
      lower.includes('forest') || lower.includes('trail') || lower.includes('hiking')) {
    return "nature";
  }
  
  // Shopping
  if (lower.includes('shop') || lower.includes('store') || lower.includes('mall') ||
      lower.includes('market') || lower.includes('boutique') || lower.includes('shopping')) {
    return "shopping";
  }
  
  // Entertainment
  if (lower.includes('theater') || lower.includes('cinema') || lower.includes('movie') ||
      lower.includes('entertainment') || lower.includes('stadium') || lower.includes('arena') ||
      lower.includes('amusement') || lower.includes('theme')) {
    return "entertainment";
  }
  
  // Wellness
  if (lower.includes('spa') || lower.includes('wellness') || lower.includes('gym') ||
      lower.includes('fitness') || lower.includes('yoga') || lower.includes('health')) {
    return "wellness";
  }
  
  // Religious
  if (lower.includes('temple') || lower.includes('church') || lower.includes('mosque') ||
      lower.includes('synagogue') || lower.includes('shrine') || lower.includes('cathedral') ||
      lower.includes('religious') || lower.includes('worship')) {
    return "religious";
  }
  
  // Museum
  if (lower.includes('museum') || lower.includes('gallery') || lower.includes('exhibition') ||
      lower.includes('art')) {
    return "museum";
  }
  
  // Adventure
  if (lower.includes('adventure') || lower.includes('hiking') || lower.includes('mountain') ||
      lower.includes('climbing') || lower.includes('outdoor') || lower.includes('sport')) {
    return "adventure";
  }
  
  // Beach
  if (lower.includes('beach') || lower.includes('waterfront') || lower.includes('marina') ||
      lower.includes('harbor') || lower.includes('coast')) {
    return "beach";
  }
  
  return "other";
}

/**
 * Get Lucide icon component for a place category
 * Can accept either PlaceCategory enum or Google Places category string
 */
export function getCategoryIcon(category: PlaceCategory | string | undefined | null): LucideIcon {
  // If it's a string (Google category), map it first
  if (typeof category === 'string' && category !== 'food' && category !== 'attraction' && 
      category !== 'nightlife' && category !== 'nature' && category !== 'shopping' &&
      category !== 'entertainment' && category !== 'wellness' && category !== 'religious' &&
      category !== 'museum' && category !== 'adventure' && category !== 'beach' && category !== 'other') {
    category = mapGoogleCategoryToPlaceCategory(category);
  }
  
  if (!category) category = "other";
  const placeCategory = category as PlaceCategory;
  const icons: Record<PlaceCategory, LucideIcon> = {
    food: Utensils,
    attraction: Landmark,
    nightlife: Moon,
    nature: Trees,
    shopping: ShoppingBag,
    entertainment: Theater,
    wellness: Sparkles,
    religious: Church,
    museum: Building2,
    adventure: Mountain,
    beach: Waves,
    other: MapPin,
  };
  return icons[placeCategory] || MapPin;
}

/**
 * Get display label for a place category
 * Can accept either PlaceCategory enum or Google Places category string
 */
export function getCategoryLabel(category: PlaceCategory | string | undefined | null): string {
  // If it's a string (Google category), map it first
  if (typeof category === 'string' && category !== 'food' && category !== 'attraction' && 
      category !== 'nightlife' && category !== 'nature' && category !== 'shopping' &&
      category !== 'entertainment' && category !== 'wellness' && category !== 'religious' &&
      category !== 'museum' && category !== 'adventure' && category !== 'beach' && category !== 'other') {
    category = mapGoogleCategoryToPlaceCategory(category);
  }
  
  if (!category) category = "other";
  const placeCategory = category as PlaceCategory;
  const labels: Record<PlaceCategory, string> = {
    food: "Food",
    attraction: "Attraction",
    nightlife: "Nightlife",
    nature: "Nature",
    shopping: "Shopping",
    entertainment: "Entertainment",
    wellness: "Wellness",
    religious: "Religious",
    museum: "Museum",
    adventure: "Adventure",
    beach: "Beach",
    other: "Other",
  };
  return labels[placeCategory] || "Other";
}

/**
 * Get color class for a place category badge
 */
export function getCategoryColor(category: PlaceCategory): string {
  const colors: Record<PlaceCategory, string> = {
    food: "bg-orange-100 text-orange-800 border-orange-200",
    attraction: "bg-blue-100 text-blue-800 border-blue-200",
    nightlife: "bg-purple-100 text-purple-800 border-purple-200",
    nature: "bg-green-100 text-green-800 border-green-200",
    shopping: "bg-pink-100 text-pink-800 border-pink-200",
    entertainment: "bg-red-100 text-red-800 border-red-200",
    wellness: "bg-teal-100 text-teal-800 border-teal-200",
    religious: "bg-amber-100 text-amber-800 border-amber-200",
    museum: "bg-indigo-100 text-indigo-800 border-indigo-200",
    adventure: "bg-lime-100 text-lime-800 border-lime-200",
    beach: "bg-cyan-100 text-cyan-800 border-cyan-200",
    other: "bg-gray-100 text-gray-800 border-green-200",
  };
  return colors[category] || "bg-gray-100 text-gray-800 border-green-200";
}

