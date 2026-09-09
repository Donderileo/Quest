import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewTaskForm } from "./new-task-form";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ spaceId?: string }>;
}) {
  const { spaceId } = await searchParams;
  if (!spaceId) redirect("/homes");

  const supabase = await createClient();

  const [{ data: space }, { data: spaceMembers }] = await Promise.all([
    supabase.from("spaces").select("id, name, mode, home_id").eq("id", spaceId).single(),
    supabase
      .from("space_members")
      .select("profiles(id, name, avatar_url)")
      .eq("space_id", spaceId),
  ]);

  if (!space) notFound();

  // fallback: se o ambiente não tem membros cadastrados, usa os membros da casa
  let members =
    spaceMembers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ?.map((sm) => (sm.profiles as any) as { id: string; name: string; avatar_url: string | null })
      .filter(Boolean) ?? [];

  if (members.length === 0) {
    const { data: homeMembers } = await supabase
      .from("home_members")
      .select("profiles(id, name, avatar_url)")
      .eq("home_id", space.home_id);
    members =
      homeMembers
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ?.map((hm) => (hm.profiles as any) as { id: string; name: string; avatar_url: string | null })
        .filter(Boolean) ?? [];
  }

  return (
    <NewTaskForm
      spaceId={space.id}
      gamified={space.mode === "gamified"}
      members={members}
    />
  );
}
