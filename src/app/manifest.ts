import type { MetadataRoute } from "next";

// Lets drivers and owners add Ruveco to the phone's home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ruveco",
    short_name: "Ruveco",
    description: "Live trip tracking for transport",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8ff",
    theme_color: "#4f0bb8",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
