# 🗺️ Pathly - Complete User Flow Guide

## Overview
Pathly is a smart travel planning app that helps you create personalized trip itineraries. It uses AI to suggest places based on your preferences and automatically organizes them into days.

---

## 📱 Complete User Journey

### **Step 1: Create a New Trip**

**Page:** Home Page (`/`)
- User clicks **"Create New Trip"** button
- Redirects to trip creation page

**Page:** New Trip Page (`/trips/new`)

**What the user does:**
1. **Enter Destination** - Type city/country (e.g., "Bangkok, Thailand")
2. **Select Dates** - Choose start and end date using date picker
3. **Choose Hotel** - Search and select hotel using Google Places autocomplete
4. **Select Traveler Type** - Choose one:
   - Solo
   - Couple
   - Friends
   - Family
5. **Select Preferences** - Choose tags (can select multiple):
   - Food-first
   - Nightlife
   - Culture
   - Nature
   - Shopping
   - Chill
   - Romantic
   - Adventure
   - etc.

**What happens:**
- Trip is saved to browser's localStorage
- User is redirected to Trip Dashboard

---

### **Step 2: Trip Dashboard (Overview)**

**Page:** Trip Dashboard (`/trips/[id]`)

**What the user sees:**
- Trip destination and dates
- Hotel information
- Traveler type and preferences
- 2-step progress indicator:
  - **Step 1: Add Places** (current step)
  - **Step 2: Organize Days** (next step)

**What the user can do:**
- Click **"Edit"** button to modify trip details (dates, hotel, preferences)
- Click **"Add Places"** button to go to Extract page
- View trip summary

---

### **Step 3: Add Places to Your Trip**

**Page:** Extract Page (`/trips/[id]/extract`)

**What the user sees:**
- List of places already added (if any)
- Search bar to manually add places
- **"Get AI-Powered Suggestions"** button (if no places added yet)

**Option A: Manual Search**
1. Type place name in search bar
2. Select from Google Places autocomplete results
3. Place is automatically added to trip

