# Place Ordering and Optimization System

## Overview

The Pathly platform implements a sophisticated place ordering and optimization system that intelligently arranges places in a travel itinerary based on travel efficiency. The system operates differently depending on whether places are associated with routes or not, ensuring optimal travel paths while maintaining flexibility for user customization.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Route-Based Optimization](#route-based-optimization)
3. [Non-Route Place Ordering](#non-route-place-ordering)
4. [Day Grouping Logic](#day-grouping-logic)
5. [Re-Optimization Feature](#re-optimization-feature)
6. [Technology Stack](#technology-stack)
7. [Algorithms and Mathematical Models](#algorithms-and-mathematical-models)
8. [API Integrations](#api-integrations)
9. [User Flow](#user-flow)
10. [Technical Implementation Details](#technical-implementation-details)

---

## System Architecture

The place ordering system operates at three distinct levels:

1. **Route Level**: Places are ordered based on their position along a defined route
2. **Day Level**: Places are grouped into days based on proximity, route density, and user preferences
3. **Optimization Level**: Manual re-optimization using distance-based algorithms

### Data Flow

```
User Creates Route → Google Directions API → Route Steps Calculated
    ↓
Places Along Route Detected → Distance to Route Calculated → Order Assigned
    ↓
Day Grouping Suggested → Places Distributed Across Days
    ↓
User Can Reorder (Drag & Drop) or Re-optimize (Today Page)
```

---

## Route-Based Optimization

### How It Works

When places are associated with a route, the system uses **route-sequential ordering** to arrange them in the order they appear along the travel path.

### Process Flow

1. **Route Creation**
   - User defines a route with start and end locations
   - Default start: Hotel location
   - End: User-selected destination (e.g., ICONSIAM, Bangkok)

2. **Route Calculation**
   - System calls Google Directions API via `/api/routes/calculate`
   - Receives route polyline, distance, duration, and step-by-step coordinates
   - Each step represents a segment of the route

3. **Place Detection Along Route**
   - System analyzes all confirmed places with coordinates
   - For each place, calculates the closest point on the route
   - Uses **Haversine formula** to find perpendicular distance from place to route segments
   - Only includes places within 5km of the route (configurable threshold)

4. **Order Assignment**
   - Each place is assigned an `order` value based on the route step index where it's closest
   - Places are sorted by this `order` value (ascending)
   - Result: Places appear in the sequence you encounter them while traveling

5. **Detour Cost Calculation**
   - For each place, calculates additional travel time if you detour
   - Formula: `detourCost = (distanceFromRoute / 1000) * 2` minutes
   - Displays as "+X min" or "On route" (if detourCost = 0)

### Code Location

- **Route Calculation**: `app/api/routes/calculate/route.ts`
- **Place Detection**: `lib/routes-api.ts` → `findPlacesAlongRoute()`
- **Distance Calculation**: `lib/routes-api.ts` → `distanceToLineSegment()`

### Example

```
Route: Hotel → ICONSIAM
Places detected:
1. Wat Pho (order: 5, detourCost: 0 min) - On route
2. Grand Palace (order: 6, detourCost: 3 min) - +3 min detour
3. Wat Arun (order: 12, detourCost: 0 min) - On route
4. ICONSIAM (order: 45, detourCost: 0 min) - End destination

Final order: Wat Pho → Grand Palace → Wat Arun → ICONSIAM
```

---

## Non-Route Place Ordering

### How It Works

Places that are not associated with any route are **NOT automatically optimized** for travel efficiency. They are ordered based on:

1. **Array Index**: The order in which they were added/confirmed
2. **Simple Distribution**: Evenly distributed across days based on array position

### Process Flow

1. **Place Collection**
   - System collects all confirmed places without route associations
   - Filters places with valid coordinates

2. **Day Distribution**
   - Calculates target number of days from trip dates
   - Uses user's `placesPerDay` preference (default: 5-8 places)
   - Distributes places sequentially using array slicing:
     ```javascript
     startIdx = Math.floor((totalPlaces / targetDays) * dayIndex)
     endIdx = Math.floor((totalPlaces / targetDays) * (dayIndex + 1))
     ```

3. **No Distance Optimization**
   - Places are NOT sorted by distance
   - No travel efficiency calculation
   - Order is purely based on addition sequence

### Code Location

- **Day Grouping**: `app/trips/[id]/days/page.tsx` → `suggestDayGroupings()`
- Lines 321-336: Non-route place distribution logic

### Limitation

**Current State**: Non-route places are not travel-optimized. This means if you have 10 places in Bangkok without routes, they may be ordered as:
- Day 1: Place A, Place B, Place C (north of city)
- Day 2: Place D, Place E, Place F (south of city)
- Day 3: Place G, Place H, Place I (north again)

This could result in inefficient back-and-forth travel.

---

## Day Grouping Logic

### Smart Day Suggestions

The system automatically suggests day groupings when:
- User has confirmed places
- No days have been created yet
- User navigates to the Days page

### Algorithm

#### Scenario 1: Places with Routes

```javascript
1. Group routes by proximity and place count
2. For each route:
   - If route has < MAX_PLACES_PER_DAY places:
     * Try to combine with nearby routes
     * Limit: MAX_PLACES_PER_DAY total places
   - If route has >= MAX_PLACES_PER_DAY places:
     * Keep route as separate day
3. Assign route places to days in route order
4. Handle unassigned places:
   - Add to last day if space available
   - Create new day if last day is full
```

#### Scenario 2: Places without Routes

```javascript
1. Calculate targetDays from trip dates
2. Distribute places evenly:
   - Day 1: places[0] to places[N/targetDays]
   - Day 2: places[N/targetDays] to places[2N/targetDays]
   - Day 3: places[2N/targetDays] to places[3N/targetDays]
   - etc.
3. Ensure exactly targetDays number of days created
```

### Parameters

- **MAX_PLACES_PER_DAY**: User's `placesPerDay` preference (default: 5-8)
- **targetDays**: Calculated from `startDate` and `endDate` (default: 3 if no dates)

### Code Location

- `app/trips/[id]/days/page.tsx` → `suggestDayGroupings()` (lines 200-348)

---

## Re-Optimization Feature

### Overview

The "Re-optimize" feature is available **only on the Today page** (not the Days page). It uses a **Nearest Neighbor heuristic** to reorder remaining places for optimal travel efficiency.

### Algorithm: Nearest Neighbor

A greedy algorithm that finds the shortest path by always choosing the nearest unvisited place.

#### Steps

1. **Starting Point**
   - Default: Hotel coordinates
   - Fallback: First remaining place's coordinates

2. **Iterative Selection**
   ```javascript
   currentLocation = startCoords
   remaining = [all remaining places]
   optimizedOrder = []
   
   while remaining.length > 0:
     nearest = findNearestPlace(currentLocation, remaining)
     optimizedOrder.push(nearest)
     currentLocation = nearest.coordinates
     remaining.remove(nearest)
   ```

3. **Distance Calculation**
   - Uses Haversine formula for great-circle distance
   - Accounts for Earth's curvature
   - Returns distance in meters

4. **Order Preservation**
   - Completed places remain at the top
   - Only remaining places are reordered
   - Final order: `[completed places] + [optimized remaining places]`

### Limitations

- **Greedy Algorithm**: Doesn't guarantee global optimum (true TSP solution)
- **No Route Consideration**: Doesn't account for actual road networks
- **Today Page Only**: Not available on Days page for planning ahead

### Code Location

- `app/trips/[id]/today/page.tsx` → `handleReoptimize()` (lines 95-177)
- `app/trips/[id]/today/page.tsx` → `calculateDistance()` (lines 179-191)

### Example

```
Starting: Hotel (13.7563°N, 100.5018°E)
Remaining places:
- Place A: 2.5 km away
- Place B: 1.2 km away
- Place C: 3.8 km away

Optimized order:
1. Place B (nearest to hotel)
2. Place A (nearest to Place B)
3. Place C (nearest to Place A)
```

---

## Technology Stack

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: shadcn/ui components
- **Styling**: Tailwind CSS
- **Drag & Drop**: `@dnd-kit/core` and `@dnd-kit/sortable`
- **State Management**: React `useState` and `useEffect`

### Backend

- **API Routes**: Next.js API Routes (`/app/api/*`)
- **Server-Side**: Node.js runtime

### External APIs

- **Google Directions API**: Route calculation
- **Google Places API**: Place validation and geocoding
- **Google Maps JavaScript API**: Map rendering

### Libraries

- **Haversine Formula**: Custom implementation for distance calculations
- **Polyline Encoding**: Google's encoded polyline format for route visualization

---

## Algorithms and Mathematical Models

### 1. Haversine Formula

Calculates great-circle distance between two points on Earth's surface.

**Formula**:
```
a = sin²(Δφ/2) + cos(φ1) × cos(φ2) × sin²(Δλ/2)
c = 2 × atan2(√a, √(1−a))
d = R × c
```

Where:
- `φ` = latitude
- `λ` = longitude
- `R` = Earth's radius (6,371,000 meters)
- `d` = distance in meters

**Implementation**: `lib/routes-api.ts` → `distanceToLineSegment()`

### 2. Point-to-Line-Segment Distance

Finds the shortest distance from a point to a line segment (not infinite line).

**Algorithm**:
1. Calculate distance from point to line start
2. Calculate distance from point to line end
3. Find closest point on line segment using projection
4. Calculate distance from point to closest point

**Implementation**: `lib/routes-api.ts` → `distanceToLineSegment()` (lines 164-233)

### 3. Nearest Neighbor Heuristic

Greedy algorithm for approximate Traveling Salesman Problem (TSP) solution.

**Time Complexity**: O(n²) where n = number of places
**Space Complexity**: O(n)

**Pseudocode**:
```
function nearestNeighbor(start, places):
    current = start
    unvisited = places
    path = []
    
    while unvisited is not empty:
        nearest = findMinimum(unvisited, distance(current, place))
        path.append(nearest)
        current = nearest
        unvisited.remove(nearest)
    
    return path
```

**Implementation**: `app/trips/[id]/today/page.tsx` → `handleReoptimize()` (lines 121-147)

### 4. Route Step Index Assignment

Assigns order to places based on their position along a route.

**Algorithm**:
1. For each route step (segment):
   - Calculate distance from place to step segment
2. Find step with minimum distance
3. Assign step index as place order
4. Sort places by order

**Implementation**: `lib/routes-api.ts` → `findPlacesAlongRoute()` (lines 119-156)

---

## API Integrations

### Google Directions API

**Endpoint**: `https://maps.googleapis.com/maps/api/directions/json`

**Purpose**: Calculate route between two points

**Request Parameters**:
- `origin`: Start coordinates (lat,lng)
- `destination`: End coordinates (lat,lng)
- `key`: API key

**Response**:
- `routes[0].legs[0].distance.value` (meters)
- `routes[0].legs[0].duration.value` (seconds)
- `routes[0].overview_polyline.encoded` (polyline string)
- `routes[0].legs[0].steps[]` (step-by-step coordinates)

**Implementation**: `app/api/routes/calculate/route.ts`

**Usage**:
```typescript
const routeData = await calculateRoute(startCoords, endCoords);
// Returns: { distance, duration, polyline, steps }
```

### Google Places API

**Endpoints Used**:
1. **Geocoding**: Convert place name to coordinates
2. **Place Details**: Get place information
3. **Places Autocomplete**: Search suggestions

**Purpose**: Validate places, get coordinates, infer categories

**Implementation**: `lib/places-api.ts`

---

## User Flow

### Flow 1: Route-Based Ordering

```
1. User navigates to Routes page
2. User creates route: Hotel → Destination
3. System calculates route via Google Directions API
4. System detects places along route
5. Places automatically ordered by route position
6. User can accept/skip places
7. System suggests day groupings
8. Places appear in Days page in route order
```

### Flow 2: Non-Route Ordering

```
1. User adds places manually or via AI
2. Places confirmed (no routes created)
3. User navigates to Days page
4. System suggests day groupings
5. Places distributed evenly (not optimized)
6. User can manually reorder via drag & drop
```

### Flow 3: Re-Optimization

```
1. User navigates to Today page
2. User marks some places as completed
3. User clicks "Re-optimize" button
4. System uses Nearest Neighbor algorithm
5. Remaining places reordered by distance
6. Order updated in trip data
```

---

## Technical Implementation Details

### Data Structures

#### Route Type
```typescript
interface Route {
  id: string;
  start: Coordinates;
  end: Coordinates;
  startLabel?: string;
  endLabel?: string;
  places: RoutePlace[];
  baseDuration: number; // minutes
  polyline?: string; // Encoded polyline
}

interface RoutePlace {
  placeId: string;
  order: number; // Position along route
  detourCost: number; // Additional minutes
}
```

#### Day Type
```typescript
interface Day {
  id: string;
  date?: string;
  routes: string[]; // Route IDs
  places: string[]; // Place IDs (ordered)
  endDestination?: {
    type: 'hotel' | 'place';
    placeId?: string;
    name: string;
    coordinates?: Coordinates;
  };
}
```

### Key Functions

#### `findPlacesAlongRoute()`
**Location**: `lib/routes-api.ts`

**Parameters**:
- `places: Place[]` - Array of places to check
- `routeStart: Coordinates` - Route start point
- `routeEnd: Coordinates` - Route end point
- `routeSteps?: Array<{start, end}>` - Optional pre-calculated steps

**Returns**: `PlaceAlongRoute[]` - Places sorted by route order

**Process**:
1. Filter places with valid coordinates
2. For each place, find closest route step
3. Calculate distance from route
4. Filter places within 5km threshold
5. Assign order based on step index
6. Sort by order

#### `suggestDayGroupings()`
**Location**: `app/trips/[id]/days/page.tsx`

**Parameters**:
- `tripData: Trip` - Current trip data

**Process**:
1. Calculate target days from dates
2. If routes exist:
   - Group routes by proximity
   - Combine small routes
   - Assign places to days
3. If no routes:
   - Distribute places evenly
4. Create Day objects
5. Update trip data

#### `handleReoptimize()`
**Location**: `app/trips/[id]/today/page.tsx`

**Process**:
1. Get remaining places (not completed)
2. Use hotel as starting point
3. Apply Nearest Neighbor algorithm
4. Preserve completed places order
5. Update day's place order
6. Save to storage

### State Management

#### React State
- `trip: Trip | null` - Current trip data
- `selectedDay: string | null` - Currently selected day
- `loading: boolean` - Loading states

#### Local Storage
- Uses `localStorage` via `lib/storage.ts`
- Functions: `getTripById()`, `updateTrip()`
- Persists trip data including place orders

### Performance Considerations

1. **Route Calculation Caching**: Routes are stored in trip data to avoid recalculation
2. **Lazy Loading**: Places along route calculated only when route is created
3. **Debouncing**: Drag & drop operations update storage after user stops dragging
4. **Optimistic Updates**: UI updates immediately, storage syncs asynchronously

### Error Handling

1. **API Failures**: Falls back to mock data or empty arrays
2. **Missing Coordinates**: Places without coordinates are excluded from optimization
3. **Invalid Routes**: Shows error message if Directions API fails
4. **Empty States**: Handles cases with no places or routes gracefully

---

## Future Enhancements

### Potential Improvements

1. **TSP Solver**: Implement true Traveling Salesman Problem solver (2-opt, 3-opt, or Lin-Kernighan)
2. **Multi-Route Optimization**: Optimize across multiple routes simultaneously
3. **Time Windows**: Consider opening hours and time constraints
4. **Traffic-Aware**: Use real-time traffic data for route optimization
5. **Category Grouping**: Group places by category within optimized routes
6. **User Preferences**: Weight optimization by user preferences (e.g., prefer food places in morning)

### Technical Debt

1. **Non-Route Optimization**: Currently non-route places are not optimized - should implement distance-based sorting
2. **Re-optimization Scope**: Should be available on Days page, not just Today page
3. **Algorithm Choice**: Nearest Neighbor is simple but not optimal - consider better heuristics
4. **Caching**: Could cache route calculations to reduce API calls

---

## Summary

The Pathly place ordering system provides intelligent route-based optimization for places associated with routes, while maintaining flexibility for manual organization. The system uses:

- **Route-based ordering**: Sequential ordering along travel paths
- **Day grouping**: Smart distribution based on proximity and capacity
- **Manual reordering**: Drag-and-drop flexibility
- **Re-optimization**: Distance-based optimization for remaining places

The architecture is designed to be extensible, allowing for future enhancements like true TSP solving, traffic-aware routing, and multi-route optimization.

