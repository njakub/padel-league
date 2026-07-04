import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Padel League Tracker",
    short_name: "Padel League",
    description: "Organise padel leagues, rounds, and fair match schedules.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#18a7e0",
    icons: [
      {
        src: "/padel-logo.png",
        sizes: "768x768",
        type: "image/png",
      },
      {
        src: "/padel-logo.png",
        sizes: "768x768",
        type: "image/png",
      },
      {
        src: "/padel-logo.png",
        sizes: "768x768",
        type: "image/png",
      },
    ],
  };
}
