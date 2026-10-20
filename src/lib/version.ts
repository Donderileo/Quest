/** Versão em execução. Valores gravados no build por next.config.ts (só usados no servidor). */
export function getAppVersion() {
  return {
    version: process.env.APP_VERSION ?? "0.0.0",
    commit: process.env.APP_COMMIT ?? "dev",
    builtAt: process.env.APP_BUILD_DATE ?? null,
  };
}
