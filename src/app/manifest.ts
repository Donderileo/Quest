import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tend — tarefas da casa",
    short_name: "Tend",
    description: "Organize as tarefas da casa em conjunto, por ambiente, com rodízio e pontos.",
    start_url: "/homes",
    display: "standalone",
    background_color: "#f5f4f0",
    theme_color: "#4a7c59",
    lang: "pt-BR",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
