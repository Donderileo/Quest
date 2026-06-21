"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createSpace } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";

const ICONS = [
  { value: "kitchen", emoji: "🍳", label: "Cozinha" },
  { value: "bathroom", emoji: "🚿", label: "Banheiro" },
  { value: "living", emoji: "🛋️", label: "Sala" },
  { value: "bedroom", emoji: "🛏️", label: "Quarto" },
  { value: "garden", emoji: "🌿", label: "Quintal" },
  { value: "garage", emoji: "🚗", label: "Garagem" },
];

export default function NewSpacePage() {
  const { id: homeId } = useParams<{ id: string }>();
  const [state, action, pending] = useActionState(createSpace, null);

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/homes/${homeId}`} className="text-muted-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold">Novo ambiente</h1>
      </div>

      <form action={action} className="space-y-6">
        <input type="hidden" name="homeId" value={homeId} />

        <FormField label="Nome do ambiente">
          <Input name="name" placeholder="ex: Cozinha" autoFocus required />
        </FormField>

        <FormField label="Ícone">
          <div className="grid grid-cols-3 gap-2">
            {ICONS.map(({ value, emoji, label }) => (
              <label
                key={value}
                className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 text-center has-[:checked]:border-primary has-[:checked]:bg-accent"
              >
                <input
                  type="radio"
                  name="icon"
                  value={value}
                  className="sr-only"
                  defaultChecked={value === "kitchen"}
                />
                <span className="text-2xl">{emoji}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </label>
            ))}
          </div>
        </FormField>

        <FormField label="Modo">
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "simple", label: "Simples", desc: "Só marcar feito" },
              { value: "gamified", label: "★ Pontos", desc: "Ganhe pontos por tarefa" },
            ].map(({ value, label, desc }) => (
              <label
                key={value}
                className="flex cursor-pointer flex-col gap-0.5 rounded-xl border border-border bg-card p-3 has-[:checked]:border-primary has-[:checked]:bg-accent"
              >
                <input
                  type="radio"
                  name="mode"
                  value={value}
                  className="sr-only"
                  defaultChecked={value === "simple"}
                />
                <span className="font-semibold text-sm">{label}</span>
                <span className="text-xs text-muted-foreground">{desc}</span>
              </label>
            ))}
          </div>
        </FormField>

        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? "Criando…" : "Criar ambiente"}
        </Button>
      </form>
    </div>
  );
}
