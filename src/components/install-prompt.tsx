"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

export function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).standalone === true;
    const dismissed = localStorage.getItem("tend:install-dismissed") === "1";

    // detecção client-only: ok atualizar estado aqui
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isIOS && !standalone && !dismissed) setShow(true);
  }, []);

  if (!show) return null;

  function dismiss() {
    localStorage.setItem("tend:install-dismissed", "1");
    setShow(false);
  }

  return (
    <div className="fixed inset-x-3 bottom-[84px] z-50 flex items-start gap-3 rounded-2xl bg-card p-3.5 shadow-[0_12px_30px_-8px_rgba(40,45,40,.28)] ring-1 ring-black/5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Share className="size-4" />
      </div>
      <p className="flex-1 text-[13px] font-medium leading-snug text-foreground">
        Instale o Tend: toque em <b>Compartilhar</b> e depois em{" "}
        <b>&quot;Adicionar à Tela de Início&quot;</b>.
      </p>
      <button onClick={dismiss} aria-label="Dispensar" className="shrink-0 text-muted-foreground">
        <X className="size-4" />
      </button>
    </div>
  );
}
