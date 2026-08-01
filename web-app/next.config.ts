import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default es 1MB — muy poco para fotos/videos reales. 50mb ya se
      // quedaba corto para creativos de video de Meta Ads (Biblioteca de
      // Ads, 2026-07-25) — al superarse, Next corta el stream a mitad de
      // camino y el parser interno tira "Unexpected end of form" en vez de
      // un error claro de "archivo muy grande".
      bodySizeLimit: "200mb",
    },
  },
};

export default nextConfig;
