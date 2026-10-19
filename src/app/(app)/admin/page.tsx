import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAccess, type AccessStatus } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { setAccessStatus } from "./actions";

type Row = { id: string; email: string; name: string; status: AccessStatus; isAdmin: boolean; requestedAt: string };

const SECTIONS: { status: AccessStatus; title: string; empty: string }[] = [
  { status: "pending", title: "Aguardando liberação", empty: "Ninguém na fila." },
  { status: "approved", title: "Aprovados", empty: "Nenhum usuário aprovado." },
  { status: "blocked", title: "Bloqueados", empty: "Nenhum bloqueio." },
];

export default async function AdminPage() {
  const supabase = await createClient();
  const access = await getAccess(supabase);
  // 404 (e não 403) para não revelar que a rota existe
  if (access?.status !== "approved" || !access.isAdmin) notFound();

  const service = createServiceClient();
  const [{ data: rows }, { data: profiles }, emails] = await Promise.all([
    service.from("user_access").select("user_id, status, is_admin, requested_at"),
    service.from("profiles").select("id, name"),
    (async () => {
      const map = new Map<string, string>();
      for (let page = 1; page <= 10; page++) {
        const { data } = await service.auth.admin.listUsers({ page, perPage: 200 });
        for (const u of data?.users ?? []) map.set(u.id, u.email ?? "");
        if ((data?.users.length ?? 0) < 200) break;
      }
      return map;
    })(),
  ]);

  const names = new Map((profiles ?? []).map((p) => [p.id, p.name]));
  const all: Row[] = (rows ?? [])
    .map((r) => ({
      id: r.user_id,
      email: emails.get(r.user_id) ?? "—",
      name: names.get(r.user_id) ?? "—",
      status: r.status as AccessStatus,
      isAdmin: r.is_admin,
      requestedAt: r.requested_at,
    }))
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

  return (
    <div className="space-y-8 px-5 py-8">
      <div>
        <h1 className="text-2xl font-extrabold">Acessos</h1>
        <p className="text-sm text-muted-foreground">Quem pode usar o Tend.</p>
      </div>

      {SECTIONS.map(({ status, title, empty }) => {
        const list = all.filter((r) => r.status === status);
        return (
          <section key={status} className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wide text-subtle">
              {title} · {list.length}
            </h2>
            {list.length === 0 ? (
              <p className="rounded-[15px] border border-dashed border-strong py-6 text-center text-sm text-muted-foreground">
                {empty}
              </p>
            ) : (
              list.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-[15px] bg-card p-3.5 shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">
                      {r.name}
                      {r.isAdmin && (
                        <span className="ml-2 rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-bold text-accent-foreground">
                          admin
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                    <p className="text-xs text-subtle">
                      Cadastro em {format(parseISO(r.requestedAt), "d MMM, HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {!r.isAdmin && (
                    <form action={setAccessStatus} className="flex shrink-0 gap-2">
                      <input type="hidden" name="userId" value={r.id} />
                      {status !== "approved" && (
                        <Button type="submit" name="status" value="approved" size="sm">
                          Aprovar
                        </Button>
                      )}
                      {status !== "blocked" && (
                        <Button type="submit" name="status" value="blocked" size="sm" variant="outline">
                          Bloquear
                        </Button>
                      )}
                    </form>
                  )}
                </div>
              ))
            )}
          </section>
        );
      })}
    </div>
  );
}
