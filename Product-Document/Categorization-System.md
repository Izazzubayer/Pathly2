# Pathly Categorization System

## Overview
Pathly uses **Google Places API** as the **single source of truth** for all place categorization. No manual categorization logic exists anywhere in the codebase.

## Architecture

### 1. Data Flow
```
Place Name → Google Places API → Place Types → inferCategory() → App Category
```

### 2. Key Components

#### A. Google Places API Integration
- **Text Search API**: Initial search to get `place_id`
- **Place Details API**: Fetch comprehensive place information including specific types
- **Why both?**: Text Search returns generic types (e.g., `["point_of_interest", "establishment"]`), while Place Details returns specific types (e.g., `["shopping_mall", "point_of_interest"]`)

#### B. Category Mapper (`inferCategory()`)
Location: `lib/places-api.ts`

Maps Google's types to Pathly's internal categories:
- `food` - Restaurants, cafes, bakeries
- `nightlife` - Bars, clubs, pubs
- `shopping` - Malls, stores, markets
- `attraction` - Tourist attractions, landmarks
- `museum` - Museums, art galleries
- `religious` - Churches, mosques, temples
- `nature` - Parks, gardens, zoos
- `beach` - Beaches, coastal areas
- `entertainment` - Theaters, amusement parks
- `wellness` - Spas, gyms, yoga studios
- `adventure` - Campgrounds, hiking areas
- `other` - Fallback for unrecognized types

## Implementation Points

### 1. Place Extraction (`app/trips/[id]/extract/page.tsx`)
- **AI Suggestions**: Fetch Place Details for accurate types
- **Manual Additions**: Fetch Place Details via `ManualPlaceInput`
- **File/Text Extraction**: Extract with `category: "other"`, validate with Google later

### 2. AI Suggestions API (`app/api/places/suggest-ai/route.ts`)
**CRITICAL FIX**: Always fetch Place Details after Text Search
```typescript
// Step 1: Text Search to get place_id
const textSearchResponse = await fetch(textSearchUrl);
const place = textSearchData.results[0];

// Step 2: Place Details for accurate types
const detailsUrl = `...place/details/json?place_id=${place.place_id}...`;
const detailsResponse = await fetch(detailsUrl);
const placeTypes = detailsData.result.types; // Use these types!
```

### 3. Manual Place Input (`components/manual-place-input.tsx`)
**CRITICAL FIX**: Always fetch Place Details
```typescript
if (place.placeId) {
  const response = await fetch(`/api/places/details?placeId=${place.placeId}`);
  types = response.types; // Use Place Details types
}
```

### 4. Days Page (`app/trips/[id]/days/page.tsx`)
When adding places from search:
```typescript
if (place.placeId) {
  const detailsResponse = await fetch(`/api/places/details?placeId=${place.placeId}`);
  category = inferCategory(detailsData.types);
}
```

### 5. Place Validation (`lib/places-api.ts`)
The `validatePlace()` function:
1. Uses Text Search to get `place_id`
2. Immediately calls Place Details API with that `place_id`
3. Returns accurate types for categorization

```typescript
// Text Search
const textSearchResponse = await fetch(textSearchUrl);
const placeId = textSearchData.results[0].place_id;

// Place Details (for accurate types)
const detailsResponse = await fetch(detailsUrl + placeId);
const types = detailsData.result.types;
const category = inferCategory(types);
```

## Why This Approach?

### Problems with Manual Categorization
❌ Inaccurate - Keywords don't capture real-world complexity  
❌ Inconsistent - Different extraction methods produce different results  
❌ Unmaintainable - Requires constant updates for edge cases  
❌ Language-dependent - Fails for non-English place names  

### Benefits of Google-Only Categorization
✅ **Accurate** - Google knows the real place type  
✅ **Consistent** - Single source of truth  
✅ **Maintainable** - Google updates their data  
✅ **Language-agnostic** - Works for all languages  
✅ **Comprehensive** - Covers all place types worldwide  

## Testing

### Test Case: Bashundhara City Shopping Complex
**Expected Behavior:**
1. User searches/adds "Bashundhara City Shopping Complex"
2. System fetches Place Details from Google
3. Google returns types: `["shopping_mall", "point_of_interest", "establishment"]`
4. `inferCategory()` maps `shopping_mall` → `shopping`
5. Place displays with category: **Shopping** ✅

**Not:** "Other", "Attraction", or any manual inference

## Common Issues & Fixes

### Issue 1: Places showing "Other" category
**Cause**: Using Text Search types instead of Place Details types  
**Fix**: Always fetch Place Details API for accurate types

### Issue 2: Inconsistent categories across pages
**Cause**: Different code paths using different APIs  
**Fix**: Standardize all paths to use Place Details API

### Issue 3: AI suggestions have wrong categories
**Cause**: AI recommendations API only used Text Search  
**Fix**: Added Place Details fetch in `validateWithGooglePlaces()`

## Code Locations

### Core Files
- `lib/places-api.ts` - `inferCategory()` mapper
- `app/api/places/details/route.ts` - Place Details API endpoint
- `app/api/places/suggest-ai/route.ts` - AI suggestions with Place Details
- `components/manual-place-input.tsx` - Manual input with Place Details
- `app/trips/[id]/extract/page.tsx` - Extraction page
- `app/trips/[id]/days/page.tsx` - Days page with search

### Removed Files
- ❌ No manual category detection in `lib/structured-extract.ts`
- ❌ No AI classification in `lib/huggingface-extract.ts`
- ❌ No keyword-based inference anywhere

## API Keys Required
- `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` - For all Google Places API calls
- Ensure both Text Search and Place Details APIs are enabled in Google Cloud Console

## Future Enhancements
1. Cache Place Details responses to reduce API calls
2. Add more Google types to `inferCategory()` as needed
3. Consider using Google's new Places API (New) for richer data
4. Add category confidence scores based on type priority

---

**Last Updated**: December 27, 2025  
**Status**: ✅ All manual categorization removed, Google-only system implemented

