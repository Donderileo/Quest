import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadBalanceData } from "@/lib/balance-load";
import { todayISO } from "@/lib/tz";
import { BalanceForm } from "./balance-form";

export default async function BalancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: home } = await supabase.from("homes").select("id").eq("id", id).maybeSingle();
  if (!home) notFound();

  const data = await loadBalanceData(supabase, id, todayISO());
  return <BalanceForm homeId={id} data={data} />;
}
