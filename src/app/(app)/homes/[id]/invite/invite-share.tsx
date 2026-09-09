"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

export function InviteShare({ code, homeName }: { code: string; homeName: string }) {
  const [copied, setCopied] = useState(false);

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${code}`
      : `/join/${code}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard indisponível */
    }
  }

  async function share() {
    const text = `Entre na ${homeName} no Tend: ${joinUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Tend", text, url: joinUrl });
      } catch {
        /* cancelado */
      }
    } else {
      copy();
    }
  }

  return (
    <>
      {/* card do link */}
      <div className="mt-[22px] rounded-[18px] bg-card p-[18px] shadow-[0_2px_8px_-3px_rgba(40,45,40,.08)]">
        <div className="text-xs font-bold uppercase tracking-wide text-[#9aa09b]">Link de convite</div>
        <div className="mt-3 flex items-center gap-2.5">
          <div className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-xl bg-background px-3.5 py-3 text-sm font-semibold text-accent-foreground">
            {joinUrl}
          </div>
          <button
            onClick={copy}
            className="flex h-[46px] shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground active:scale-[0.97] transition-transform"
          >
            {copied ? <Check className="size-4" strokeWidth={2.4} /> : <Copy className="size-4" strokeWidth={2.2} />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>

      {/* código curto */}
      <div className="mt-3.5 rounded-[18px] bg-card p-[18px] text-center shadow-[0_2px_8px_-3px_rgba(40,45,40,.08)]">
        <div className="text-xs font-bold uppercase tracking-wide text-[#9aa09b]">Ou informe o código</div>
        <div className="mt-2 font-mono text-3xl font-extrabold tracking-[0.2em] text-accent-foreground">{code}</div>
      </div>

      {/* compartilhar */}
      <button
        onClick={share}
        className="mt-3.5 flex h-[52px] w-full items-center justify-center gap-2 rounded-[15px] border-[1.5px] border-[#e0ddd5] bg-transparent text-[15px] font-bold text-foreground active:scale-[0.99] transition-transform"
      >
        <Share2 className="size-[18px]" />
        Compartilhar
      </button>
    </>
  );
}
