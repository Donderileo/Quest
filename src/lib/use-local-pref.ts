import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};

/**
 * Preferência por aparelho (localStorage), sem divergir do HTML do servidor: no servidor e na
 * hidratação vale `fallback`; depois o valor salvo. Só para conveniências (visão preferida etc.).
 */
export function useLocalPref<T extends string>(key: string, fallback: T, allowed: readonly T[]) {
  const read = useCallback((): T => {
    try {
      const v = localStorage.getItem(key) as T | null;
      return v && allowed.includes(v) ? v : fallback;
    } catch {
      return fallback;
    }
  }, [key, fallback, allowed]);

  const value = useSyncExternalStore(subscribe, read, () => fallback);

  const set = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(key, next);
      } catch {}
      listeners.forEach((l) => l());
    },
    [key],
  );

  return [value, set] as const;
}
