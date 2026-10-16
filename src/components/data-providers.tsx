"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLiveQuery } from "@/lib/hooks";
import { useTripTracker } from "@/lib/tracker";
import type { Trip, Vehicle } from "@/lib/types";
import { useAuth } from "./auth-provider";

interface ListState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

const OwnerContext = createContext<{ trips: ListState<Trip>; vehicles: ListState<Vehicle> } | null>(null);

/** One live subscription to the owner's trips and vehicles, shared by every owner screen. */
export function OwnerDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const trips = useLiveQuery<Trip>("trips", "ownerId", user?.uid);
  const vehicles = useLiveQuery<Vehicle>("vehicles", "ownerId", user?.uid);

  const value = useMemo(
    () => ({
      trips: { ...trips, items: [...trips.items].sort((a, b) => b.pickupAt - a.pickupAt) },
      vehicles: { ...vehicles, items: [...vehicles.items].sort((a, b) => b.createdAt - a.createdAt) },
    }),
    [trips, vehicles],
  );
  return <OwnerContext.Provider value={value}>{children}</OwnerContext.Provider>;
}

export function useOwnerData() {
  const value = useContext(OwnerContext);
  if (!value) throw new Error("useOwnerData must be used inside OwnerDataProvider");
  return value;
}

type Tracker = ReturnType<typeof useTripTracker>;
const DriverContext = createContext<{ trips: ListState<Trip>; activeTrip: Trip | null; tracker: Tracker } | null>(null);

/**
 * The driver's assigned trips, plus the GPS tracker. The tracker lives here, above the pages,
 * so location keeps being shared while the driver moves between screens.
 */
export function DriverDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const trips = useLiveQuery<Trip>("trips", "driverId", user?.uid);
  const activeTrip = useMemo(() => trips.items.find((t) => t.status === "in_progress") ?? null, [trips.items]);
  const tracker = useTripTracker(activeTrip?.id ?? null);

  const value = useMemo(
    () => ({
      trips: { ...trips, items: [...trips.items].sort((a, b) => a.pickupAt - b.pickupAt) },
      activeTrip,
      tracker,
    }),
    [trips, activeTrip, tracker],
  );
  return <DriverContext.Provider value={value}>{children}</DriverContext.Provider>;
}

export function useDriverData() {
  const value = useContext(DriverContext);
  if (!value) throw new Error("useDriverData must be used inside DriverDataProvider");
  return value;
}
