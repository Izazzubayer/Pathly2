# 🤖 AI-Powered Recommendations Setup

## Overview
We've replaced the basic Google Places suggestions with **enterprise-grade AI-powered recommendations** that scrape the web (Reddit, Instagram, travel blogs) and use Google Gemini AI to analyze and extract the best places.

## What Changed

### Before (Old System)
- ❌ Basic Google Places API with generic search types
- ❌ No social proof or trending data
- ❌ Returned random nearby places regardless of quality
- ❌ Suggested sketchy locations like "Racha Enterprise Building"

### After (New AI System)
- ✅ **Web scraping** via Serper API (Google, Reddit, blogs)
- ✅ **AI analysis** via Google Gemini to extract trending places
- ✅ **Social proof** from real traveler discussions
- ✅ **Context-aware** based on traveler type + preferences
- ✅ **Quality filtering** - only highly-rated, trending places
- ✅ **Reasoning** - AI explains why each place is recommended

## Architecture

```
User Context (solo + nightlife)
        ↓
1. Build search queries ("best nightlife Bangkok Reddit 2024")
        ↓
2. Serper API scrapes web (Google, Reddit, blogs)
        ↓
3. Gemini AI analyzes results & extracts top places
        ↓
4. Validate with Google Places API (coordinates, photos, ratings)
        ↓
5. Calculate distance/duration from hotel
        ↓
6. Return 6 AI-vetted, trending places with reasoning
```

## API Routes

### 1. `/api/ai-recommendations` (Core AI Engine)
**Purpose:** Scrapes web and uses AI to extract recommendations

**Input:**
```json
{
  "destination": "Bangkok",
  "travelerType": "solo",
  "preferences": ["nightlife", "food-first"]
}
```

**Output:**
```json
{
  "recommendations": [
    {
      "name": "Octave Rooftop Lounge & Bar",
      "reasoning": "Consistently mentioned on Reddit as the best rooftop bar for solo travelers...",
      "category": "nightlife",
      "estimatedRating": 4.6,
      "sources": ["reddit.com/r/Bangkok", "timeout.com"]
    }
  ],
  "searchQueries": ["best nightlife Bangkok 2024 Reddit"],
  "totalSources": 25
}
```

### 2. `/api/places/suggest-ai` (Validation & Enrichment)
**Purpose:** Validates AI recommendations with Google Places and adds distance/duration

**Input:**
```json
{
  "destination": "Bangkok",
  "travelerType": "solo",
  "preferences": ["nightlife"],
  "hotelCoordinates": { "lat": 13.7563, "lng": 100.5018 },
  "excludePlaceIds": []
}
```

**Output:**
```json
{
  "suggestions": [
    {
      "placeId": "ChIJ...",
      "name": "Octave Rooftop Lounge & Bar",
      "vicinity": "Sukhumvit Road, Bangkok",
      "rating": 4.6,
      "types": ["bar", "night_club"],
      "coordinates": { "lat": 13.7563, "lng": 100.5018 },
      "distance": 2300,
      "duration": 420,
      "aiReasoning": "Consistently mentioned on Reddit...",
      "sources": ["reddit.com/r/Bangkok"]
    }
  ],
  "aiPowered": true
}
```

## Frontend Changes

### Extract Page (`app/trips/[id]/extract/page.tsx`)
- Replaced old `handleSuggestPlaces` logic with AI-powered version
- Now calls `/api/places/suggest-ai` instead of `/api/places/suggest`
- Updated header: "AI-Powered Suggestions" with "🤖 Web + AI" badge
- Added AI reasoning display in suggestion cards

## Environment Variables Required

Add these to your `.env.local`:

```bash
# Google Gemini AI (FREE - 1500 requests/day)
GOOGLE_GEMINI_API_KEY=your_gemini_key_here

# Serper API (FREE - 2500 searches/month)
SERPER_API_KEY=your_serper_key_here

# Google Places API (already have)
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your_existing_key
```

## How to Get FREE API Keys

