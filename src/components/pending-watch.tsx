"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Enquanto aguarda aprovação, reconsulta o servidor; ao aprovar, a página redireciona sozinha. */
export function PendingWatch() {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 8000);
    return () => clearInterval(id);
  }, [router]);
  return null;
}
