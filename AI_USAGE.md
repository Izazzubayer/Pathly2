# AI Usage in Pathly

This document explains **where AI is needed** in Pathly and **which Hugging Face models** are used.

## Overview

Pathly uses AI to extract and understand travel-related information from unstructured text (Instagram reels, YouTube videos, notes, PDFs, etc.). The AI pipeline has multiple stages, each serving a specific purpose.

---

## Where AI is Needed

### 1. **Place Name Extraction (Named Entity Recognition)**

**Location:** `lib/huggingface-extract.ts` → `extractPlacesWithHF()`

**What it does:**
- Finds place names, locations, and geographic entities in text
- Identifies restaurants, attractions, bars, parks, etc. from unstructured input

**Why AI is needed:**
- Text can be messy: "Check out ICONSIAM, then go to Wat Pho temple"
- Place names can be in different languages or formats
- Context matters: "Bangkok" could be a city or a restaurant name

**Model Used:**
- **`dslim/bert-base-NER`** - Named Entity Recognition model
- **Method:** `hf.tokenClassification()`
- **Entity Types:** LOC (Location), GPE (Geopolitical Entity), MISC (Miscellaneous)

**Example:**
```typescript
const nerResponse = await hf.tokenClassification({
  model: "dslim/bert-base-NER",
  inputs: "Visit ICONSIAM and Wat Pho temple in Bangkok",
});
// Returns: [ICONSIAM (LOC), Wat Pho (LOC), Bangkok (GPE)]
```

---

### 2. **Place Category Classification**

**Location:** `lib/huggingface-extract.ts` → `extractPlacesWithHF()`

**What it does:**
- Categorizes extracted places into: `food`, `attraction`, `nightlife`, `nature`, `other`
- Understands context: "ICONSIAM" → shopping mall → `attraction`

**Why AI is needed:**
- Place names alone don't tell you the category
- Context matters: "Bar" in "Sky Bar" vs "Bar" in "Bar Restaurant"
- Zero-shot classification can infer categories without training

**Model Used:**
- **`facebook/bart-large-mnli`** - Zero-shot classification model
- **Method:** `hf.zeroShotClassification()`
- **Labels:** `["food", "attraction", "nightlife", "nature", "other"]`

**Example:**
```typescript
const categoryResult = await hf.zeroShotClassification({
  model: "facebook/bart-large-mnli",
  inputs: "ICONSIAM. A huge shopping mall in Bangkok with restaurants and views.",
  parameters: {
    candidate_labels: ["food", "attraction", "nightlife", "nature", "other"],
  },
});
// Returns: { labels: ["attraction", "food", ...], scores: [0.95, 0.3, ...] }
```

---

### 3. **Vibe Detection (Optional)**

**Location:** `lib/huggingface-extract.ts` → `inferVibe()`

**What it does:**
- Infers the "vibe" of a place: `romantic`, `party`, `chill`, `cultural`
- Helps users understand the atmosphere before visiting

**Why AI is needed:**
- Vibe is subjective and contextual
- Text descriptions like "romantic rooftop bar" need interpretation
- Sentiment and context analysis required

**Model Used:**
- **`facebook/bart-large-mnli`** - Zero-shot classification (reused for vibe)
- **Method:** `hf.zeroShotClassification()`
- **Labels:** `["romantic", "party", "chill", "cultural"]`

**Note:** This is optional and can be slow for many places. It's skipped if it fails.

---

## AI Pipeline Flow

```
User Input (text/files)
    ↓
1. Structured Extraction (regex-based, fast)
    ↓ (if < 3 places found)
2. OpenAI Extraction (if API key available, best quality)
    ↓ (if not available or fails)
3. Hugging Face NER (finds place names)
    ↓
4. Hugging Face Classification (categorizes places)
    ↓ (optional)
5. Vibe Detection (infers atmosphere)
    ↓
6. Fallback Regex (if all AI fails)
    ↓
Final: Combined & Deduplicated Places
```

---

## Models Summary

| Task | Model | Method | Purpose |
|------|-------|--------|---------|
| **NER** | `dslim/bert-base-NER` | `tokenClassification()` | Find place names in text |
| **Classification** | `facebook/bart-large-mnli` | `zeroShotClassification()` | Categorize places (food/attraction/etc.) |
| **Vibe** | `facebook/bart-large-mnli` | `zeroShotClassification()` | Infer atmosphere (romantic/party/etc.) |

---

## Code Location

**Main File:** `lib/huggingface-extract.ts`

**Key Functions:**
- `extractPlacesWithHF()` - Main extraction function
- `inferCategoryFromContext()` - Fallback keyword matching
- `inferVibe()` - Optional vibe detection
- `extractPlacesFallback()` - Regex fallback

**API Route:** `app/api/extract/route.ts` - Calls `extractPlacesWithHF()`

---

## How to Use the Library

### 1. Import the Library

```typescript
import { HfInference } from "@huggingface/inference";
```

### 2. Initialize Client

```typescript
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const hf = HF_API_KEY ? new HfInference(HF_API_KEY) : null;
```

### 3. Use Token Classification (NER)

```typescript
const result = await hf.tokenClassification({
  model: "dslim/bert-base-NER",
  inputs: "Visit ICONSIAM and Wat Pho temple",
});
// Returns array of entities with word, entity_group, score
```

### 4. Use Zero-Shot Classification

```typescript
const result = await hf.zeroShotClassification({
  model: "facebook/bart-large-mnli",
  inputs: "ICONSIAM is a huge shopping mall",
  parameters: {
    candidate_labels: ["food", "attraction", "nightlife"],
  },
});
// Returns array with labels and scores
```

---

## Fallback Strategy

The system has multiple fallbacks to ensure it always works:

1. **Structured Extraction** (regex) - Fast, works for lists
2. **OpenAI** (if available) - Best quality, understands context
3. **Hugging Face NER** - Finds place names
4. **Hugging Face Classification** - Categorizes places
5. **Regex Fallback** - Basic pattern matching

**Result:** Even without API keys, the system still works (just less accurately).

---

## Performance Considerations

- **NER:** Fast, processes ~5000 chars at a time
- **Classification:** Slower, called per place (batched to avoid rate limits)
- **Vibe Detection:** Optional, can be skipped if slow
- **Rate Limits:** Hugging Face free tier: 1000 requests/day

---

## Environment Variables

```bash
# Required for AI extraction (optional, has fallbacks)
HUGGINGFACE_API_KEY=your_token_here

# Optional, better quality extraction
OPENAI_API_KEY=your_token_here
```

---

## Testing

To test AI extraction:

1. Add inspiration text with place names
2. Upload a PDF or paste text
3. Check console logs for:
   - `✅ Structured extraction found: X places`
   - `Found X location entities from NER`
   - `✅ Combined extraction: X total places`

---

## Future Improvements

- [ ] Batch classification calls for better performance
- [ ] Cache classification results
- [ ] Use sentiment model for vibe detection
- [ ] Add multi-language support
- [ ] Fine-tune models on travel data