### 1. Google Gemini API
1. Go to: https://aistudio.google.com/app/apikey
2. Click "Get API Key" → "Create API Key"
3. Copy the key
4. **Free Tier:** 1500 requests/day (more than enough!)

### 2. Serper API
1. Go to: https://serper.dev/
2. Sign up with Google
3. Copy API key from dashboard
4. **Free Tier:** 2500 searches/month

## Example: Solo Traveler + Nightlife in Bangkok

**Old System Would Return:**
- ❌ Racha Enterprise Building (WTF?)
- ❌ Random office cafes
- ❌ Sketchy locations
- ❌ Generic tourist traps

**New AI System Returns:**
- ✅ Octave Rooftop Lounge & Bar (trending on Reddit)
- ✅ Levels Club & Lounge (Instagram hotspot)
- ✅ Sky Bar at Lebua (travel blog favorite)
- ✅ Khao San Road nightlife (backpacker hub)
- ✅ Soi Cowboy (nightlife district)
- ✅ Thonglor bars (local favorite)

**With AI Reasoning:**
> "Octave is consistently mentioned on Reddit r/Bangkok as the best rooftop bar for solo travelers, with stunning 360° views and a relaxed vibe perfect for meeting other travelers. Highly rated on TripAdvisor (4.6★) and featured in Timeout Bangkok's 2024 nightlife guide."

## Search Query Examples

Based on traveler context, the system builds intelligent queries:

- **Nightlife:** "best nightlife Bangkok 2024 Reddit", "top bars clubs Bangkok trending"
- **Food-first:** "best restaurants Bangkok 2024 must try", "Bangkok food guide Instagram trending"
- **Culture:** "best cultural attractions Bangkok 2024", "Bangkok hidden gems culture"
- **Nature:** "best nature spots Bangkok 2024", "Bangkok outdoor activities scenic"

## AI Filtering Rules

Gemini AI is instructed to:
1. ✅ Only include places explicitly mentioned by name
2. ✅ Prioritize places with multiple mentions
3. ✅ Filter out sketchy/dangerous locations
4. ✅ Exclude office buildings, random cafes
5. ✅ Match traveler type + preferences
6. ✅ Provide specific reasoning with sources

## Cost Analysis (100% FREE!)

| Service | Free Tier | Cost After Free |
|---------|-----------|-----------------|
| Gemini AI | 1500 req/day | $0.00035/req |
| Serper API | 2500 searches/month | $0.02/search |
| Google Places | $200 credit/month | $0.032/req |

**For typical usage (10 trips/day):**
- Gemini: 10 requests = FREE
- Serper: 30 searches = FREE
- Places: 60 validations = FREE

**You won't pay a cent unless you go viral!**

## Testing

To test the new system:
1. Create a trip to Bangkok
2. Set traveler type: Solo
3. Add preference: Nightlife
4. Go to Extract page
5. See AI-powered suggestions appear automatically
6. Each suggestion shows:
   - Place name (clickable to Google Maps)
   - Rating & category
   - Distance & travel time from hotel
   - AI reasoning (why it's recommended)
   - Sources (Reddit, blogs, etc.)

## Troubleshooting

### No suggestions appearing?
- Check `.env.local` has both API keys
- Check browser console for errors
- Verify API keys are valid

### Getting generic places?
- AI might not find specific mentions for obscure destinations
- System will fallback to Google Places with strict filters

### API rate limits?
- Gemini: 1500/day (very generous)
- Serper: 2500/month (should be enough)
- Upgrade if needed (still cheap!)

## Future Enhancements

Potential additions (not implemented yet):
- [ ] Reddit API integration (direct scraping)
- [ ] Instagram Graph API (requires business account)
- [ ] TripAdvisor Content API
- [ ] Caching layer to reduce API calls
- [ ] User feedback loop (upvote/downvote suggestions)

## Credits

Built with:
- Google Gemini AI (analysis)
- Serper API (web scraping)
- Google Places API (validation)
- Next.js 14 (framework)
- TypeScript (type safety)

---

**Result:** No more sketchy suggestions! Only fire recommendations backed by real travelers. 🔥

