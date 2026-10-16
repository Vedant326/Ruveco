// MapLibre draws the map in a web worker that it loads from its own URL. Bundlers do not
// serve that file, so it is copied into /public after every install and TripMap points to it.
import { copyFile, mkdir } from "node:fs/promises";

const from = new URL("../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url);
const to = new URL("../public/maplibre-gl-worker.mjs", import.meta.url);

await mkdir(new URL("../public/", import.meta.url), { recursive: true });
await copyFile(from, to);
console.log("Copied the MapLibre worker to public/maplibre-gl-worker.mjs");