**Option B: AI-Powered Suggestions** (Recommended)
1. Click **"Get AI-Powered Suggestions"** button
2. AI searches the web (Reddit, Instagram, travel blogs) for trending places
3. AI analyzes results using Google Gemini
4. Shows 6 highly-rated, trending places perfect for your traveler type + preferences
5. Each suggestion shows:
   - Place name (clickable to Google Maps)
   - Rating and category
   - Distance & travel time from hotel (real Google Maps data)
   - AI reasoning (why it's recommended - click to expand)
6. Click **"Add to Trip"** on any suggestion
7. Click **"Add All"** to add all suggestions at once

**What happens:**
- Places are saved to trip
- User can continue adding more places manually
- User can refresh AI suggestions to get different places

**When ready:**
- Click **"Organize Days"** button to proceed

---

### **Step 4: Organize Places into Days**

**Page:** Days Page (`/trips/[id]/days`)

**What the user sees:**
- Horizontal scrollable strip of day cards
- Each day shows: Day number, date, number of places
- Selected day shows timeline view below

**What happens automatically:**
- App automatically distributes places across days based on:
  - Trip duration (number of days)
  - Number of places
  - Target: 5-8 places per day

**What the user can do:**

1. **Select a Day**
   - Click any day card to view/edit its places

2. **View Day Timeline**
   - See places in order (starting from hotel)
   - Each place shows name, category, icon

3. **Reorder Places**
   - Drag and drop places to reorder within a day
   - Visual timeline shows the route

4. **Add More Places**
   - Search for new places
   - Or select from saved places (places from other days or not yet assigned)

5. **Remove Places**
   - Click × button on any place to remove it from the day

6. **Add New Day**
   - Click **"Add Day"** button if needed

**When ready:**
- Click **"View Complete Itinerary"** button

---

### **Step 5: View Complete Itinerary**

**Page:** Itinerary Page (`/trips/[id]/itinerary`)

**What the user sees:**
- Map showing all places and hotel
- Complete day-by-day itinerary
- All places organized by day
- Visual timeline for each day

**What the user can do:**
- View full trip overview
- See all places on map
- Review the complete plan

---

### **Step 6: Use During Trip (In-Trip Navigation)**

**Page:** Today Page (`/trips/[id]/today`)

**Purpose:** Use this page while you're actually on your trip to track progress

**What the user sees:**
- Day selector (if multiple days)
- Progress bar showing completed/skipped/remaining places
- Today's route with all places in order
- Each place shows:
  - Number/status (completed ✓, skipped ✗, or next →)
  - Place name and category
  - Action buttons

**What the user can do:**

1. **Mark Places as Visited**
   - Click **"Visited"** button when you visit a place
   - Place gets checkmark and becomes grayed out

2. **Skip Places**
   - Click **"Skip"** button if you want to skip a place
   - Place gets X mark and is crossed out

3. **Find Alternatives**
   - Click search icon on any place
   - Shows nearby similar places you could visit instead
   - Click **"Add"** to add alternative to current day

4. **Re-optimize Route**
   - Click **"Re-optimize"** button
   - Recalculates best route order for remaining places
   - Only works if 2+ places remaining

**What happens:**
- Progress is saved to localStorage
- You can close and reopen - progress is remembered
- Progress is per-trip, per-day

---

## 🔄 Complete Flow Diagram

```
1. Home Page
   ↓
2. Create Trip (destination, dates, hotel, traveler type, preferences)
   ↓
3. Trip Dashboard (overview)
   ↓
4. Extract Page
   ├─→ Manual Search (add places one by one)
   └─→ AI Suggestions (get 6 trending places automatically)
   ↓
5. Days Page
   ├─→ View auto-organized days
   ├─→ Drag to reorder places
   ├─→ Add/remove places
   └─→ Add new days if needed
   ↓
6. Itinerary Page (optional - just to view)
   ↓
7. Today Page (use during trip)
   ├─→ Mark places as visited
   ├─→ Skip places
   ├─→ Find alternatives
   └─→ Re-optimize route
```

---

## 🎯 Key Features Explained

### **AI-Powered Suggestions**
- **How it works:**
  1. Takes your traveler type (solo/couple/family) + preferences (nightlife/food/etc.)
  2. Searches web: Reddit, Instagram, travel blogs for trending places
  3. AI (Google Gemini) analyzes results and extracts best places
  4. Validates with Google Places API (gets real coordinates, ratings)
  5. Calculates distance/time from your hotel using Google Maps
  6. Returns 6 highly-rated, trending places with reasoning

- **Why it's better:**
  - Not just "nearby" places - actual trending spots
  - Filtered by quality (no sketchy locations)
  - Matched to your preferences
  - Real social proof from travelers

### **Auto-Organization**
- **How it works:**
  - Calculates trip duration from dates
  - Distributes places evenly across days
  - Target: 5-8 places per day (optimal)
  - Creates day structure automatically

- **User can:**
  - Adjust by dragging places between days
  - Add/remove places
  - Reorder within days

### **In-Trip Navigation**
- **Purpose:** Track your actual trip progress
- **Features:**
  - Mark places as visited
  - Skip places you don't want to visit
  - Find alternatives if a place is closed/bad
  - Re-optimize route for remaining places

---

## 📋 Step-by-Step Example

**Example: Planning a 3-day trip to Bangkok**

1. **Create Trip**
   - Destination: Bangkok, Thailand
   - Dates: Jan 4-6, 2025
   - Hotel: The Four Wings Hotel Bangkok
   - Traveler: Solo
   - Preferences: Nightlife, Chill

2. **Get AI Suggestions**
   - Click "Get AI-Powered Suggestions"
   - AI finds: Octave Rooftop Bar, Sky Bar, Khao San Road, etc.
   - Add 6 places to trip

3. **Organize Days**
   - App auto-creates 3 days
   - Places distributed: Day 1 (2 places), Day 2 (2 places), Day 3 (2 places)
   - User drags to reorder, adds 2 more places manually
   - Final: Day 1 (3 places), Day 2 (3 places), Day 3 (2 places)

4. **During Trip (Day 1)**
   - Open Today page
   - See 3 places for today
   - Visit first place → Click "Visited" ✓
   - Skip second place (too crowded) → Click "Skip" ✗
   - Visit third place → Click "Visited" ✓
   - Progress: 2/3 completed

5. **Next Day**
   - Switch to Day 2 in Today page
   - See 3 places for Day 2
   - Continue tracking...

---

## 🎨 Design Philosophy

**Compact & Efficient:**
- No unnecessary scrolling
- Information dense but readable
- Quick actions (icon buttons where appropriate)

**Clear Visual Hierarchy:**
- Progress indicators show where you are
- Color coding (primary for active, muted for completed)
- Timeline view shows route flow

**Smart Defaults:**
- Auto-organizes days (user can adjust)
- AI suggests best places (user can add more)
- Saves progress automatically

---

## 💡 Tips for Beginners

1. **Start with AI Suggestions** - It's faster and gives better results
2. **Don't over-plan** - 5-8 places per day is optimal
3. **Use Today page during trip** - It's designed for on-the-go use
4. **Re-optimize if needed** - If you skip places, re-optimize the route
5. **Find alternatives** - If a place is closed, use the search icon to find nearby alternatives

---

## 🔧 Technical Details (For Developers)

**Data Storage:**
- Trips stored in browser localStorage
- Progress (visited/skipped) stored per-trip in localStorage
- No backend required - fully client-side

**APIs Used:**
- Google Places API (place search, autocomplete, details)
- Google Distance Matrix API (real distance/time)
- Google Gemini AI (analyzing web results)
- Serper API (web scraping for trending places)

**Key Technologies:**
- Next.js 14 (React framework)
- TypeScript (type safety)
- Tailwind CSS (styling)
- shadcn/ui (component library)
- dnd-kit (drag and drop)

---

## 📱 Page Summary

| Page | Purpose | Key Actions |
|------|---------|-------------|
| **Home** | Landing | Create new trip |
| **New Trip** | Setup | Enter destination, dates, hotel, preferences |
| **Dashboard** | Overview | View trip summary, navigate to other pages |
| **Extract** | Add Places | Search manually or get AI suggestions |
| **Days** | Organize | Drag to reorder, add/remove places, create days |
| **Itinerary** | Review | View complete plan on map |
| **Today** | In-Trip | Mark visited, skip, find alternatives, re-optimize |

---

**That's the complete flow!** The app guides users from trip creation → place discovery → organization → in-trip navigation, all with smart AI assistance and automatic organization.

