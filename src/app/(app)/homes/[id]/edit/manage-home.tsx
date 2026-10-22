"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRightLeft, LogOut, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteHome, leaveHome, regenerateInviteCode, renameHome } from "../../actions";

type Role = "owner" | "admin" | "member";

const label = "mb-2.5 text-xs font-bold uppercase tracking-wide text-subtle";
const card = "rounded-[15px] bg-card p-4 shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]";

export function ManageHome({
  home,
  role,
}: {
  home: { id: string; name: string; invite_code: string };
  role: Role;
}) {
  const canManage = role === "owner" || role === "admin";
  const [renameState, rename, renaming] = useActionState(renameHome, null);
  const [code, setCode] = useState(home.invite_code);
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [danger, setDanger] = useState<string | null>(null);
  const [busy, start] = useTransition();

  function newCode() {
    if (!confirm("Gerar um novo código? O código atual deixa de funcionar para novos convites.")) return;
    start(async () => {
      const res = await regenerateInviteCode(home.id);
      if ("code" in res && res.code) {
        setCode(res.code);
        setCodeMsg("Novo código gerado.");
      } else setCodeMsg(res.error ?? "Não foi possível gerar.");
    });
  }

  function leave() {
    if (!confirm("Sair desta casa? Você sai dos ambientes e das tarefas dela.")) return;
    start(async () => {
      const res = await leaveHome(home.id);
      if (res?.error) setDanger(res.error);
    });
  }

  function remove() {
    start(async () => {
      const res = await deleteHome(home.id, confirmName);
      if (res?.error) setDanger(res.error);
    });
  }

  return (
    <div className="space-y-6 px-[22px] py-4">
      <div className="flex items-center gap-3">
        <Link
          href={`/homes/${home.id}`}
          aria-label="Voltar"
          className="flex size-10 items-center justify-center rounded-xl bg-card shadow-[0_2px_6px_-2px_rgba(0,0,0,.12)]"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-extrabold">Gerenciar casa</h1>
      </div>

      {/* nome */}
      <form action={rename} className="space-y-2.5">
        <input type="hidden" name="homeId" value={home.id} />
        <div className={label}>Nome</div>
        <Input name="name" defaultValue={home.name} required disabled={!canManage} />
        {!canManage && (
          <p className="text-xs text-muted-foreground">Só o dono ou admin da casa pode renomear.</p>
        )}
        {canManage && (
          <Button type="submit" disabled={renaming} className="w-full">
            {renaming ? "Salvando…" : "Salvar nome"}
          </Button>
        )}
        {renameState && "error" in renameState && renameState.error && (
          <p className="text-sm font-medium text-destructive">{renameState.error}</p>
        )}
        {renameState && "ok" in renameState && renameState.ok && (
          <p className="text-sm font-medium text-primary">{renameState.ok}</p>
        )}
      </form>

      {/* convite */}
      <div>
        <div className={label}>Código de convite</div>
        <div className={`${card} flex items-center justify-between gap-3`}>
          <span className="font-mono text-xl font-extrabold tracking-[0.2em] text-primary">{code}</span>
          {canManage && (
            <button
              type="button"
              onClick={newCode}
              disabled={busy}
              className="press flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-[13px] font-bold disabled:opacity-50"
            >
              <RefreshCw className="size-4" /> Gerar novo
            </button>
          )}
        </div>
        {codeMsg && <p className="mt-2 text-sm font-medium text-muted-foreground">{codeMsg}</p>}
      </div>

      {/* redistribuir */}
      <Link
        href={`/homes/${home.id}/redistribute`}
        className="press flex items-center gap-3 rounded-[15px] bg-card p-4 shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]"
      >
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <ArrowRightLeft className="size-5" />
        </span>
        <span className="flex-1">
          <span className="block font-bold">Redistribuir tarefas</span>
          <span className="block text-xs text-muted-foreground">Passe tarefas de uma pessoa para outra</span>
        </span>
      </Link>

      {/* sair / excluir */}
      <div className="space-y-3 pt-2">
        <div className={label}>Zona de perigo</div>
        {role !== "owner" && (
          <button
            type="button"
            onClick={leave}
            disabled={busy}
            className="press flex h-[50px] w-full items-center justify-center gap-2 rounded-[15px] border-[1.5px] border-destructive/30 text-[15px] font-bold text-destructive disabled:opacity-50"
          >
            <LogOut className="size-[18px]" /> Sair da casa
          </button>
        )}
        {role === "owner" && (
          <div className={`${card} space-y-3`}>
            <p className="text-sm text-muted-foreground">
              Excluir apaga a casa, os ambientes, as tarefas e o histórico para todos. Digite{" "}
              <strong className="text-foreground">{home.name}</strong> para confirmar.
            </p>
            <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder={home.name} />
            <button
              type="button"
              onClick={remove}
              disabled={busy || confirmName.trim() !== home.name.trim()}
              className="press flex h-[50px] w-full items-center justify-center gap-2 rounded-[15px] bg-destructive text-[15px] font-bold text-white disabled:opacity-40"
            >
              <Trash2 className="size-[18px]" /> Excluir casa
            </button>
          </div>
        )}
        {danger && <p className="text-sm font-medium text-destructive">{danger}</p>}
      </div>
    </div>
  );
}
