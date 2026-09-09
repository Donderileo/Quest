"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { updateSpace, deleteSpace } from "../actions";

const ICONS = [
  { value: "kitchen", emoji: "🍳", label: "Cozinha" },
  { value: "bathroom", emoji: "🚿", label: "Banheiro" },
  { value: "living", emoji: "🛋️", label: "Sala" },
  { value: "bedroom", emoji: "🛏️", label: "Quarto" },
  { value: "garden", emoji: "🌿", label: "Quintal" },
  { value: "garage", emoji: "🚗", label: "Garagem" },
];

type Member = { id: string; name: string; avatar_url: string | null };
type Space = { id: string; name: string; icon: string | null; mode: string; home_id: string };

export function EditSpaceForm({
  space,
  members,
  initialMemberIds,
}: {
  space: Space;
  members: Member[];
  initialMemberIds: string[];
}) {
  const [state, action, pending] = useActionState(updateSpace, null);
  const [icon, setIcon] = useState(space.icon ?? "kitchen");
  const [mode, setMode] = useState<"simple" | "gamified">(space.mode === "gamified" ? "gamified" : "simple");
  const [selected, setSelected] = useState<Set<string>>(new Set(initialMemberIds));
  const [deleting, startDelete] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDelete() {
    if (!confirm("Excluir este ambiente e todas as suas tarefas?")) return;
    startDelete(() => {
      void deleteSpace(space.id, space.home_id);
    });
  }

  return (
    <form action={action} className="flex min-h-full flex-col">
      <div className="flex items-center justify-between px-[22px] py-3">
        <Link href={`/spaces/${space.id}`} className="text-[15px] font-semibold text-muted-foreground">
          Cancelar
        </Link>
        <span className="text-[17px] font-extrabold tracking-tight">Editar ambiente</span>
        <button type="submit" disabled={pending} className="text-[15px] font-bold text-primary disabled:text-[#c2c6c0]">
          {pending ? "..." : "Salvar"}
        </button>
      </div>

      <div className="space-y-5 px-[22px] pb-8 pt-1">
        <input type="hidden" name="spaceId" value={space.id} />
        <input type="hidden" name="icon" value={icon} />
        <input type="hidden" name="mode" value={mode} />
        {[...selected].map((id) => (
          <input key={id} type="hidden" name="memberIds" value={id} />
        ))}

        {/* nome */}
        <div>
          <div className="mb-2.5 text-xs font-bold uppercase tracking-wide text-[#9aa09b]">Nome</div>
          <input
            name="name"
            defaultValue={space.name}
            required
            className="w-full rounded-[15px] bg-card p-4 text-[17px] font-bold text-foreground shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)] outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* ícone */}
        <div>
          <div className="mb-2.5 text-xs font-bold uppercase tracking-wide text-[#9aa09b]">Ícone</div>
          <div className="grid grid-cols-3 gap-2">
            {ICONS.map(({ value, emoji, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setIcon(value)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl bg-card p-3 shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)] transition-colors",
                  icon === value && "ring-2 ring-primary",
                )}
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-xs font-semibold text-muted-foreground">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* modo */}
        <div>
          <div className="mb-2.5 text-xs font-bold uppercase tracking-wide text-[#9aa09b]">Modo</div>
          <div className="flex gap-1 rounded-xl bg-[#f1efe9] p-1">
            {([
              { value: "simple", label: "Simples" },
              { value: "gamified", label: "★ Pontos" },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={cn(
                  "flex-1 rounded-[9px] py-2.5 text-[13.5px] font-semibold transition-colors",
                  mode === value ? "bg-primary text-white" : "text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* membros */}
        <div>
          <div className="mb-2.5 text-xs font-bold uppercase tracking-wide text-[#9aa09b]">
            Quem participa deste ambiente
          </div>
          <div className="flex flex-col gap-2">
            {members.map((m) => {
              const on = selected.has(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-[13px] p-2.5 transition-colors shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]",
                    on ? "bg-accent" : "bg-card",
                  )}
                >
                  <Avatar name={m.name} src={m.avatar_url} size="md" className="size-8 text-xs" />
                  <span className="flex-1 text-left text-[15px] font-bold">{m.name}</span>
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border-2",
                      on ? "border-primary bg-primary text-white" : "border-[#cdd1cb]",
                    )}
                  >
                    {on && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {state?.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}

        {/* excluir */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[15px] border-[1.5px] border-destructive/30 text-[15px] font-bold text-destructive disabled:opacity-50"
        >
          <Trash2 className="size-[18px]" />
          {deleting ? "Excluindo…" : "Excluir ambiente"}
        </button>
      </div>
    </form>
  );
}
