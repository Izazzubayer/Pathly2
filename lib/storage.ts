import { Trip } from "@/types";

const STORAGE_KEY = "pathly_trips";

export function saveTrip(trip: Trip): void {
  const trips = getAllTrips();
  trips.push(trip);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
}

export function getAllTrips(): Trip[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function getTripById(id: string): Trip | null {
  const trips = getAllTrips();
  return trips.find((trip) => trip.id === id) || null;
}

export function updateTrip(id: string, updates: Partial<Trip>): void {
  const trips = getAllTrips();
  const index = trips.findIndex((trip) => trip.id === id);
  if (index !== -1) {
    trips[index] = { ...trips[index], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  }
}

export function deleteTrip(id: string): void {
  const trips = getAllTrips();
  const filtered = trips.filter((trip) => trip.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

