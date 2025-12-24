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
 * Get Lucide icon component for a place category
 */
export function getCategoryIcon(category: PlaceCategory): LucideIcon {
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
  return icons[category] || MapPin;
}

/**
 * Get display label for a place category
 */
export function getCategoryLabel(category: PlaceCategory): string {
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
  return labels[category] || "Other";
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
    other: "bg-gray-100 text-gray-800 border-gray-200",
  };
  return colors[category] || "bg-gray-100 text-gray-800 border-gray-200";
}

