"use client";

import { ref, serverTimestamp, update } from "firebase/database";
import { useCallback, useEffect, useRef, useState } from "react";
import { GPS_INTERVAL_MS } from "./constants";
import { fb } from "./firebase/client";
import type { LivePoint } from "./types";

// Points wait here until the server confirms them, so nothing is lost with no network
// or if the page is reloaded mid-trip.
const queueKey = (tripId: string) => `ruveco:gps-queue:${tripId}`;
const MAX_QUEUE = 20_000; // about 3.5 days of points
const BATCH = 250;
const FIX_MAX_AGE_MS = 60_000;

function readQueue(tripId: string): LivePoint[] {
  try {
    return JSON.parse(localStorage.getItem(queueKey(tripId)) ?? "[]");
  } catch {
    return [];
  }
}

function writeQueue(tripId: string, points: LivePoint[]) {
  try {
    if (points.length) localStorage.setItem(queueKey(tripId), JSON.stringify(points.slice(-MAX_QUEUE)));
    else localStorage.removeItem(queueKey(tripId));
  } catch {
    // Storage full or blocked: keep going with what we have.
  }
}

function timeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}

export interface TrackerState {
  position: { lat: number; lng: number; acc: number | null } | null;
  lastSentAt: number | null;
  queued: number;
  error: string | null;
}

const IDLE: TrackerState = { position: null, lastSentAt: null, queued: 0, error: null };

/**
 * Shares the driver's location for a trip while `tripId` is set.
 * Sends a point every 15 seconds, keeps unsent points on the phone and sends them in order later,
 * and holds a screen wake lock because browsers stop GPS when the screen locks.
 */
export function useTripTracker(tripId: string | null) {
  const [state, setState] = useState<TrackerState>(IDLE);
  const flushRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!tripId) return;
    if (!("geolocation" in navigator)) {
      queueMicrotask(() => setState({ ...IDLE, error: "This device does not support location." }));
      return;
    }

    let stopped = false;
    let flushing = false;
    let lastFix: GeolocationPosition | null = null;
    let wakeLock: WakeLockSentinel | null = null;
    const trackingRef = ref(fb().rtdb, `tracking/${tripId}`);

    const flush = async () => {
      if (flushing || stopped || !navigator.onLine) return;
      flushing = true;
      try {
        // Oldest first, in batches, so a long offline stretch arrives in order.
        for (;;) {
          const queue = readQueue(tripId);
          if (!queue.length || stopped) break;
          const batch = queue.slice(0, BATCH);
          const newest = batch[batch.length - 1];
          const updates: Record<string, unknown> = {};
          // The device time is the key, so a retried batch overwrites itself instead of duplicating.
          for (const p of batch) updates[`points/${p.t}`] = p;
          if (batch.length === queue.length) updates.latest = { ...newest, r: serverTimestamp() };
          await timeout(update(trackingRef, updates), 12_000);
          const rest = readQueue(tripId).filter((p) => p.t > newest.t);
          writeQueue(tripId, rest);
          setState((s) => ({ ...s, lastSentAt: Date.now(), queued: rest.length, error: null }));
        }
      } catch {
        // Offline or the write was refused; points stay queued for the next tick.
      } finally {
        flushing = false;
      }
    };
    flushRef.current = flush;

    const tick = () => {
      // Skip stale fixes (tunnel, GPS lost) so an old position is never sent as fresh.
      if (lastFix && Date.now() - lastFix.timestamp < FIX_MAX_AGE_MS) {
        const { latitude, longitude, accuracy, speed } = lastFix.coords;
        const point: LivePoint = { lat: latitude, lng: longitude, acc: accuracy ?? null, spd: speed ?? null, t: Date.now() };
        const queue = [...readQueue(tripId), point];
        writeQueue(tripId, queue);
        setState((s) => ({ ...s, queued: queue.length }));
      }
      void flush();
    };

    const watchId = navigator.geolocation.watchPosition(
      (fix) => {
        const first = !lastFix;
        lastFix = fix;
        setState((s) => ({
          ...s,
          error: null,
          position: { lat: fix.coords.latitude, lng: fix.coords.longitude, acc: fix.coords.accuracy ?? null },
        }));
        if (first) tick();
      },
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? "Location permission is off. Turn it on in your browser settings."
            : err.code === err.POSITION_UNAVAILABLE
              ? "Location is turned off on this device. Turn on Location (GPS) in your settings."
              : "Waiting for GPS signal…";
        setState((s) => ({ ...s, error: message }));
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30_000 },
    );
    const interval = setInterval(tick, GPS_INTERVAL_MS);

    const keepAwake = async () => {
      try {
        if (document.visibilityState === "visible") wakeLock = await navigator.wakeLock?.request("screen");
      } catch {
        // Wake lock is best effort (low battery mode can refuse it).
      }
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void keepAwake();
      void flush();
    };
    void keepAwake();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", flush);

    return () => {
      stopped = true;
      navigator.geolocation.clearWatch(watchId);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", flush);
      void wakeLock?.release().catch(() => {});
      flushRef.current = async () => {};
      setState(IDLE);
    };
  }, [tripId]);

  /** Sends anything still queued. Call before ending the trip. */
  const flushNow = useCallback(() => flushRef.current(), []);

  return { ...state, sharing: Boolean(tripId) && !state.error, flushNow };
}

/** Asks for location permission. Resolves false when the driver denies it. */
export function requestLocationPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(false);
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      (err) => resolve(err.code !== err.PERMISSION_DENIED),
      { enableHighAccuracy: true, timeout: 20_000 },
    );
  });
}

export function clearTripQueue(tripId: string) {
  writeQueue(tripId, []);
}
