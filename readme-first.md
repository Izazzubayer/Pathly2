# PRD — AI Route-Aware Travel Planning Platform


## Context, User Journey, Outcome, Example Scenarios - 

Here’s a **single, cohesive ~500-word paragraph** you can use verbatim for your case study, portfolio, or README. It explains **context, user journey, and outcome**, and it **weaves in your real Thailand example naturally** without sounding messy or over-personal.

---

This product was born from a real, repeated frustration in modern travel planning: inspiration lives in social media, but planning lives in scattered tools that don’t talk to each other. In a typical scenario, my girlfriend and I planned a trip from Bangladesh to Thailand. We booked flights and a hotel in Bangkok (Four Wings Hotel), and then the real chaos began. She started browsing Instagram, watching Bangkok reels, saving food spots, attractions, cafés, and activities, and sending those videos to me. I would watch them later, pause the video, try to extract the place names, and dump everything into my Notes app. From there, I’d search each place manually on Google Maps, save them, and then attempt to mentally optimize the trip by using our hotel as an anchor and figuring out how to go from Point A to Point Z without constantly detouring or backtracking. If we wanted to go to ICONSIAM on New Year’s Eve, I’d try to find everything worth doing along that route—cafés, food spots, viewpoints, or bars—so the day felt efficient instead of exhausting. Finally, I’d manually assign places to days, constantly second-guessing whether the plan made sense. This process was time-consuming, mentally draining, and surprisingly easy to get wrong.

The product rethinks this journey by starting where planning actually begins: inspiration. Instead of asking users to fill forms or build itineraries upfront, the app allows them to paste Instagram reels, YouTube videos, Google Maps links, or raw notes into a single input. The system then uses AI to extract places, food spots, activities, and contextual “vibes” from that unstructured input. Crucially, AI never acts autonomously; every extracted item is presented to the user as an editable suggestion that can be confirmed, modified, or removed. Early in the flow, the user sets a hotel as a fixed anchor, because real travel revolves around where you stay. The app then allows users to define a route—for example, from their hotel to ICONSIAM—and intelligently suggests places that fall naturally along that path, clearly showing detour costs instead of simply labeling things as “nearby.” This path-based approach mirrors how people actually move through cities and eliminates unnecessary back-and-forth. Once routes are established, the system proposes day-based groupings, which the user can freely rearrange, keeping control over the final plan.

The outcome is a calm, human-centered planning experience that replaces mental juggling with visual clarity. Users no longer need Notes, Google Maps, and guesswork to work in parallel. Instead, scattered inspiration is transformed into a coherent, route-optimized itinerary that respects real-world movement, personal context, and human decision-making. The product demonstrates how AI can meaningfully support complex planning without overwhelming users—by suggesting, not deciding—and turns a frustrating, fragmented workflow into a confident and enjoyable part of the travel experience.


## 1. Product Vision

### One-liner
A calm, AI-powered travel planning platform that transforms **social inspiration and scattered notes** into **route-optimized, human-approved itineraries**, anchored around where users actually stay.

### Core Belief
People don’t plan trips top-down.
They collect inspiration first — messily — and organize later.

This product respects that behavior.

---

## 2. Primary User Problem

### Current Reality
Users planning a trip today:
- Discover places on Instagram, YouTube, TikTok
- Save or forward links
- Manually extract names into Notes
- Search each place on Google Maps
- Mentally optimize routes
- Assign places to days manually

This results in:
- Cognitive overload
- Inefficient travel routes
- Repeated backtracking
- Time wasted planning instead of enjoying the trip

### What This Product Solves
- Captures inspiration where it actually happens
- Converts chaos into structure
- Optimizes **movement**, not just lists
- Keeps humans in control at every step

---

## 3. Target Users

- Couples planning leisure trips
- Friends traveling together
- First-time visitors to a city
- Users overwhelmed by traditional planners
- Design- and tech-literate users

---

## 4. Product Principles (Non-Negotiable)

1. **Inspiration first**
2. **Hotel as anchor**
3. **AI suggests, humans decide**
4. **Paths > proximity**
5. **Calm over completeness**
6. **Editability over magic**

If a feature violates any of these, it does not ship.

---

## 5. Design System & UI Constraints

### UI Stack
- Next.js (App Router)
- Tailwind CSS
- **shadcn/ui only**
- **Zinc color palette only**
- No bright colors
- No heavy gradients
- No dashboards

### Visual Tone
- Neutral
- Spacious
- Typography-driven
- Low cognitive load
- “Apple Notes meets Apple Maps”

---

## 6. End-to-End User Journey

