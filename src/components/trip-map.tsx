"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, Map as MlMap, Marker } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/format";
import type { LngLat } from "@/lib/types";

// Free vector tiles from OpenFreeMap (OpenStreetMap data). No key, no usage limit.
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const INDIA: LngLat = [79, 22.5];

const TRUCK_SVG =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>';

interface Point {
  lat: number;
  lng: number;
}

type MapLib = typeof import("maplibre-gl");

function line(coords: LngLat[]): GeoJSON.Feature<GeoJSON.LineString> {
  return { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } };
}

function pinElement(className: string, html: string) {
  const el = document.createElement("div");
  el.className = className;
  el.innerHTML = html;
  return el;
}

/**
 * Trip map: source (A) and destination (B) pins, the planned route (dashed),
 * the path driven so far (solid) and the live vehicle marker.
 */
export function TripMap({
  source,
  destination,
  vehicle,
  route,
  path,
  className,
}: {
  source?: Point | null;
  destination?: Point | null;
  vehicle?: Point | null;
  route?: LngLat[];
  path?: LngLat[];
  /** Must position and size the map, for example "absolute inset-0" inside a sized parent. */
  className: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const lib = useRef<MapLib | null>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef<{ source?: Marker; destination?: Marker; vehicle?: Marker }>({});
  const fitKey = useRef("");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let instance: MlMap | undefined;
    import("maplibre-gl")
      .then((ml) => {
        if (cancelled || !container.current) return;
        // Copied into /public by scripts/copy-map-worker.mjs (runs on npm install).
        ml.setWorkerUrl("/maplibre-gl-worker.mjs");
        instance = new ml.Map({
          container: container.current,
          style: STYLE_URL,
          center: INDIA,
          zoom: 3.6,
          attributionControl: { compact: true },
        });
        instance.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
        // "style.load" fires before the first tiles are drawn, so pins and the route
        // appear right away instead of waiting for the whole map to render.
        instance.once("style.load", () => {
          if (cancelled || !instance) return;
          instance.addSource("route", { type: "geojson", data: line([]) });
          instance.addSource("path", { type: "geojson", data: line([]) });
          instance.addLayer({
            id: "route",
            type: "line",
            source: "route",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#9a72f5", "line-width": 4, "line-opacity": 0.7, "line-dasharray": [0.4, 1.8] },
          });
          instance.addLayer({
            id: "path",
            type: "line",
            source: "path",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#4f0bb8", "line-width": 5 },
          });
          lib.current = ml;
          map.current = instance;
          setReady(true);
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      map.current = null;
      markers.current = {};
      instance?.remove();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    (map.current?.getSource("route") as GeoJSONSource | undefined)?.setData(line(route ?? []));
  }, [ready, route]);

  useEffect(() => {
    if (!ready) return;
    (map.current?.getSource("path") as GeoJSONSource | undefined)?.setData(line(path ?? []));
  }, [ready, path]);

  const sLat = source?.lat;
  const sLng = source?.lng;
  const dLat = destination?.lat;
  const dLng = destination?.lng;
  const vLat = vehicle?.lat;
  const vLng = vehicle?.lng;

  useEffect(() => {
    const ml = lib.current;
    const m = map.current;
    if (!ready || !ml || !m) return;

    const place = (key: "source" | "destination" | "vehicle", lng: number | undefined, lat: number | undefined, el: () => HTMLElement) => {
      const existing = markers.current[key];
      if (lng === undefined || lat === undefined) {
        existing?.remove();
        delete markers.current[key];
        return;
      }
      if (existing) existing.setLngLat([lng, lat]);
      else markers.current[key] = new ml.Marker({ element: el() }).setLngLat([lng, lat]).addTo(m);
    };
    place("source", sLng, sLat, () => pinElement("rv-pin rv-pin-source", "A"));
    place("destination", dLng, dLat, () => pinElement("rv-pin rv-pin-destination", "B"));
    place("vehicle", vLng, vLat, () => pinElement("rv-truck-wrap", `<span class="rv-truck-ring"></span><span class="rv-truck">${TRUCK_SVG}</span>`));

    // Frame everything when the set of things on the map changes, not on every GPS point,
    // so the map never fights the person panning it.
    const key = [sLng !== undefined, dLng !== undefined, vLng !== undefined].join();
    const points = [
      [sLng, sLat],
      [dLng, dLat],
      [vLng, vLat],
    ].filter((p): p is LngLat => p[0] !== undefined && p[1] !== undefined);
    if (key !== fitKey.current && points.length) {
      fitKey.current = key;
      if (points.length === 1) {
        m.easeTo({ center: points[0], zoom: 13, duration: 600 });
      } else {
        const bounds = points.reduce((b, p) => b.extend(p), new ml.LngLatBounds(points[0], points[0]));
        m.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 600 });
      }
    } else if (vLng !== undefined && vLat !== undefined && !m.getBounds().contains([vLng, vLat])) {
      m.easeTo({ center: [vLng, vLat], duration: 800 });
    }
  }, [ready, sLat, sLng, dLat, dLng, vLat, vLng]);

  return (
    <div className={cx("overflow-hidden bg-brand-50", className)}>
      {/* MapLibre's stylesheet forces `position: relative` on this element, so it is sized
          with height and width. Absolute insets would collapse it to zero height. */}
      <div ref={container} className="h-full w-full" />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-sm font-medium text-muted">
          {failed ? "Map could not be loaded" : <span className="skeleton absolute inset-0" />}
        </div>
      )}
    </div>
  );
}
