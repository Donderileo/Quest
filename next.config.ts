import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Navegar entre abas (Dashboard/Tarefas/Perfil) reaproveita a página por 20 s em vez de
    // refazer tudo no servidor. Mutações (server actions) e o realtime invalidam o cache.
    staleTimes: { dynamic: 20 },
  },
};

export default nextConfig;