Start
→ Create Trip
→ Enter Destination
→ Set Hotel (Anchor)
→ Select Traveler Context
→ Add Inspiration
→ AI Extraction
→ User Confirmation
→ Route Planning
→ In-Between Optimization
→ Day Grouping
→ Final Itinerary
→ In-Trip Adjustments


---

## 7. Functional Requirements

---

### 7.1 Trip Creation

**Required Inputs**
- Destination city
- Hotel (searchable, map-based)

**Behavior**
- Hotel becomes the fixed anchor for all routes
- Map centers on hotel
- All distance calculations reference hotel

**Constraints**
- Single city
- Single hotel per trip

---

### 7.2 Traveler Context

**Inputs**
- Traveler type:
  - Couple
  - Friends
  - Family

**Optional Tags**
- Romantic
- Food-first
- Nightlife
- Chill
- Culture

**Purpose**
- Guides AI tone and prioritization
- Never enforces hard rules

---

### 7.3 Inspiration Intake (Core Feature)

#### Accepted Inputs
- Instagram reel/post URLs
- YouTube video URLs
- Google Maps place URLs
- Plain text notes
- Uploaded text files (pdf, txt, md)

#### UX Requirements
- One unified input field
- Supports batch input
- No categorization at input time
- User can add inspiration at any time

#### Explicit Non-Goals
- No browser extension
- No image OCR
- No video frame analysis (text metadata only)

---

### 7.4 AI Extraction & Interpretation

#### AI Responsibilities
From provided inputs, the system must:
- Extract place names
- Extract food spots
- Extract activities
- Infer category (food, attraction, nightlife, nature)
- Infer vibe (romantic, party, chill)
- Associate approximate geographic context

#### Models (Recommended)
- Named Entity Recognition:
  - `dslim/bert-base-NER`
- Classification:
  - `facebook/bart-large-mnli`
- Sentiment / vibe:
  - `cardiffnlp/twitter-roberta-base-sentiment`

#### Confidence Handling
- Every extracted item must have a confidence score
- Low-confidence items must be flagged

---

### 7.5 Human-in-the-Loop Confirmation

**Mandatory UX Pattern**
AI output is never final by default.

Each extracted item must be:
- Displayed as a card or chip
- Editable (name, category)
- Confirmable
- Removable

Example copy:
> “We think this place is ICONSIAM, Bangkok. Confirm?”

---

### 7.6 Place Validation & Geocoding

**Requirements**
- Use Google Places API for validation
- Fallback to OpenStreetMap if needed
- Resolve:
  - Coordinates
  - Area
  - Category

**Rules**
- Do not auto-assign exact locations without confirmation
- Surface ambiguity clearly

---

## 8. Route-Aware Planning (Core Differentiator)

### Key Concepts
- **Anchor:** Hotel
- **Route:** Start → End
- **Corridor:** Acceptable deviation zone

### User Flow
1. User selects:
   - Start location (default: hotel)
   - End location (e.g., ICONSIAM)
2. System plots base route
3. System identifies extracted places along the route
4. Places are ordered sequentially

### UX Requirements
- Show detour cost:
  - +0 min
  - +X min
- Allow user to:
  - Accept
  - Skip
  - Save for later

### Explicit Non-Goals
- Traffic optimization
- Public transit routing
- Multi-route comparisons

---

## 9. In-Between Intelligence

Instead of “nearby places”, the system must suggest:
- Places **on the way**
- Places that fit naturally in sequence

This is the product’s **primary USP**.

---

## 10. Day-Based Organization

### Behavior
- System suggests day groupings based on:
  - Route density
  - Distance
  - Vibe balance
- User can:
  - Drag & reorder
  - Move items between days
  - Remove items

### Constraints
- No hour-by-hour scheduling
- No calendar integration

---

## 11. In-Trip Usage

While traveling, the user can:
- View today’s route
- Skip items
- Ask for nearby alternatives
- Re-optimize remaining route

Changes are local and reversible.

---

## 12. Technical Architecture

### Frontend
- Next.js (App Router)
- TypeScript
- shadcn/ui
- Tailwind (Zinc palette)
- Map rendering (Mapbox or Google Maps)
- Drag-and-drop interactions

### Backend
- Server Actions / API Routes
- External API integrations
- AI inference orchestration
- Caching of AI responses

### Data Storage
- Persistent storage for trips
- No authentication required initially
- Designed to support auth later

---

## 13. Reliability & Ethics

- Be transparent about AI uncertainty
- Never fabricate places
- Never override user decisions
- Avoid dark patterns
- No data resale

## THIS IS TO BECOME AN ENTERPRISE LEVEL WEB APP BACKED BY Y COMBINATOR. ##