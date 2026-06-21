"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function completeOccurrence(occurrenceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("task_occurrences")
    .update({ status: "done", completed_at: new Date().toISOString(), completed_by: user.id })
    .eq("id", occurrenceId);

  revalidatePath("/spaces/[id]", "page");
}
