import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default es 1MB — muy poco para fotos/videos de referencia de piezas
      // de contenido (bucket piezas-media).
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
