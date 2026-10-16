"use client";

import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { fb } from "./firebase/client";

/** Current time that ticks, for "Updated 1 min ago" labels. */
export function useNow(intervalMs = 20_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

interface LiveState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
}

/**
 * Live list of documents where `field` equals the signed-in user's ID.
 * A single equality filter needs no composite index; sorting happens in the screen.
 */
export function useLiveQuery<T extends { id: string }>(name: string, field: string, uid: string | undefined) {
  const [state, setState] = useState<LiveState<T>>({ items: [], loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(fb().db, name), where(field, "==", uid));
    return onSnapshot(
      q,
      (snap) => setState({ items: snap.docs.map((d) => ({ ...d.data(), id: d.id }) as T), loading: false, error: null }),
      (err) => setState({ items: [], loading: false, error: err.message }),
    );
  }, [name, field, uid, attempt]);

  const retry = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    setAttempt((a) => a + 1);
  }, []);

  return { ...state, retry };
}
