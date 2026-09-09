import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { InviteShare } from "./invite-share";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: home } = await supabase
    .from("homes")
    .select("id, name, invite_code")
    .eq("id", id)
    .single();

  if (!home) notFound();

  return (
    <div className="px-[22px] py-4">
      <Link
        href={`/homes/${id}`}
        className="flex size-10 items-center justify-center rounded-xl bg-card shadow-[0_2px_6px_-2px_rgba(0,0,0,.12)]"
        aria-label="Voltar"
      >
        <ChevronRight className="size-5 rotate-180" />
      </Link>

      <h1 className="mt-4 text-[26px] font-extrabold tracking-tight">Convide para sua casa</h1>
      <p className="mt-1.5 text-[15px] font-medium leading-snug text-[#6c726d]">
        Compartilhe este código para adicionar pessoas à{" "}
        <b className="font-bold text-foreground">{home.name}</b>. Depois que entrarem, você as adiciona aos ambientes.
      </p>

      <InviteShare code={home.invite_code} homeName={home.name} />
    </div>
  );
}
