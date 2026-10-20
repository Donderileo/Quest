import type { NextConfig } from "next";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("./package.json", "utf8")) as { version: string };

const nextConfig: NextConfig = {
  // Versão do app (package.json) + commit + data do build; lidos só no servidor (src/lib/version.ts).
  // Na Vercel o commit vem de VERCEL_GIT_COMMIT_SHA; local fica "dev".
  env: {
    APP_VERSION: version,
    APP_COMMIT: (process.env.VERCEL_GIT_COMMIT_SHA ?? "dev").slice(0, 7),
    APP_BUILD_DATE: new Date().toISOString(),
  },
  experimental: {
    // Navegar entre abas (Dashboard/Tarefas/Perfil) reaproveita a página por 20 s em vez de
    // refazer tudo no servidor. Mutações (server actions) e o realtime invalidam o cache.
    staleTimes: { dynamic: 20 },
  },
};

export default nextConfig;
