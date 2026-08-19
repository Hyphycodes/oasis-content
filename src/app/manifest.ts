import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Oasis Admin",
    short_name: "Oasis",
    description: "Events, tickets, content, and door operations.",
    start_url: "/admin",
    display: "standalone",
    background_color: "#f5f0e7",
    theme_color: "#183e35",
    icons: [{ src: "/oasis-mark.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
