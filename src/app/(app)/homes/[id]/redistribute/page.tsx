import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { RedistributeForm } from "./redistribute-form";

export default async function RedistributePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [{ data: home }, { data: members }, { data: spaces }, { data: tasks }, { data: spaceMembers }] =
    await Promise.all([
      supabase.from("homes").select("id, name").eq("id", id).maybeSingle(),
      supabase.from("home_members").select("user_id, profiles(id, name, avatar_url)").eq("home_id", id),
      supabase.from("spaces").select("id, name, icon").eq("home_id", id).order("created_at"),
      supabase
        .from("tasks")
        .select("id, space_id, assignment_type, assignee_id, spaces!inner(home_id)")
        .eq("spaces.home_id", id)
        .is("archived_at", null),
      supabase.from("space_members").select("space_id, user_id, spaces!inner(home_id)").eq("spaces.home_id", id),
    ]);
  if (!home) notFound();

  const rotationIds = (tasks ?? []).filter((t) => t.assignment_type === "rotation").map((t) => t.id);
  const { data: queue } = rotationIds.length
    ? await supabase.from("task_rotation_queue").select("task_id, user_id").in("task_id", rotationIds)
    : { data: [] as { task_id: string; user_id: string }[] };

  const people = (members ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((m) => (m.profiles as any) as { id: string; name: string; avatar_url: string | null } | null)
    .filter((p): p is { id: string; name: string; avatar_url: string | null } => !!p);

  return (
    <RedistributeForm
      homeId={home.id}
      meId={user?.id ?? ""}
      people={people}
      spaces={spaces ?? []}
      tasks={(tasks ?? []).map((t) => ({
        id: t.id,
        spaceId: t.space_id,
        type: t.assignment_type as "fixed" | "rotation",
        assigneeId: t.assignee_id,
      }))}
      queue={queue ?? []}
      spaceMembers={(spaceMembers ?? []).map((m) => ({ spaceId: m.space_id, userId: m.user_id }))}
    />
  );
}
