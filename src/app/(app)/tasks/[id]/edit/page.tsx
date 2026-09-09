import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditTaskForm } from "./edit-task-form";

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: task } = await supabase
    .from("tasks")
    .select("id, space_id, title, recurrence_type, recurrence_days, recurrence_interval_days, assignment_type, assignee_id, points, spaces(mode, home_id)")
    .eq("id", id)
    .single();

  if (!task) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const space = (task.spaces as any) as { mode: string; home_id: string };

  const [{ data: spaceMembers }, { data: rotation }] = await Promise.all([
    supabase.from("space_members").select("profiles(id, name, avatar_url)").eq("space_id", task.space_id),
    supabase.from("task_rotation_queue").select("user_id, position").eq("task_id", id).order("position"),
  ]);

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
    <EditTaskForm
      taskId={task.id}
      spaceId={task.space_id}
      gamified={space.mode === "gamified"}
      members={members}
      initial={{
        title: task.title,
        recurrenceType: task.recurrence_type as "daily" | "weekly" | "custom",
        recurrenceDays: task.recurrence_days ?? [],
        recurrenceIntervalDays: task.recurrence_interval_days ?? 7,
        assignmentType: task.assignment_type as "fixed" | "rotation",
        assigneeId: task.assignee_id,
        rotationOrder: rotation?.map((r) => r.user_id) ?? [],
        points: task.points,
      }}
    />
  );
}
