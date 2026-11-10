"use client";

import { TaskForm, type Member } from "@/components/task-form";
import { createTask } from "./actions";

export function NewTaskForm({
  spaceId,
  gamified,
  members,
  once,
  defaultAssigneeId,
}: {
  spaceId: string;
  gamified: boolean;
  members: Member[];
  once?: boolean;
  defaultAssigneeId?: string | null;
}) {
  return (
    <TaskForm
      spaceId={spaceId}
      gamified={gamified}
      members={members}
      action={createTask}
      initial={{
        title: "",
        recurrenceType: once ? "once" : "daily",
        recurrenceDays: [],
        recurrenceIntervalDays: 7,
        assignmentType: "fixed",
        assigneeId: defaultAssigneeId ?? null,
        rotationOrder: [],
        points: gamified ? 10 : 0,
      }}
    />
  );
}
