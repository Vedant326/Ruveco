"use client";

import { get, limitToLast, onValue, orderByKey, query, ref } from "firebase/database";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { fb } from "./firebase/client";
import type { LivePoint, LngLat, TrackDetails, TrackResponse } from "./types";

interface LiveTrip {
  latest: LivePoint | null;
  /** Path driven so far. */
  path: LngLat[];
  /** Planned route from source to destination. */
  route: LngLat[];
}

const EMPTY: LiveTrip = { latest: null, path: [], route: [] };

/**
 * Live position of a trip for its owner or driver, straight from the Realtime Database.
 * The marker moves the moment the driver's phone sends a point.
 */
export function useLiveTrip(tripId: string | undefined, enabled = true): LiveTrip {
  const [state, setState] = useState<{ tripId: string; data: LiveTrip } | null>(null);

  useEffect(() => {
    if (!tripId || !enabled) return;
    const { db, rtdb } = fb();
    let cancelled = false;
    const patch = (fn: (current: LiveTrip) => LiveTrip) =>
      !cancelled && setState((s) => ({ tripId, data: fn(s?.tripId === tripId ? s.data : EMPTY) }));

    getDoc(doc(db, "tripRoutes", tripId))
      .then((snap) => {
        const flat = (snap.get("coords") as number[] | undefined) ?? [];
        const route: LngLat[] = [];
        for (let i = 0; i + 1 < flat.length; i += 2) route.push([flat[i], flat[i + 1]]);
        patch((s) => ({ ...s, route }));
      })
      .catch(() => {});

    get(query(ref(rtdb, `tracking/${tripId}/points`), orderByKey(), limitToLast(3000)))
      .then((snap) => {
        const path: LngLat[] = [];
        snap.forEach((child) => {
          const p = child.val() as LivePoint;
          path.push([p.lng, p.lat]);
        });
        patch((s) => ({ ...s, path }));
      })
      .catch(() => {});

    const stop = onValue(
      ref(rtdb, `tracking/${tripId}/latest`),
      (snap) => {
        const latest = snap.val() as LivePoint | null;
        if (!latest) return;
        patch((s) => {
          const last = s.path[s.path.length - 1];
          const moved = !last || last[0] !== latest.lng || last[1] !== latest.lat;
          return { ...s, latest, path: moved ? [...s.path, [latest.lng, latest.lat]] : s.path };
        });
      },
      () => {},
    );

    return () => {
      cancelled = true;
      stop();
    };
  }, [tripId, enabled]);

  return state && state.tripId === tripId ? state.data : EMPTY;
}

export interface TrackState {
  /** "denied": a private link refused this person (not on the owner's list, or removed from it). */
  phase: "loading" | "ready" | "invalid" | "denied";
  data: TrackResponse | null;
  route: LngLat[];
  path: LngLat[];
  /** Driver, vehicle and goods, from the first request. */
  details: TrackDetails | null;
  /** True when the last refresh failed; the previous data is still shown. */
  offline: boolean;
}

/**
 * Public tracking data for a link token, refreshed on a timer.
 * No login is involved: the server only ever returns status, ETA and map data.
 */
/**
 * [endpoint] and [authToken] are for the private link: its own API, called with the viewer's
 * phone sign-in. The public link uses neither.
 */
export function useTrack(
  token: string | null | undefined,
  intervalMs: number,
  withPath = true,
  { endpoint, authToken }: { endpoint?: string; authToken?: () => Promise<string | null> } = {},
): TrackState {
  const [state, setState] = useState<TrackState>({ phase: "loading", data: null, route: [], path: [], details: null, offline: false });
  const loadedFull = useRef(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    loadedFull.current = false;

    const load = async () => {
      let again = true;
      try {
        const full = withPath && !loadedFull.current;
        const auth = authToken ? await authToken() : null;
        const res = await fetch(`${endpoint ?? `/api/track/${token}`}${full ? "?full=1" : ""}`, {
          cache: "no-store",
          headers: auth ? { Authorization: `Bearer ${auth}` } : undefined,
        });
        if (cancelled) return;
        if (res.status === 404) {
          setState((s) => ({ ...s, phase: "invalid" }));
          return;
        }
        if (res.status === 401 || res.status === 403) {
          setState((s) => ({ ...s, phase: "denied" }));
          return;
        }
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as TrackResponse;
        if (cancelled) return;
        if (full) loadedFull.current = true;
        // A closed trip no longer changes, so stop refreshing.
        again = data.status === "in_progress" || data.status === "scheduled";
        setState((s) => {
          let path = full ? (data.path ?? []) : s.path;
          const last = path[path.length - 1];
          if (data.latest && (!last || last[0] !== data.latest.lng || last[1] !== data.latest.lat)) {
            path = [...path, [data.latest.lng, data.latest.lat]];
          }
          return {
            phase: "ready",
            data,
            route: full ? (data.route ?? []) : s.route,
            path,
            details: full ? (data.details ?? null) : s.details,
            offline: false,
          };
        });
      } catch {
        if (!cancelled) setState((s) => ({ ...s, offline: true }));
      } finally {
        if (!cancelled && again) timer = setTimeout(load, intervalMs);
      }
    };
    void load();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token, intervalMs, withPath, endpoint, authToken]);

  return state;
}
