import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditSpaceForm } from "./edit-space-form";

export default async function EditSpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: space } = await supabase
    .from("spaces")
    .select("id, name, icon, mode, home_id")
    .eq("id", id)
    .single();

  if (!space) notFound();

  const [{ data: homeMembers }, { data: spaceMembers }] = await Promise.all([
    supabase
      .from("home_members")
      .select("profiles(id, name, avatar_url)")
      .eq("home_id", space.home_id),
    supabase.from("space_members").select("user_id").eq("space_id", id),
  ]);

  const members =
    homeMembers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ?.map((hm) => (hm.profiles as any) as { id: string; name: string; avatar_url: string | null })
      .filter(Boolean) ?? [];
  const memberIds = spaceMembers?.map((m) => m.user_id) ?? [];

  return (
    <EditSpaceForm
      space={space}
      members={members}
      initialMemberIds={memberIds}
    />
  );
}
