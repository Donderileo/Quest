"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "./toast";
import {
  completeOccurrence,
  uncompleteOccurrence,
} from "@/app/(app)/spaces/[id]/actions";

/**
 * Check de tarefa: responde no toque (otimista), e toda conclusão é reversível
 * (tocar de novo ou "Desfazer" no aviso) — forgiveness em vez de confirmação.
 */
export function CheckButton({
  occurrenceId,
  done,
  disabled,
  title,
}: {
  occurrenceId: string | null;
  done: boolean;
  disabled?: boolean;
  title: string;
}) {
  const [optimisticDone, setOptimisticDone] = useOptimistic(done);
  const [, startTransition] = useTransition();
  const toast = useToast();

  function toggle(next: boolean) {
    if (!occurrenceId) return;
    startTransition(async () => {
      setOptimisticDone(next);
      await (next ? completeOccurrence : uncompleteOccurrence)(occurrenceId);
    });
  }

  function onClick() {
    const next = !optimisticDone;
    toggle(next);
    if (next) {
      toast({ message: `“${title}” concluída`, onAction: () => toggle(false) });
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !occurrenceId}
      aria-pressed={optimisticDone}
      aria-label={optimisticDone ? `Desfazer: ${title}` : `Concluir: ${title}`}
      className={cn(
        "press relative flex size-[25px] shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 after:absolute after:-inset-2.5 after:content-['']",
        optimisticDone
          ? "pop border-primary bg-primary text-white"
          : "border-strong disabled:opacity-50",
      )}
    >
      {optimisticDone && <Check className="size-3.5" strokeWidth={3} />}
    </button>
  );
}
