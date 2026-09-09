"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Assina mudanças nas tabelas indicadas e re-renderiza a página (server
 * components) quando algo muda. O RLS garante que cada usuário só recebe
 * eventos das linhas que pode ver (as casas das quais participa).
 */
export function RealtimeRefresh({
  tables = ["task_occurrences", "space_member_points", "tasks"],
}: {
  tables?: string[];
}) {
  const router = useRouter();
  const key = tables.join(",");

  useEffect(() => {
    const supabase = createClient();
    const list = key.split(",");
    const channel = supabase.channel(`rt:${key}`);

    for (const table of list) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        router.refresh();
      });
    }

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, key]);

  return null;
}
