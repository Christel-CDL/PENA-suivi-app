import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image de production minimale : ne copie que les fichiers réellement
  // nécessaires à l'exécution (voir Dockerfile).
  output: "standalone",
};

export default nextConfig;
