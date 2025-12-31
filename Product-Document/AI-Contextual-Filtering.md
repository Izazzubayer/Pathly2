# AI Contextual Filtering System

## Overview

The AI Contextual Filtering system ensures that place recommendations are **relevant and appropriate** for the traveler's specific trip context, preferences, and traveler type. This prevents irrelevant suggestions like schools for romantic couples or nightclubs for family trips.

## Problem Statement

Google Places API returns geographically nearby places, but these may not be contextually appropriate:
- A **romantic couple's trip** shouldn't recommend secondary schools or universities
- A **family trip** shouldn't suggest bars or nightclubs
- A **relaxation-focused trip** shouldn't include high-energy party venues
- A **food-first trip** should prioritize restaurants and cafes over generic attractions

## Solution

After fetching nearby places from Google Places API, we pass them through an **AI filter** that evaluates each place against the trip context and removes irrelevant ones.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Days Page (Frontend)                     │
│  1. Fetch nearby/along-route places from Google Places API  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              AI Contextual Filter API                        │
│  /api/places/filter-contextual                              │
│                                                              │
│  Input:                                                      │
│  • places: Array of Place objects                           │
│  • tripContext: {                                           │
│      travelerType: "couple" | "solo" | "family" | ...      │
│      tags: ["romantic", "food-first", ...]                 │
│      destination: "Bangkok, Thailand"                       │
│    }                                                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Gemini AI (2.0 Flash)                    │
│  • Evaluates each place against trip context                │
│  • Returns indices of relevant places                        │
│  • Filters out: schools, irrelevant venues, boring places   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Filtered Recommendations                        │
│  Only contextually relevant places shown to user            │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoint

### `POST /api/places/filter-contextual`

**Request Body:**
```json
{
  "places": [
    {
      "id": "place_123",
      "name": "Nokshi Polli Restaurant",
      "category": "Restaurant",
      "types": ["restaurant", "food"],
      "address": "123 Main St"
    },
    {
      "id": "place_456",
      "name": "Yousufganj School and College",
      "category": "Secondary School",
      "types": ["secondary_school", "school"],
      "address": "456 School Rd"
    }
  ],
  "tripContext": {
    "travelerType": "couple",
    "tags": ["romantic", "food-first"],
    "destination": "Dhaka, Bangladesh"
  }
}
```

**Response:**
```json
{
  "filteredPlaces": [
    {
      "id": "place_123",
      "name": "Nokshi Polli Restaurant",
      "category": "Restaurant",
      "types": ["restaurant", "food"],
      "address": "123 Main St"
    }
    // School filtered out as irrelevant for romantic couple trip
  ]
}
```

## AI Prompt Strategy

The AI is given:
1. **Trip Context**: Traveler type, preferences, destination
2. **Places List**: Numbered list with names and categories
3. **Clear Instructions**: Filter OUT irrelevant places
4. **Examples**: What to exclude (schools for couples, nightclubs for families, etc.)

The AI returns **only the numbers** of relevant places, making parsing simple and reliable.

## Filtering Rules

The AI filters out:
- **Mismatched traveler types**: Schools/universities for couples, nightclubs for families
- **Contradictory preferences**: Party venues for relaxation trips, fast food for food-first trips
- **Generic/boring places**: Parking lots, gas stations, generic shops
- **Contextually inappropriate**: Places that don't add value to the specific trip experience

## Integration Points

### 1. Days Page (`app/trips/[id]/days/page.tsx`)

```typescript
// Helper function to filter places
const filterPlacesByContext = async (places: Place[]) => {
  const response = await fetch('/api/places/filter-contextual', {
    method: 'POST',
    body: JSON.stringify({
      places: places.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        types: p.types,
      })),
      tripContext: {
        travelerType: trip.travelerContext?.type,
        tags: trip.travelerContext?.tags,
        destination: trip.destination,
      },
    }),
  });
  
  const data = await response.json();
  return data.filteredPlaces || places;
};

// Applied after fetching recommendations
const rawPlaces = await fetchNearbyPlaces();
const filteredPlaces = await filterPlacesByContext(rawPlaces);
setNearbyRecommendations(filteredPlaces);
```

### 2. Nearby Search Flow

```
User selects Day 2
  ↓
Fetch nearby places (Google Places API)
  ↓
Filter by trip context (AI)
  ↓
Display relevant recommendations
```

### 3. Along-Route Search Flow

```
User sets end destination
  ↓
Fetch places along route (Google Directions + Places API)
  ↓
Filter by trip context (AI)
  ↓
Display relevant recommendations
```

## Performance Considerations

1. **Fail-Safe Design**: If AI filtering fails, return all places (better to show too many than none)
2. **Async Processing**: Filtering happens asynchronously, doesn't block UI
3. **Caching**: Consider caching filtered results per day to avoid redundant API calls
4. **Temperature**: Set to 0.3 for consistent, conservative filtering
5. **Token Limit**: Max 500 output tokens (sufficient for returning indices)

## Example Scenarios

### Scenario 1: Romantic Couple Trip
**Input**: 10 nearby places including restaurants, schools, parks
**Context**: Couple trip, romantic, food-first
**Output**: Restaurants, romantic cafes, scenic parks (schools filtered out)

### Scenario 2: Family Trip
**Input**: 15 places including museums, bars, kid-friendly attractions
**Context**: Family trip, kids, educational
**Output**: Museums, parks, kid attractions (bars/nightclubs filtered out)

### Scenario 3: Solo Adventure Trip
**Input**: 20 places including hiking trails, shopping malls, adventure sports
**Context**: Solo trip, adventure, nature
**Output**: Hiking trails, adventure activities, scenic spots (malls filtered out)

## Logging & Debugging

The system logs:
- 📍 Raw places fetched from Google
- 🤖 AI filtering response
- 🚫 Places filtered out (with reasons)
- ✅ Final count of relevant places

**Example Console Output:**
```
📍 Nearby recommendations (circular route): 8 places
🤖 AI filtering response: [1, 3, 4, 7]
🚫 Filtered out 4 irrelevant places: ["Yousufganj School", "Generic Shop", ...]
✅ Kept 4 contextually relevant places out of 8
```

## Future Enhancements

1. **Learning System**: Track which filtered places users manually add (indicates false negatives)
2. **Confidence Scores**: AI returns relevance scores, not just binary filter
3. **User Feedback**: Allow users to report irrelevant recommendations
4. **Category Weights**: Prioritize certain categories based on preferences (e.g., 70% food for food-first trips)
5. **Time-Based Filtering**: Filter based on time of day (breakfast spots in morning, bars at night)
6. **Budget Filtering**: Consider price levels from Google Places API

## Tech Stack

- **AI Model**: Google Gemini 2.0 Flash (fast, cost-effective)
- **API**: Next.js API Route (`/api/places/filter-contextual`)
- **Integration**: React useEffect hook in Days page
- **Fallback**: Returns all places if AI fails (graceful degradation)

## Success Metrics

- **Relevance Rate**: % of recommendations that are contextually appropriate
- **User Engagement**: % of filtered recommendations that users actually add to their trip
- **Filter Accuracy**: False positives (good places filtered out) vs. false negatives (bad places kept)
- **Performance**: Average filtering time per batch of places

## Conclusion

The AI Contextual Filtering system ensures that Pathly's recommendations are not just geographically convenient, but also **meaningfully relevant** to each traveler's unique trip context. This creates a more personalized, intelligent travel planning experience.

