import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Boletos em PDF são lidos por uma ação do servidor; o limite padrão de 1 MB é pequeno para um PDF.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};

export default nextConfig;
